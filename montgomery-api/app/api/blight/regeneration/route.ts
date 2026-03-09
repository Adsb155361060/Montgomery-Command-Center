/**
 * B2 — Regeneration Blueprint Generator
 * POST /api/blight/regeneration — Generate reuse recommendations for parcels
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parcelNo, district, count = 5 } = body;

    // Get parcels to analyze
    let properties;
    if (parcelNo) {
      properties = await prisma.cityOwnedProperty.findMany({
        where: { parcelNum: parcelNo },
      });
    } else {
      properties = await prisma.cityOwnedProperty.findMany({
        where: district ? { neighborhood: { contains: district, mode: "insensitive" } } : {},
        take: count,
      });
    }

    if (properties.length === 0) {
      return badRequest("No properties found matching criteria");
    }

    // Get surrounding context
    const blightScores = await prisma.blightScore.findMany({ take: 50, orderBy: { score: "desc" } });
    const schools = await prisma.school.findMany();
    const centers = await prisma.communityCenter.findMany();

    const { data: blueprints } = await AI.json<Array<{
      parcelNum: string;
      address: string;
      acreage: number;
      zoning: string;
      recommendations: Array<{
        reuse: string;
        viabilityPct: number;
        estimatedCost: string;
        timeframe: string;
        justification: string;
      }>;
      nearbyContext: string;
      catalyticPotential: string;
    }>>(
      `Generate regeneration blueprints for these Montgomery, AL city-owned properties:

Properties: ${JSON.stringify(properties.map((p) => ({
        parcelNum: p.parcelNum,
        address: p.propAddress,
        acres: p.calcAcre,
        zoning: p.zoning,
        use: p.useType,
        maintBy: p.maintBy,
        notes: p.notes,
        neighborhood: p.neighborhood,
      })))}

Context:
- Top blight areas: ${JSON.stringify(blightScores.slice(0, 10))}
- Nearby schools: ${schools.length}
- Community centers: ${centers.length}

For each property, recommend 3 reuse options with viability %, estimated cost, timeframe, and justification.
Options include: affordable housing infill, community garden, commercial space, pocket park, mixed-use, urban farm, youth recreation.
Use k-nearest-neighbors logic — what worked for similar parcels in Montgomery.

Return JSON array with parcelNum, address, acreage, zoning, recommendations array, nearbyContext, catalyticPotential.`,
      SYSTEM_PROMPTS.BLIGHT
    );

    await prisma.aiAnalysis.create({
      data: {
        module: "blight",
        analysisType: "regeneration_blueprint",
        prompt: `${properties.length} properties, district: ${district || "all"}`,
        response: JSON.stringify(blueprints),
        model: "gemini-2.5-flash",
        district,
      },
    });

    return ok(blueprints);
  } catch (e) {
    console.error("Regeneration blueprint error:", e);
    return serverError("Failed to generate regeneration blueprints");
  }
}
