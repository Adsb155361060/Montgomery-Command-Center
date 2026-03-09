/**
 * Compass stats & data endpoints
 * GET /api/compass/stats — Key economic metrics
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const [
      permitCount,
      totalInvestment,
      businessCount,
      populationTrends,
      foodScoreAvg,
      permitsByType,
    ] = await Promise.all([
      prisma.constructionPermit.count(),
      prisma.constructionPermit.aggregate({ _sum: { estimatedCost: true } }),
      prisma.businessLicense.count(),
      prisma.dailyPopulationTrend.findMany({ take: 30 }),
      prisma.foodScore.aggregate({ _avg: { score: true } }),
      prisma.constructionPermit.groupBy({
        by: ["projectType"],
        _count: { id: true },
        _sum: { estimatedCost: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    return ok({
      construction: {
        totalPermits: permitCount,
        totalEstimatedCost: totalInvestment._sum.estimatedCost || 0,
        byType: permitsByType.map((p) => ({
          type: p.projectType || "Unknown",
          count: p._count.id,
          totalCost: p._sum.estimatedCost || 0,
        })),
      },
      economy: {
        activeBusinessLicenses: businessCount,
        avgFoodScore: Math.round((foodScoreAvg._avg.score || 0) * 10) / 10,
      },
      majorProjects: {
        metaDataCenter: { investment: "$1.5B", status: "Under Construction", permanentJobs: 100 },
        awsDataCenter: { investment: "$800M", status: "Planned", permanentJobs: 75 },
        googleDataCenter: { investment: "$700M", status: "Planned", permanentJobs: 60 },
        inlandPort: { investment: "$340M", status: "Under Construction", permanentJobs: 2618 },
        conventionCenter: { investment: "$100M+", status: "Planned", permanentJobs: 200 },
      },
      populationTrends: populationTrends.slice(0, 10),
    });
  } catch (e) {
    console.error("Compass stats error:", e);
    return serverError("Failed to fetch compass stats");
  }
}
