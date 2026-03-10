/**
 * AI Chat — Module-aware conversational AI
 * POST /api/ai/chat — Chat with any module's AI
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { getSystemPrompt, type ModuleType } from "@/lib/prompts";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, module = "cross_module", context } = body;

    if (!message) {
      return badRequest("message is required");
    }

    const validModules: ModuleType[] = ["sentinel", "youthshield", "blight", "compass", "cross_module", "executive"];
    if (!validModules.includes(module)) {
      return badRequest(`module must be one of: ${validModules.join(", ")}`);
    }

    // Gather relevant data context based on module
    let dataContext = "";

    if (module === "sentinel") {
      const stats = await prisma.incident.count();
      const zones = await prisma.forceMultiplierZone.findMany({ orderBy: { score: "desc" }, take: 5 });
      dataContext = `Current data: ${stats} incidents, ${zones.length} force multiplier zones scored. Top zones: ${JSON.stringify(zones.slice(0, 3))}`;
    } else if (module === "youthshield") {
      const [schools, centers, risks] = await Promise.all([
        prisma.school.count(),
        prisma.communityCenter.count(),
        prisma.youthRiskZone.findMany({ orderBy: { riskScore: "desc" }, take: 3 }),
      ]);
      dataContext = `Current data: ${schools} schools, ${centers} community centers. Top risk zones: ${JSON.stringify(risks)}`;
    } else if (module === "blight") {
      const [nuisances, violations, scores] = await Promise.all([
        prisma.nuisance.count(),
        prisma.codeViolation.count(),
        prisma.blightScore.findMany({ orderBy: { score: "desc" }, take: 3 }),
      ]);
      dataContext = `Current data: ${nuisances} nuisances, ${violations} violations. Top blight scores: ${JSON.stringify(scores)}`;
    } else if (module === "compass") {
      const permits = await prisma.constructionPermit.count();
      const businesses = await prisma.businessLicense.count();
      dataContext = `Current data: ${permits} construction permits, ${businesses} business licenses. Major projects: Meta $1.5B, AWS, Google, Inland Port, Convention Center`;
    } else {
      // Cross-module — gather from all
      const [incidents, nuisances, permits, alerts] = await Promise.all([
        prisma.incident.count(),
        prisma.nuisance.count(),
        prisma.constructionPermit.count(),
        prisma.crossModuleAlert.findMany({ take: 3, orderBy: { createdAt: "desc" } }),
      ]);
      dataContext = `Cross-module data: ${incidents} incidents, ${nuisances} nuisances, ${permits} permits. Recent alerts: ${JSON.stringify(alerts.map((a) => a.title))}`;
    }

    const baseSystemPrompt = getSystemPrompt(module as ModuleType);

    // Determine response style based on question complexity
    const wordCount = message.trim().split(/\s+/).length;
    const isComplex = wordCount > 30 || message.includes("analyze") || message.includes("strategy") || message.includes("compare") || message.includes("explain in detail") || message.includes("report") || message.includes("briefing");
    const isSimple = (wordCount <= 8 && !message.includes("?")) || (wordCount <= 12 && !!message.match(/^(what is|how many|show|list|status|count|total|give me|tell me)\b/i));

    let responseStyle: string;
    if (isSimple) {
      responseStyle = `\n\nRESPONSE RULES: The user asked a short/simple question. Reply in 1-3 concise sentences. No bullet points, no headers, no lengthy explanations. Be direct and to the point. If a number answers the question, lead with the number.`;
    } else if (isComplex) {
      responseStyle = `\n\nRESPONSE RULES: The user asked a complex/analytical question. Provide a structured, detailed response with headers and bullet points where appropriate. Keep it thorough but focused — no filler.`;
    } else {
      responseStyle = `\n\nRESPONSE RULES: Match your response length to the question's complexity. For straightforward questions, use 2-4 sentences. For moderate questions, use a short paragraph with optional bullet points. Never pad with unnecessary context or caveats. Be direct and actionable.`;
    }

    const systemPrompt = baseSystemPrompt + responseStyle;
    const fullPrompt = `${message}\n\n${context ? `User context: ${context}\n` : ""}Live data: ${dataContext}`;

    const { text, model: usedModel } = isComplex
      ? await AI.strategize(fullPrompt, systemPrompt)
      : await AI.analyze(fullPrompt, systemPrompt);

    // Save chat
    await prisma.aiAnalysis.create({
      data: {
        module: module === "cross_module" ? "cross_module" : module,
        analysisType: "chat",
        prompt: message,
        response: text,
        model: usedModel,
      },
    });

    return ok({ response: text, module, model: usedModel });
  } catch (e) {
    console.error("AI chat error:", e);
    return serverError("Failed to process chat message");
  }
}
