/**
 * D1 — Multi-Project Impact Dashboard
 * GET /api/compass/impact — Combined impact of all major investments
 */
import prisma from "@/lib/db";
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError } from "@/lib/response";

// Montgomery's major projects
const PROJECTS = {
  meta: { name: "Meta Data Center", investment: 1_500_000_000, sqft: 1_300_000, constructionJobs: 1000, permanentJobs: 100, status: "under_construction" },
  aws: { name: "AWS Data Center", investment: 800_000_000, sqft: 600_000, constructionJobs: 600, permanentJobs: 75, status: "planned" },
  google: { name: "Google Data Center", investment: 700_000_000, sqft: 500_000, constructionJobs: 500, permanentJobs: 60, status: "planned" },
  inlandPort: { name: "Inland Port (Intermodal)", investment: 340_000_000, constructionJobs: 800, permanentJobs: 2618, status: "under_construction" },
  conventionCenter: { name: "Convention Center", investment: 100_000_000, constructionJobs: 300, permanentJobs: 200, status: "planned" },
};

export async function GET() {
  try {
    const permits = await prisma.constructionPermit.findMany({ take: 200, orderBy: { estimatedCost: "desc" } });
    const population = await prisma.dailyPopulationTrend.findMany({ take: 100 });
    const businesses = await prisma.businessLicense.count();

    // Use Gemini 3 Flash for high-throughput data processing
    const { data: impact } = await AI.json<{
      totalInvestment: number;
      projects: Array<{
        name: string;
        investment: number;
        constructionJobs: number;
        permanentJobs: number;
        status: string;
        utilityImpact: string;
        housingImpact: string;
        timeline: string;
      }>;
      combinedImpact: {
        totalConstructionJobs: number;
        totalPermanentJobs: number;
        projectedUtilityCostIncrease: string;
        projectedHousingPriceIncrease: string;
        projectedWaterDemandIncrease: string;
        taxRevenueProjection: string;
        trafficImpact: string;
      };
      confidenceIntervals: {
        jobCreation: string;
        utilityCosts: string;
        housingPrices: string;
      };
      keyRisks: string[];
      opportunities: string[];
    }>(
      `Model the combined impact of ALL major investments in Montgomery, AL:

Projects: ${JSON.stringify(PROJECTS)}
Current context:
- Population: 200,603
- Active construction permits: ${permits.length} (total est. cost: $${permits.reduce((s, p) => s + (p.estimatedCost || 0), 0).toLocaleString()})
- Active business licenses: ${businesses}
- Population trends: ${JSON.stringify(population.slice(0, 10))}

Use Monte Carlo simulation logic to provide confidence intervals. Model:
1. Project-by-project impact (utility, housing, traffic, jobs, tax)
2. COMBINED impact — these projects INTERACT
3. Short-term (construction phase 2-3 years) vs long-term (operational 10+ years)
4. Distinguish temporary construction from permanent operational jobs

Return comprehensive impact dashboard JSON.`,
      SYSTEM_PROMPTS.COMPASS
    );

    return ok(impact);
  } catch (e) {
    console.error("Compass impact error:", e);
    return serverError("Failed to generate impact dashboard");
  }
}
