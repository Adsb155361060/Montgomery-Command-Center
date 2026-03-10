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

    // Detect if this is a location/resource question from a citizen
    const lowerMsg = message.toLowerCase();
    const isLocationQuery = /\b(nearest|near|nearby|closest|close to|where is|find me|looking for|around|neighborhood|safe|safety|rating)\b/i.test(lowerMsg)
      || /\b(library|libraries|park|parks|school|schools|community center|center|daycare|daycares|shop|store|gym|playground|pool|swimming|basketball|soccer|baseball)\b/i.test(lowerMsg);

    // Gather relevant data context based on module
    let dataContext = "";

    // Helper: fetch all resources + safety data for citizen queries
    async function getResourceContext() {
      const [schools, centers, parks, libraries, daycares, riskZones, fmZones, blightScores, incidentsByDistrict] = await Promise.all([
        prisma.school.findMany({ select: { id: true, name: true, address: true, level: true, enrollment: true, latitude: true, longitude: true } }),
        prisma.communityCenter.findMany({ select: { id: true, name: true, address: true, operDays: true, operHours: true, facilityType: true, playground: true, basketball: true, swimming: true, latitude: true, longitude: true } }),
        prisma.park.findMany({ select: { id: true, name: true, address: true, type: true, operDays: true, operHours: true, playground: true, basketball: true, soccer: true, baseball: true, tennis: true, hiking: true, fishing: true, swimming: true, latitude: true, longitude: true } }),
        prisma.library.findMany({ select: { id: true, branchName: true, address: true, latitude: true, longitude: true } }),
        prisma.dayCare.findMany({ select: { id: true, name: true, address: true, city: true, latitude: true, longitude: true } }),
        prisma.youthRiskZone.findMany({ select: { h3Index: true, riskScore: true, district: true, riskLevel: true, gapScore: true, programCount: true } }),
        prisma.forceMultiplierZone.findMany({ select: { h3Index: true, score: true, incidentCount: true, district: true, riskLevel: true } }),
        prisma.blightScore.findMany({ select: { address: true, score: true, district: true, riskLevel: true, nuisanceCount: true, violationCount: true }, orderBy: { score: "desc" }, take: 50 }),
        prisma.incident.groupBy({ by: ["district"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      ]);

      const districtSafety = incidentsByDistrict.map((d: any) => `District ${d.district}: ${d._count.id} incidents`).join(", ");
      const fmSummary = fmZones.slice(0, 10).map((z: any) => `${z.h3Index} (district ${z.district}): score=${z.score}, incidents=${z.incidentCount}, risk=${z.riskLevel}`).join("; ");
      const blightSummary = blightScores.slice(0, 10).map((b: any) => `${b.address} (district ${b.district}): blight=${b.score}, nuisances=${b.nuisanceCount}, violations=${b.violationCount}`).join("; ");
      const riskSummary = riskZones.slice(0, 10).map((r: any) => `${r.h3Index} (district ${r.district}): youthRisk=${r.riskScore}, gap=${r.gapScore}, programs=${r.programCount}`).join("; ");

      return `
MONTGOMERY RESOURCE DATABASE:
Schools (${schools.length} total): ${JSON.stringify(schools.slice(0, 30))}
Community Centers (${centers.length} total): ${JSON.stringify(centers.slice(0, 30))}
Parks (${parks.length} total): ${JSON.stringify(parks.slice(0, 30))}
Libraries (${libraries.length} total): ${JSON.stringify(libraries)}
Daycares (${daycares.length} total): ${JSON.stringify(daycares.slice(0, 30))}

SAFETY DATA BY DISTRICT: ${districtSafety}
TOP FORCE-MULTIPLIER (HIGH-CRIME) ZONES: ${fmSummary}
TOP BLIGHT AREAS: ${blightSummary}
YOUTH RISK ZONES: ${riskSummary}

Use this data to answer questions about nearby resources. Rate safety/quality/youth-friendliness based on the district and zone data above. Districts with fewer incidents = safer. Areas with lower blight scores = better neighborhood quality. Areas with lower youth risk scores and more programs = more youth-friendly.`;
    }

    if (module === "sentinel") {
      const stats = await prisma.incident.count();
      const zones = await prisma.forceMultiplierZone.findMany({ orderBy: { score: "desc" }, take: 5 });
      dataContext = `Current data: ${stats} incidents, ${zones.length} force multiplier zones scored. Top zones: ${JSON.stringify(zones.slice(0, 3))}`;
      if (isLocationQuery) dataContext += await getResourceContext();
    } else if (module === "youthshield") {
      const [schools, centers, risks] = await Promise.all([
        prisma.school.count(),
        prisma.communityCenter.count(),
        prisma.youthRiskZone.findMany({ orderBy: { riskScore: "desc" }, take: 3 }),
      ]);
      dataContext = `Current data: ${schools} schools, ${centers} community centers. Top risk zones: ${JSON.stringify(risks)}`;
      if (isLocationQuery) dataContext += await getResourceContext();
    } else if (module === "blight") {
      const [nuisances, violations, scores] = await Promise.all([
        prisma.nuisance.count(),
        prisma.codeViolation.count(),
        prisma.blightScore.findMany({ orderBy: { score: "desc" }, take: 3 }),
      ]);
      dataContext = `Current data: ${nuisances} nuisances, ${violations} violations. Top blight scores: ${JSON.stringify(scores)}`;
      if (isLocationQuery) dataContext += await getResourceContext();
    } else if (module === "compass") {
      const permits = await prisma.constructionPermit.count();
      const businesses = await prisma.businessLicense.count();
      dataContext = `Current data: ${permits} construction permits, ${businesses} business licenses. Major projects: Meta $1.5B, AWS, Google, Inland Port, Convention Center`;
      if (isLocationQuery) dataContext += await getResourceContext();
    } else {
      // Cross-module — always include resource data for citizen-friendly answers
      const [incidents, nuisances, permits, alerts] = await Promise.all([
        prisma.incident.count(),
        prisma.nuisance.count(),
        prisma.constructionPermit.count(),
        prisma.crossModuleAlert.findMany({ take: 3, orderBy: { createdAt: "desc" } }),
      ]);
      dataContext = `Cross-module data: ${incidents} incidents, ${nuisances} nuisances, ${permits} permits. Recent alerts: ${JSON.stringify(alerts.map((a) => a.title))}`;
      dataContext += await getResourceContext();
    }

    const baseSystemPrompt = getSystemPrompt(module as ModuleType);

    // Detect conversational messages (greetings, thanks, chitchat) — but NOT location queries
    const trimmed = message.trim();
    const isConversational = !isLocationQuery && /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|thanks|thank\s*you|bye|goodbye|sup|yo|what'?s\s*up|how\s*are\s*you|how'?s\s*it\s*going|nice|cool|ok|okay|great|awesome|got\s*it)\b/i.test(trimmed) && trimmed.split(/\s+/).length <= 10;

    // Determine response style based on question complexity
    const wordCount = trimmed.split(/\s+/).length;
    const isComplex = !isConversational && (wordCount > 30 || message.includes("analyze") || message.includes("strategy") || message.includes("compare") || message.includes("explain in detail") || message.includes("report") || message.includes("briefing"));
    const isSimple = !isConversational && !isLocationQuery && ((wordCount <= 8 && !message.includes("?")) || (wordCount <= 12 && !!message.match(/^(what is|how many|show|list|status|count|total|give me|tell me)\b/i)));

    let responseStyle: string;
    if (isLocationQuery) {
      responseStyle = `\n\nRESPONSE RULES: The user is asking about places, resources, or locations in Montgomery. Search the provided resource data to find the best matches. List 3-5 results with name, address, and hours. For EACH result provide star ratings:
🛡️ Safety Rating (1-5 ⭐) — based on district incident count and force multiplier zones. Fewer incidents = more stars.
🏙️ Neighborhood Quality (1-5 ⭐) — based on blight scores and nuisance counts. Lower blight = more stars.
👶 Youth-Friendliness (1-5 ⭐) — based on youth risk zones and program counts. Lower risk + more programs = more stars.
Be warm and helpful like a knowledgeable local guide. Use the actual data provided — do not make up ratings. If the user mentions a specific area/district, prioritize results from that area.`;
    } else if (isConversational) {
      responseStyle = `\n\nRESPONSE RULES: The user sent a casual/conversational message (like a greeting or thanks). Respond naturally and warmly in 1-2 short sentences, like a friendly assistant. Do NOT produce any reports, analysis, data, bullet points, or recommendations. Just be friendly. If they said hello, greet them back and let them know you can help with questions about Montgomery.`;
    } else if (isSimple) {
      responseStyle = `\n\nRESPONSE RULES: The user asked a short/simple question. Reply in 1-3 concise sentences. No bullet points, no headers, no lengthy explanations. Be direct and to the point. If a number answers the question, lead with the number.`;
    } else if (isComplex) {
      responseStyle = `\n\nRESPONSE RULES: The user asked a complex/analytical question. Provide a structured, detailed response with headers and bullet points where appropriate. Keep it thorough but focused — no filler.`;
    } else {
      responseStyle = `\n\nRESPONSE RULES: Match your response length to the question's complexity. For straightforward questions, use 2-4 sentences. For moderate questions, use a short paragraph with optional bullet points. Never pad with unnecessary context or caveats. Be direct and actionable.`;
    }

    const systemPrompt = baseSystemPrompt + responseStyle;
    // Don't inject data context for conversational messages — it causes the AI to generate reports
    const fullPrompt = isConversational
      ? message
      : `${message}\n\n${context ? `User context: ${context}\n` : ""}Live data: ${dataContext}`;

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
