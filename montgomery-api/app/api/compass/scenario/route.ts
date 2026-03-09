/**
 * D2 — What-If Scenario Simulator
 * POST /api/compass/scenario — Run what-if simulations on investment scenarios
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario } = body;

    if (!scenario) {
      return badRequest("scenario description is required");
    }

    const permits = await prisma.constructionPermit.findMany({ take: 50, orderBy: { estimatedCost: "desc" } });
    const population = await prisma.dailyPopulationTrend.findMany({ take: 50 });

    // Use Pro model for deep scenario analysis
    const { data: simulation, model } = await AI.deepJson<{
      scenario: string;
      assumptions: string[];
      projections: {
        year1: Record<string, string | number>;
        year3: Record<string, string | number>;
        year5: Record<string, string | number>;
        year10: Record<string, string | number>;
        year20: Record<string, string | number>;
      };
      utilityImpact: {
        electricityCostChange: string;
        waterCostChange: string;
        totalDemandIncrease: string;
      };
      jobImpact: {
        constructionPhase: { jobs: number; duration: string; avgWage: string };
        operationalPhase: { jobs: number; skillRequirements: string[]; avgWage: string };
        secondaryJobs: { estimated: number; sectors: string[] };
      };
      housingImpact: {
        priceChangeNearSite: string;
        rentalPressure: string;
        displacementRisk: string;
      };
      taxRevenue: {
        annual: string;
        overAbatementPeriod: string;
        postAbatement: string;
      };
      communityBenefit: {
        recommendedAsk: string;
        components: string[];
        comparableOutcomes: string[];
      };
      riskFactors: string[];
      confidenceLevel: string;
    }>(
      `Run what-if scenario simulation for Montgomery, AL:

SCENARIO: ${scenario}

Base data:
- Montgomery population: 200,603
- Median home price: ~$190K
- Current utility rates: Alabama Power residential
- Active construction: ${permits.length} permits
- Major investments: Meta $1.5B, AWS ~$800M, Google ~$700M, Inland Port $340M, Convention Center $100M+

Model across 1, 3, 5, 10, and 20 year horizons:
- Utility cost impact on residents
- Job creation (construction vs permanent vs secondary)
- Housing market effects
- Tax revenue projections
- Community benefit agreement recommendations
- Risk factors with confidence intervals

Use comparable city data: Loudoun County VA, Quincy WA, New Albany OH, Prineville OR for validation.`,
      SYSTEM_PROMPTS.COMPASS
    );

    await prisma.aiAnalysis.create({
      data: {
        module: "compass",
        analysisType: "what_if_scenario",
        prompt: scenario,
        response: JSON.stringify(simulation),
        model,
      },
    });

    return ok({ ...simulation, modelUsed: model });
  } catch (e) {
    console.error("Scenario simulation error:", e);
    return serverError("Failed to run scenario simulation");
  }
}
