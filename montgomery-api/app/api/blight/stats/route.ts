/**
 * Blight stats overview
 * GET /api/blight/stats
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const [
      nuisanceCount,
      violationCount,
      propertyCount,
      criticalBlight,
      highBlight,
      blightAvg,
      nuisanceByDistrict,
      violationsByStatus,
      serviceRequests,
    ] = await Promise.all([
      prisma.nuisance.count(),
      prisma.codeViolation.count(),
      prisma.cityOwnedProperty.count(),
      prisma.blightScore.count({ where: { riskLevel: "critical" } }),
      prisma.blightScore.count({ where: { riskLevel: "high" } }),
      prisma.blightScore.aggregate({ _avg: { score: true } }),
      prisma.nuisance.groupBy({
        by: ["district"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.codeViolation.groupBy({
        by: ["caseStatus"],
        _count: { id: true },
      }),
      prisma.serviceRequest311.count(),
    ]);

    return ok({
      totals: {
        nuisances: nuisanceCount,
        codeViolations: violationCount,
        cityOwnedProperties: propertyCount,
        serviceRequests311: serviceRequests,
      },
      blightAnalysis: {
        criticalParcels: criticalBlight,
        highSeverityParcels: highBlight,
        avgBlightScore: Math.round((blightAvg._avg.score || 0) * 10) / 10,
      },
      nuisanceByDistrict: nuisanceByDistrict.map((d) => ({
        district: d.district || "Unknown",
        count: d._count.id,
      })),
      violationsByStatus: violationsByStatus.map((v) => ({
        status: v.caseStatus || "Unknown",
        count: v._count.id,
      })),
    });
  } catch (e) {
    console.error("Blight stats error:", e);
    return serverError("Failed to fetch blight stats");
  }
}
