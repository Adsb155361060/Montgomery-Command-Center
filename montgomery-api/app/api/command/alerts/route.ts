/**
 * Cross-Module Intelligence — Convergence Alert Generator
 * GET /api/command/alerts — Fetch cross-module alerts
 * POST /api/command/alerts — AI-generate new convergence alerts
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const severity = searchParams.get("severity") || undefined;
    const module = searchParams.get("module") || undefined;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (module) where.modules = { has: module };

    const [alerts, total] = await Promise.all([
      prisma.crossModuleAlert.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.crossModuleAlert.count({ where }),
    ]);

    return ok(alerts, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Alerts error:", e);
    return serverError("Failed to fetch alerts");
  }
}

export async function POST() {
  try {
    // Gather data from all modules for cross-analysis using Gemini 3 Pro (deepest reasoning)
    const [
      topIncidentZones,
      highRiskYouth,
      criticalBlight,
      topPermits,
    ] = await Promise.all([
      prisma.forceMultiplierZone.findMany({ where: { riskLevel: { in: ["critical", "high"] } }, take: 15 }),
      prisma.youthRiskZone.findMany({ where: { riskLevel: { in: ["critical", "high"] } }, take: 15 }),
      prisma.blightScore.findMany({ where: { riskLevel: { in: ["critical", "high"] } }, take: 15 }),
      prisma.constructionPermit.findMany({ orderBy: { estimatedCost: "desc" }, take: 10 }),
    ]);

    const { data: alerts } = await AI.deepJson<Array<{
      alertType: string;
      severity: string;
      title: string;
      description: string;
      modules: string[];
      district: string;
      recommendation: string;
    }>>(
      `Generate cross-module convergence alerts for Montgomery Command Center.

Analyze overlapping patterns across ALL FOUR modules:

SENTINEL (crime/safety data):
${JSON.stringify(topIncidentZones)}

YOUTHSHIELD (youth risk data):
${JSON.stringify(highRiskYouth)}

BLIGHT (urban decay data):
${JSON.stringify(criticalBlight)}

COMPASS (economic development data):
${JSON.stringify(topPermits.slice(0, 5).map((p) => ({ type: p.projectType, cost: p.estimatedCost, district: p.districtCouncil })))}

Find CONNECTIONS:
1. Crime hotspots that overlap with blight clusters
2. Youth risk zones with no economic benefit from data center investment
3. Blighted areas near active construction/development
4. Districts with convergence across 3+ modules
5. Positive cascades — areas where improvement in one module benefits others

Generate 5-8 specific, actionable convergence alerts.
Each must name specific districts, specific actions, and specific responsible entities.

severity: "critical"|"high"|"medium"|"info"
alertType: "convergence"|"positive_cascade"|"opportunity"|"risk"
modules: array of involved module names

Return JSON array.`,
      SYSTEM_PROMPTS.CROSS_MODULE
    );

    // Save alerts to database
    const creates = alerts.map((a) =>
      prisma.crossModuleAlert.create({
        data: {
          alertType: a.alertType,
          severity: a.severity,
          title: a.title,
          description: a.description,
          modules: a.modules,
          district: a.district,
          recommendation: a.recommendation,
        },
      })
    );

    const results = await prisma.$transaction(creates);
    return ok({ alerts: results.length, message: "Cross-module alerts generated" });
  } catch (e) {
    console.error("Alert generation error:", e);
    return serverError("Failed to generate cross-module alerts");
  }
}
