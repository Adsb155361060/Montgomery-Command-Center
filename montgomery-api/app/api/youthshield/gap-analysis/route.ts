/**
 * Y3 — After-School Gap Analyzer
 * GET /api/youthshield/gap-analysis — Identify blocks with zero programming during 3-8PM
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") || undefined;

    // Get all youth-serving facilities
    const [schools, centers, parks, libraries, daycares] = await Promise.all([
      prisma.school.findMany(),
      prisma.communityCenter.findMany(),
      prisma.park.findMany(),
      prisma.library.findMany(),
      prisma.dayCare.findMany(),
    ]);

    // Get risk zones to correlate
    const riskZones = await prisma.youthRiskZone.findMany({
      where: district ? { district } : {},
      orderBy: { gapScore: "desc" },
      take: 30,
    });

    // Use AI to generate gap analysis
    const { data: analysis } = await AI.json<{
      gapZones: Array<{
        zone: string;
        district: string;
        gapHours: string;
        nearestCenter: string;
        nearestCenterDistance: string;
        nearestCenterCloses: string;
        recommendation: string;
      }>;
      summary: {
        totalGapZones: number;
        worstDistrict: string;
        avgGapHours: number;
        centersClosingBefore6PM: number;
      };
      recommendations: string[];
    }>(
      `Analyze the 3PM-8PM after-school gap for Montgomery, AL youth.

Facilities data:
- Schools: ${schools.length} (these dismiss around 3PM)
- Community centers: ${JSON.stringify(centers.map((c) => ({ name: c.name, hours: c.operHours, days: c.operDays, lat: c.latitude, lng: c.longitude })))}
- Parks: ${parks.length} (${parks.filter((p) => p.playground === "Y").length} with playgrounds)
- Libraries: ${libraries.length}
- Day cares: ${daycares.length}
- Risk zones with high gap scores: ${JSON.stringify(riskZones.slice(0, 15))}

Identify:
1. Zones where youth have ZERO structured activities within 15-min walking distance (0.75 miles) during 4-7PM
2. Community centers that close at 5PM (leaving a 2-hour gap)
3. Districts with worst coverage
4. Specific interventions: extend hours, deploy mobile programming, partner with churches

Return structured JSON with gapZones array, summary stats, and recommendations.`,
      SYSTEM_PROMPTS.YOUTHSHIELD
    );

    return ok(analysis);
  } catch (e) {
    console.error("Gap analysis error:", e);
    return serverError("Failed to perform gap analysis");
  }
}
