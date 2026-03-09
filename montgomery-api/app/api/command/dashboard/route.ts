/**
 * Command Center — Cross-Module Intelligence (CMI)
 * GET /api/command/dashboard — Unified dashboard with all 4 modules
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district") || undefined;

    // Gather vital signs from all 4 modules in parallel
    const [
      // Sentinel
      incidentCount,
      criticalZones,
      // YouthShield
      youthHighRisk,
      schoolCount,
      centerCount,
      // Blight
      nuisanceCount,
      violationCount,
      propertyCount,
      criticalBlight,
      // Compass
      permitCount,
      totalInvestment,
      businessCount,
      // Cross-module
      recentAlerts,
    ] = await Promise.all([
      prisma.incident.count(district ? { where: { district } } : undefined),
      prisma.forceMultiplierZone.count({ where: { riskLevel: "critical" } }),
      prisma.youthRiskZone.count({ where: { riskLevel: { in: ["critical", "high"] } } }),
      prisma.school.count(),
      prisma.communityCenter.count(),
      prisma.nuisance.count(district ? { where: { district } } : undefined),
      prisma.codeViolation.count(),
      prisma.cityOwnedProperty.count(),
      prisma.blightScore.count({ where: { riskLevel: "critical" } }),
      prisma.constructionPermit.count(),
      prisma.constructionPermit.aggregate({ _sum: { estimatedCost: true } }),
      prisma.businessLicense.count(),
      prisma.crossModuleAlert.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    ]);

    return ok({
      timestamp: new Date().toISOString(),
      district: district || "all",
      sentinel: {
        totalIncidents: incidentCount,
        criticalZones,
        officerCount: 290,
        requiredOfficers: 402,
        complianceRatio: Math.round((290 / 200603) * 1000 * 100) / 100,
        status: "NON-COMPLIANT",
      },
      youthshield: {
        highRiskZones: youthHighRisk,
        schools: schoolCount,
        communityCenters: centerCount,
        dangerWindow: "3PM-8PM",
        keyMetric: "50%+ homicide arrests under 21",
      },
      blight: {
        nuisances: nuisanceCount,
        codeViolations: violationCount,
        cityOwnedProperties: propertyCount,
        criticalParcels: criticalBlight,
      },
      compass: {
        constructionPermits: permitCount,
        totalInvestment: totalInvestment._sum.estimatedCost || 0,
        activeBusinesses: businessCount,
        majorProjectsTotal: "$3B+",
      },
      crossModule: {
        recentAlerts: recentAlerts.length,
        alerts: recentAlerts,
      },
    });
  } catch (e) {
    console.error("Command dashboard error:", e);
    return serverError("Failed to generate command dashboard");
  }
}
