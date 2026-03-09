/**
 * S1 — Dynamic Force Multiplier Zone Map
 * GET /api/sentinel/force-multiplier — Returns zones with prevention multiplier scores
 * POST /api/sentinel/force-multiplier — AI-generate new force multiplier analysis
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = searchParams.get("district") || undefined;
    const shift = searchParams.get("shift") || undefined;

    const where: Record<string, unknown> = {};
    if (district) where.district = district;
    if (shift) where.shift = shift;

    const [zones, total] = await Promise.all([
      prisma.forceMultiplierZone.findMany({
        where,
        skip,
        take: limit,
        orderBy: { score: "desc" },
      }),
      prisma.forceMultiplierZone.count({ where }),
    ]);

    return ok(zones, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Force multiplier error:", e);
    return serverError("Failed to fetch force multiplier zones");
  }
}

export async function POST() {
  try {
    // Get incident data for AI analysis
    const incidents = await prisma.incident.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      take: 2000,
      orderBy: { id: "desc" },
    });

    // Group by H3 index
    const h3Groups: Record<string, number> = {};
    const h3Districts: Record<string, string> = {};
    const h3Shifts: Record<string, string> = {};

    for (const inc of incidents) {
      if (inc.h3Index) {
        h3Groups[inc.h3Index] = (h3Groups[inc.h3Index] || 0) + 1;
        if (inc.district) h3Districts[inc.h3Index] = inc.district;
        if (inc.shift) h3Shifts[inc.h3Index] = inc.shift;
      }
    }

    // Get nuisance data for environmental criminology
    const nuisances = await prisma.nuisance.findMany({
      where: { h3Index: { not: null } },
    });
    const nuisanceByH3: Record<string, number> = {};
    for (const n of nuisances) {
      if (n.h3Index) nuisanceByH3[n.h3Index] = (nuisanceByH3[n.h3Index] || 0) + 1;
    }

    // Use AI to score and analyze zones
    const topZones = Object.entries(h3Groups)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50);

    const zoneData = topZones.map(([h3, count]) => ({
      h3Index: h3,
      incidents: count,
      nuisances: nuisanceByH3[h3] || 0,
      district: h3Districts[h3] || "unknown",
      shift: h3Shifts[h3] || "unknown",
    }));

    const { data: aiScores } = await AI.json<Array<{
      h3Index: string;
      score: number;
      riskLevel: string;
    }>>(
      `Analyze these Montgomery, AL zones and assign force multiplier scores (0-100, where 100 = officer presence delivers maximum deterrent value). Consider incident density and nuisance clustering (environmental criminology).

Zone data: ${JSON.stringify(zoneData)}

Return JSON array with: h3Index, score (0-100), riskLevel ("critical"|"high"|"medium"|"low")`,
      SYSTEM_PROMPTS.SENTINEL
    );

    // Save to database
    const upserts = aiScores.map((z) => {
      const zd = zoneData.find((d) => d.h3Index === z.h3Index);
      return prisma.forceMultiplierZone.create({
        data: {
          h3Index: z.h3Index,
          score: z.score,
          incidentCount: zd?.incidents || 0,
          district: zd?.district,
          shift: zd?.shift,
          riskLevel: z.riskLevel,
        },
      });
    });

    const results = await prisma.$transaction(upserts);
    return ok({ zones: results.length, message: "Force multiplier zones recalculated" });
  } catch (e) {
    console.error("Force multiplier calculation error:", e);
    return serverError("Failed to calculate force multiplier zones");
  }
}
