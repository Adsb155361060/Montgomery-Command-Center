/**
 * S5/S7/S8 — Sentinel AI Analysis (business robbery prediction, news analysis, social intel)
 * POST /api/sentinel/analyze — General AI analysis for sentinel module
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisType, query, district } = body;

    if (!analysisType || !query) {
      return badRequest("analysisType and query are required");
    }

    // Gather contextual data based on analysis type
    let contextData: unknown = {};

    if (analysisType === "business_robbery") {
      const businesses = await prisma.businessLicense.findMany({ take: 100 });
      const incidents = await prisma.incident.findMany({
        where: { incidentType: { contains: "robbery", mode: "insensitive" } },
        take: 200,
      });
      contextData = { businesses: businesses.length, recentRobberies: incidents.length, sampleIncidents: incidents.slice(0, 10) };
    } else if (analysisType === "district_analysis") {
      const incidents = await prisma.incident.findMany({
        where: district ? { district } : {},
        take: 500,
      });
      const nuisances = await prisma.nuisance.findMany({
        where: district ? { district } : {},
      });
      contextData = { incidents: incidents.length, nuisances: nuisances.length, district };
    } else if (analysisType === "patrol_optimization") {
      const zones = await prisma.forceMultiplierZone.findMany({ orderBy: { score: "desc" }, take: 20 });
      const stations = await prisma.policeStation.findMany();
      contextData = { zones, stations };
    }

    // Select model based on analysis complexity
    const model = analysisType === "business_robbery" ? MODELS.FLASH_3 : MODELS.FLASH_25;

    const { text, model: usedModel } = await AI.analyze(
      `${query}\n\nContext data: ${JSON.stringify(contextData)}`,
      SYSTEM_PROMPTS.SENTINEL
    );

    // Save analysis
    const saved = await prisma.aiAnalysis.create({
      data: {
        module: "sentinel",
        analysisType,
        prompt: query,
        response: text,
        model: usedModel,
        district,
      },
    });

    return ok({ analysis: text, model: usedModel, id: saved.id });
  } catch (e) {
    console.error("Sentinel analyze error:", e);
    return serverError("Failed to perform analysis");
  }
}
