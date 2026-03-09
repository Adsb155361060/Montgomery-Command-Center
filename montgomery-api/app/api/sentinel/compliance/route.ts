/**
 * S3 — SB 298 Compliance Dashboard
 * GET /api/sentinel/compliance — Current compliance status & projections
 * POST /api/sentinel/compliance/scenario — What-if scenario modeling
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

// Montgomery constants
const POPULATION = 200_603;
const CURRENT_OFFICERS = 290;
const REQUIRED_RATIO = 2; // per 1,000 residents
const REQUIRED_OFFICERS = Math.ceil(POPULATION * REQUIRED_RATIO / 1000); // 402
const CURRENT_SALARY = 47_000;
const FIREFIGHTER_SALARY = 52_000;
const WEEKLY_ATTRITION = 2.5; // 2-3 officers per week average

export async function GET() {
  try {
    const complianceRatio = (CURRENT_OFFICERS / POPULATION) * 1000;
    const gap = REQUIRED_OFFICERS - CURRENT_OFFICERS;
    const compliancePct = (CURRENT_OFFICERS / REQUIRED_OFFICERS) * 100;

    // Calculate projections under different scenarios
    const scenarios = [
      {
        name: "Current Trajectory",
        hiringRate: 3, // per month
        attritionRate: WEEKLY_ATTRITION * 4.33,
        salaryIncrease: 0,
      },
      {
        name: "Salary Match ($52K)",
        hiringRate: 5,
        attritionRate: WEEKLY_ATTRITION * 4.33 * 0.7, // 30% reduction
        salaryIncrease: 5000,
      },
      {
        name: "Aggressive Recruitment",
        hiringRate: 8,
        attritionRate: WEEKLY_ATTRITION * 4.33 * 0.5,
        salaryIncrease: 8000,
      },
    ];

    const projections = scenarios.map((s) => {
      const netGainPerMonth = s.hiringRate - s.attritionRate;
      const monthsToCompliance = netGainPerMonth > 0 ? Math.ceil(gap / netGainPerMonth) : -1;
      return {
        scenario: s.name,
        netGainPerMonth: Math.round(netGainPerMonth * 10) / 10,
        monthsToCompliance,
        projectedDate: monthsToCompliance > 0
          ? new Date(Date.now() + monthsToCompliance * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : "Never (at current rates)",
        annualCostIncrease: s.salaryIncrease * CURRENT_OFFICERS,
      };
    });

    return ok({
      current: {
        officers: CURRENT_OFFICERS,
        required: REQUIRED_OFFICERS,
        population: POPULATION,
        ratio: Math.round(complianceRatio * 100) / 100,
        requiredRatio: REQUIRED_RATIO,
        gap,
        compliancePercent: Math.round(compliancePct * 10) / 10,
        currentSalary: CURRENT_SALARY,
        firefighterSalary: FIREFIGHTER_SALARY,
        salaryGap: FIREFIGHTER_SALARY - CURRENT_SALARY,
        weeklyAttrition: WEEKLY_ATTRITION,
      },
      projections,
      sb298: {
        threshold: `${REQUIRED_RATIO} officers per 1,000 residents`,
        consequence: "ALEA takeover of MPD if threshold not met",
        status: complianceRatio >= REQUIRED_RATIO ? "COMPLIANT" : "NON-COMPLIANT",
      },
    });
  } catch (e) {
    console.error("Compliance error:", e);
    return serverError("Failed to calculate compliance status");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data: analysis } = await AI.json<{
      projectedOfficers: number;
      complianceDate: string;
      costAnalysis: Record<string, number>;
      recommendations: string[];
      riskAssessment: string;
    }>(
      `Model this SB 298 compliance scenario for Montgomery PD:

Current state: ${CURRENT_OFFICERS} officers, need ${REQUIRED_OFFICERS}, population ${POPULATION}
Scenario parameters: ${JSON.stringify(body)}

Model the compliance timeline considering:
- Current salary $47K vs firefighter $52K
- Weekly attrition of 2-3 officers
- Recruitment pipeline constraints
- MACS unit expansion effects

Return: projectedOfficers (at EOY), complianceDate, costAnalysis (salary, training, equipment), recommendations array, riskAssessment.`,
      SYSTEM_PROMPTS.SENTINEL
    );

    return ok(analysis);
  } catch (e) {
    console.error("Compliance scenario error:", e);
    return serverError("Failed to model compliance scenario");
  }
}
