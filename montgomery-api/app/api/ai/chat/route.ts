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

    const systemPrompt = getSystemPrompt(module as ModuleType);
    const fullPrompt = `${message}\n\n${context ? `User context: ${context}\n` : ""}Live data: ${dataContext}`;

    // Select model based on complexity
    const isComplex = message.length > 200 || message.includes("analyze") || message.includes("strategy");
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
