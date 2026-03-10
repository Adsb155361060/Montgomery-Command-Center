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

    const numOfficers = Number(additionalOfficers) || 1;
    const targetDistrict = district || "citywide";
    const targetShift = shift || "all shifts";

    const { data: roi } = await AI.json<Record<string, unknown>>(
      `Calculate recruitment ROI for adding EXACTLY ${numOfficers} new officer(s) to ${targetDistrict} on ${targetShift} in Montgomery, AL.

IMPORTANT: You MUST use num_officers_added = ${numOfficers}. Do NOT change this number.

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

Return this EXACT JSON structure:
{
  "investment_details": {
    "num_officers_added": ${numOfficers},
    "officer_salary_annual": 70000,
    "training_cost_per_officer": 15000,
    "total_investment_year_1": <number>,
    "total_recurring_investment_annual": <number>
  },
  "projected_incident_reduction": {
    "business_robberies": { "count": <number>, "cost_per_incident": 15000, "total_savings": <number> },
    "property_crimes": { "count": <number>, "cost_per_incident": 3500, "total_savings": <number> },
    "vehicle_thefts": { "count": <number>, "cost_per_incident": 8500, "total_savings": <number> },
    "violent_crimes": { "count": <number>, "cost_per_incident": 42000, "total_savings": <number> }
  },
  "total_projected_annual_savings": <number>,
  "roi_analysis": {
    "year_1": { "net_benefit": <number>, "roi_percentage": <number> },
    "subsequent_years_annual": { "net_benefit": <number>, "roi_percentage": <number> }
  },
  "district": "${targetDistrict}",
  "shift": "${targetShift}",
  "executive_justification": "<2-3 paragraph justification>"
}`,
      SYSTEM_PROMPTS.SENTINEL
    );

    // Ensure officer count matches user input
    if (roi && typeof roi === 'object') {
      const inv = roi.investment_details as Record<string, unknown> | undefined;
      if (inv) inv.num_officers_added = numOfficers;
    }

    return ok(roi);
  } catch (e) {
    console.error("Recruitment ROI error:", e);
    return serverError("Failed to calculate recruitment ROI");
  }
}
