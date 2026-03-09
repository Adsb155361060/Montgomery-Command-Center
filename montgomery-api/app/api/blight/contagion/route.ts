/**
 * B5 — Neighborhood Blight Contagion Tracker
 * POST /api/blight/contagion — Model how blight spreads & how remediation creates spillover
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parcelNo, district } = body;

    const scores = await prisma.blightScore.findMany({
      where: district ? { district } : {},
      orderBy: { score: "desc" },
      take: 30,
    });

    const nuisances = await prisma.nuisance.findMany({
      where: district ? { district } : {},
      take: 200,
    });

    const { data: contagion } = await AI.json<{
      contagionZones: Array<{
        parcel: string;
        address: string;
        contagionScore: number;
        affectedNeighbors: number;
        spreadRisk: string;
        remediationImpact: string;
        priority: number;
      }>;
      hotspots: Array<{
        area: string;
        blightDensity: number;
        spreadDirection: string;
        interventionUrgency: string;
      }>;
      positiveSpillover: Array<{
        area: string;
        remediatedParcels: number;
        neighborhoodImprovement: string;
      }>;
      recommendations: string[];
    }>(
      `Model blight contagion patterns for Montgomery, AL ${district ? `District ${district}` : "citywide"}.

Blight scores: ${JSON.stringify(scores)}
Nuisance patterns: ${nuisances.length} complaints${parcelNo ? `, focus parcel: ${parcelNo}` : ""}

Model:
1. How blight SPREADS to adjacent parcels (surrounded by blight = accelerates, by maintained = slows)
2. How REMEDIATION creates positive spillover (projecting reduced complaints within 500m)
3. Contagion score per zone (1-10) — how quickly blight spreads from that location
4. Prioritize parcels where remediation has maximum cascade effect

Return: contagionZones, hotspots, positiveSpillover examples, recommendations.`,
      SYSTEM_PROMPTS.BLIGHT
    );

    return ok(contagion);
  } catch (e) {
    console.error("Contagion analysis error:", e);
    return serverError("Failed to model blight contagion");
  }
}
