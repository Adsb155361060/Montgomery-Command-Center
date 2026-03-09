/**
 * Sentinel stats overview
 * GET /api/sentinel/stats — Key metrics for the sentinel module
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") || undefined;

    const where: Record<string, unknown> = {};
    if (district) where.district = district;

    const [
      totalIncidents,
      incidentsByType,
      criticalZones,
      stations,
      calls911,
    ] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.groupBy({
        by: ["incidentCategory"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.forceMultiplierZone.count({ where: { riskLevel: "critical" } }),
      prisma.policeStation.count(),
      prisma.call911.aggregate({ _sum: { callCountByOrigin: true } }),
    ]);

    // Incident by district distribution
    const byDistrict = await prisma.incident.groupBy({
      by: ["district"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return ok({
      totalIncidents,
      incidentsByType: incidentsByType.map((g) => ({
        type: g.incidentCategory || "Unknown",
        count: g._count.id,
      })),
      criticalZones,
      policeStations: stations,
      total911Calls: calls911._sum.callCountByOrigin || 0,
      byDistrict: byDistrict.map((d) => ({
        district: d.district || "Unknown",
        count: d._count.id,
      })),
      compliance: {
        currentOfficers: 290,
        requiredOfficers: 402,
        ratio: Math.round((290 / 200603) * 1000 * 100) / 100,
        status: "NON-COMPLIANT",
      },
    });
  } catch (e) {
    console.error("Sentinel stats error:", e);
    return serverError("Failed to fetch sentinel stats");
  }
}
