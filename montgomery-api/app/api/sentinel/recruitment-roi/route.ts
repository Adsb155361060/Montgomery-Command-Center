/**
 * S4 — Recruitment ROI Calculator
 * POST /api/sentinel/recruitment-roi — Model ROI of hiring additional officers
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { district, shift, additionalOfficers = 1 } = body;

    // Get incident density for specified area
    const where: Record<string, unknown> = {};
    if (district) where.district = district;

    const incidentCount = await prisma.incident.count({ where });
    const zones = await prisma.forceMultiplierZone.findMany({
      where: district ? { district } : {},
      orderBy: { score: "desc" },
      take: 10,
    });

    const { data: roi } = await AI.json<{
      district: string;
      additionalOfficers: number;
      projectedIncidentReduction: number;
      projectedIncidentReductionPct: number;
      monthlySavings: number;
      annualSavings: number;
      annualCost: number;
      roi: number;
      breakdownByCategory: Array<{
        category: string;
        currentIncidents: number;
        projectedReduction: number;
        savingsPerIncident: number;
        totalSavings: number;
      }>;
      justification: string;
    }>(
      `Calculate recruitment ROI for adding ${additionalOfficers} officer(s) to ${district || "citywide"} ${shift || "all"} shift in Montgomery, AL.

Current data:
- Total incidents in area: ${incidentCount}
- Top force multiplier zones: ${JSON.stringify(zones)}
- Officer salary: $47,000/year + benefits (~$70K total)
- Training cost: ~$15K per new officer

Model incident-to-cost using Montgomery-specific data:
- Property crime average cost: $3,500
- Violent crime average cost: $42,000
- Business robbery average cost: $15,000
- Vehicle theft average cost: $8,500

Return: ROI analysis with projected incident reduction, cost savings, and executive-ready justification text.`,
      SYSTEM_PROMPTS.SENTINEL
    );

    return ok(roi);
  } catch (e) {
    console.error("Recruitment ROI error:", e);
    return serverError("Failed to calculate recruitment ROI");
  }
}
