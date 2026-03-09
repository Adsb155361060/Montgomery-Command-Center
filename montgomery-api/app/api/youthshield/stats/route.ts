/**
 * YouthShield stats overview
 * GET /api/youthshield/stats
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const [
      schools,
      centers,
      parks,
      libraries,
      daycares,
      highRiskZones,
      criticalZones,
      riskZones,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.communityCenter.count(),
      prisma.park.count(),
      prisma.library.count(),
      prisma.dayCare.count(),
      prisma.youthRiskZone.count({ where: { riskLevel: "high" } }),
      prisma.youthRiskZone.count({ where: { riskLevel: "critical" } }),
      prisma.youthRiskZone.aggregate({ _avg: { riskScore: true, gapScore: true } }),
    ]);

    return ok({
      facilities: {
        schools,
        communityCenters: centers,
        parks,
        libraries,
        daycares,
        total: schools + centers + parks + libraries + daycares,
      },
      riskAssessment: {
        criticalZones,
        highRiskZones,
        avgRiskScore: Math.round((riskZones._avg.riskScore || 0) * 10) / 10,
        avgGapScore: Math.round((riskZones._avg.gapScore || 0) * 10) / 10,
      },
      keyMetrics: {
        homicideArrestsUnder21Pct: 50,
        dangerWindowHours: "3PM-8PM",
        interventionPrograms: ["CrimeStoppers", "SOOP", "Parks & Rec", "MPS After-School", "Church Youth", "YMCA"],
        gunViolenceRankNational: 5,
      },
    });
  } catch (e) {
    console.error("YouthShield stats error:", e);
    return serverError("Failed to fetch youthshield stats");
  }
}
