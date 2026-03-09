/**
 * Y2 — Intervention Routing Engine
 * POST /api/youthshield/intervention — Route interventions to risk zones
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { zoneH3, interventionType } = body;

    const centers = await prisma.communityCenter.findMany();
    const riskZones = await prisma.youthRiskZone.findMany({
      orderBy: { riskScore: "desc" },
      take: 15,
    });

    const { data: routing } = await AI.json<{
      interventions: Array<{
        zone: string;
        riskScore: number;
        recommendedIntervention: string;
        provider: string;
        deploymentPoint: string;
        distanceToZone: string;
        alternativeProvider: string;
        urgency: string;
        timeSlot: string;
      }>;
      coverageGaps: string[];
      coordinationNotes: string;
    }>(
      `Route youth violence interventions in Montgomery, AL.

${zoneH3 ? `Target zone: ${zoneH3}` : "Analyze all high-risk zones"}
${interventionType ? `Preferred intervention: ${interventionType}` : "Recommend best intervention type"}

Available programs:
- CrimeStoppers: peer mediation, conflict resolution (capacity: 4 teams)
- SOOP (Stay Out Of Prison): mentorship, community discussions (capacity: 6 mentors)
- Montgomery Parks & Rec: sports, recreation (22 community centers)
- MPS After-School: academic support (at school sites)
- Church Youth Groups: faith-based mentoring (various locations)
- YMCA: sports, fitness, leadership programs

Community centers: ${JSON.stringify(centers.map((c) => ({ name: c.name, lat: c.latitude, lng: c.longitude, hours: c.operHours })))}
High-risk zones: ${JSON.stringify(riskZones)}

Match interventions to zones based on: type effectiveness, proximity, provider capacity, time coverage.
Return routing plan with specific deployment points, providers, and time slots.`,
      SYSTEM_PROMPTS.YOUTHSHIELD
    );

    await prisma.aiAnalysis.create({
      data: {
        module: "youthshield",
        analysisType: "intervention_routing",
        prompt: JSON.stringify({ zoneH3, interventionType }),
        response: JSON.stringify(routing),
        model: "gemini-2.5-flash",
        h3Index: zoneH3,
      },
    });

    return ok(routing);
  } catch (e) {
    console.error("Intervention routing error:", e);
    return serverError("Failed to route interventions");
  }
}
