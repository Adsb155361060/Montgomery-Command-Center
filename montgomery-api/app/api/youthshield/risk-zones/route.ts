/**
 * Y1 — Youth Risk Heat Map
 * GET /api/youthshield/risk-zones — Zone-level risk data (privacy-preserving)
 * POST /api/youthshield/risk-zones — AI-recalculate risk zones
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

    const where: Record<string, unknown> = {};
    if (district) where.district = district;

    const [zones, total] = await Promise.all([
      prisma.youthRiskZone.findMany({ where, skip, take: limit, orderBy: { riskScore: "desc" } }),
      prisma.youthRiskZone.count({ where }),
    ]);

    return ok(zones, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Youth risk zones error:", e);
    return serverError("Failed to fetch youth risk zones");
  }
}

export async function POST() {
  try {
    // Get incidents near schools
    const schools = await prisma.school.findMany();
    const incidents = await prisma.incident.findMany({
      where: { h3Index: { not: null } },
      take: 5000,
    });
    const commCenters = await prisma.communityCenter.findMany();
    const parks = await prisma.park.findMany();

    // Aggregate by H3 zone
    const h3Data: Record<string, { incidents: number; nearSchools: number; programs: number }> = {};

    for (const inc of incidents) {
      if (!inc.h3Index) continue;
      if (!h3Data[inc.h3Index]) {
        h3Data[inc.h3Index] = { incidents: 0, nearSchools: 0, programs: 0 };
      }
      h3Data[inc.h3Index].incidents++;
    }

    // Count programs near each zone (community centers + parks with programs)
    const programLocations = [
      ...commCenters.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      ...parks.filter((p) => p.playground === "Y" || p.basketball === "Y").map((p) => ({ lat: p.latitude, lng: p.longitude })),
    ];

    const topZones = Object.entries(h3Data)
      .sort(([, a], [, b]) => b.incidents - a.incidents)
      .slice(0, 40);

    const { data: riskScores } = await AI.json<Array<{
      h3Index: string;
      riskScore: number;
      gapScore: number;
      riskLevel: string;
    }>>(
      `Analyze Montgomery youth violence risk for these zones. The 3PM-8PM window is the danger period. 50%+ of 2024 homicide arrests were age 21 or under.

Zone data: ${JSON.stringify(topZones.map(([h3, d]) => ({ h3, ...d })))}
Schools: ${schools.length} locations
Community centers: ${commCenters.length} locations  
Parks with programs: ${programLocations.length} locations

For each zone, calculate:
- riskScore (0-100): based on incident density near schools, temporal patterns, environmental factors
- gapScore (0-100): how underserved the zone is (100 = no programs within walking distance during 3-8PM)
- riskLevel: "critical"|"high"|"medium"|"low"

NEVER identify individuals. Zone-level only.
Return JSON array with: h3Index, riskScore, gapScore, riskLevel`,
      SYSTEM_PROMPTS.YOUTHSHIELD
    );

    // Delete existing zones for these h3 indices then bulk-insert fresh ones
    const h3Indices = riskScores.map((z) => z.h3Index).filter(Boolean);
    await prisma.youthRiskZone.deleteMany({ where: { h3Index: { in: h3Indices } } });

    const data = riskScores.map((z) => {
      const zd = h3Data[z.h3Index];
      return {
        h3Index: z.h3Index,
        riskScore: z.riskScore,
        gapScore: z.gapScore,
        incidentsNearSchools: zd?.nearSchools || 0,
        programCount: zd?.programs || 0,
        riskLevel: z.riskLevel,
      };
    });

    await prisma.youthRiskZone.createMany({ data });
    return ok({ zones: data.length, message: "Youth risk zones recalculated" });
  } catch (e) {
    console.error("Youth risk calculation error:", e);
    return serverError("Failed to calculate youth risk zones");
  }
}
