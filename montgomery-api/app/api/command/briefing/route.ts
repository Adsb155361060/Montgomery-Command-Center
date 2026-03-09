/**
 * Executive Briefing Generator
 * GET /api/command/briefing — Latest briefing
 * POST /api/command/briefing — Generate new weekly executive briefing
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const latest = await prisma.executiveBriefing.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!latest) {
      return ok({ message: "No briefings generated yet. POST to generate one." });
    }

    return ok(latest);
  } catch (e) {
    console.error("Briefing fetch error:", e);
    return serverError("Failed to fetch briefing");
  }
}

export async function POST() {
  try {
    // Gather comprehensive data from all modules
    const [
      incidentCount,
      criticalZones,
      youthRisk,
      nuisances,
      violations,
      blightCritical,
      permits,
      businesses,
      alerts,
      recentAnalyses,
    ] = await Promise.all([
      prisma.incident.count(),
      prisma.forceMultiplierZone.findMany({ where: { riskLevel: "critical" }, take: 5 }),
      prisma.youthRiskZone.findMany({ where: { riskLevel: { in: ["critical", "high"] } }, take: 5 }),
      prisma.nuisance.count(),
      prisma.codeViolation.count(),
      prisma.blightScore.count({ where: { riskLevel: "critical" } }),
      prisma.constructionPermit.count(),
      prisma.businessLicense.count(),
      prisma.crossModuleAlert.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.aiAnalysis.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    ]);

    // Use Gemini 2.5 Pro for the most strategic output
    const { text: briefingContent, model } = await AI.strategize(
      `Generate a weekly executive briefing for Mayor Steven Reed and CTO Dr. Tony Porterfield.

DATA:
SENTINEL:
- Total incidents: ${incidentCount}
- Critical force multiplier zones: ${criticalZones.length}
- Officer count: 290 / 402 required (SB 298)
- Compliance ratio: ${Math.round((290 / 200603) * 1000 * 100) / 100} per 1,000

YOUTHSHIELD:
- High/critical risk zones: ${youthRisk.length}
- 50%+ homicide arrests under 21
- Danger window: 3PM-8PM

BLIGHT:
- Active nuisances: ${nuisances}
- Code violations: ${violations}
- Critical blight parcels: ${blightCritical}

COMPASS:
- Active construction permits: ${permits}
- Active business licenses: ${businesses}
- Major projects: Meta $1.5B + AWS + Google + Inland Port + Convention Center = $3B+

CROSS-MODULE ALERTS: ${JSON.stringify(alerts.map((a) => ({ title: a.title, severity: a.severity })))}

Format as executive briefing with:
1. Public Safety Vital Signs
2. Youth Violence Prevention Update
3. Blight & Regeneration Progress
4. Economic Intelligence
5. Cross-Module Insights (top 3)
6. Recommended Actions (priority ordered)

Be concise, data-driven, actionable. Include specific numbers and trend indicators.`,
      SYSTEM_PROMPTS.EXECUTIVE
    );

    // Save briefing
    const saved = await prisma.executiveBriefing.create({
      data: {
        title: `Weekly Executive Briefing — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        content: briefingContent,
        sentinelSummary: `${incidentCount} incidents, ${criticalZones.length} critical zones, 290/402 officers`,
        youthShieldSummary: `${youthRisk.length} high-risk zones, 3-8PM gap window active`,
        blightSummary: `${nuisances} nuisances, ${violations} violations, ${blightCritical} critical`,
        compassSummary: `${permits} permits, $3B+ investment pipeline`,
        crossModuleInsights: JSON.stringify(alerts.map((a) => a.title)),
        generatedBy: model,
      },
    });

    return ok(saved);
  } catch (e) {
    console.error("Briefing generation error:", e);
    return serverError("Failed to generate executive briefing");
  }
}
