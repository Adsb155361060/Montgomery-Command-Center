/**
 * S2 — Shift Deployment Optimizer
 * POST /api/sentinel/deployment — Generate optimal patrol assignments for a shift
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const officerCount = body.officerCount || 14;
    const shift = body.shift || "day"; // day, evening, night
    const district = body.district || undefined;

    if (officerCount < 1 || officerCount > 100) {
      return badRequest("officerCount must be between 1 and 100");
    }

    // Get current force multiplier zones
    const zones = await prisma.forceMultiplierZone.findMany({
      where: district ? { district } : {},
      orderBy: { score: "desc" },
      take: 30,
    });

    // Get recent 911 call patterns
    const calls = await prisma.call911.findMany({ take: 50 });

    // Get station locations for response time modeling
    const stations = await prisma.policeStation.findMany();

    const { data: deployment } = await AI.json<{
      assignments: Array<{
        officerId: number;
        zone: string;
        district: string;
        priority: string;
        patrolRoute: string;
        estimatedCoverage: number;
      }>;
      totalCoverage: number;
      gapZones: string[];
      recommendations: string[];
    }>(
      `Generate optimal patrol deployment for ${officerCount} officers on ${shift} shift in Montgomery, AL.

Force multiplier zones (highest priority): ${JSON.stringify(zones.slice(0, 20))}
911 call patterns: ${JSON.stringify(calls.slice(0, 20))}
Police stations: ${JSON.stringify(stations)}

Requirements:
- Maximize coverage across all 9 council districts
- No officer gets back-to-back high-intensity zones
- Critical infrastructure (schools, hospitals, commercial corridors) must have coverage
- Response time target: < 8 minutes to any point in the city
- Account for ${shift} shift specific patterns

Return JSON with: assignments (array per officer with zone, district, priority, patrolRoute description, estimatedCoverage %), totalCoverage %, gapZones (uncovered areas), recommendations array.`,
      SYSTEM_PROMPTS.SENTINEL
    );

    // Store AI analysis
    await prisma.aiAnalysis.create({
      data: {
        module: "sentinel",
        analysisType: "shift_deployment",
        prompt: `${officerCount} officers, ${shift} shift`,
        response: JSON.stringify(deployment),
        model: "gemini-2.5-flash",
        metadata: { officerCount, shift, district },
      },
    });

    return ok(deployment);
  } catch (e) {
    console.error("Deployment optimizer error:", e);
    return serverError("Failed to generate deployment plan");
  }
}
