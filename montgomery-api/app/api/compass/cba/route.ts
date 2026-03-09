/**
 * D3 — Community Benefit Agreement Designer
 * POST /api/compass/cba — Generate data-backed CBA recommendations
 */
import AI, { MODELS } from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import prisma from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project = "Meta Data Center", investmentAmount = 1_500_000_000 } = body;

    const { data: cba, model } = await AI.deepJson<{
      project: string;
      investmentAmount: number;
      recommendedCBAValue: string;
      components: Array<{
        category: string;
        description: string;
        estimatedValue: string;
        justification: string;
        comparableCity: string;
      }>;
      negotiationPoints: string[];
      taxAbatementAnalysis: {
        scenario10Year: { loss: string; communityBenefit: string };
        scenario7Year: { loss: string; communityBenefit: string };
        recommended: string;
      };
      localHiringTargets: {
        constructionPhase: string;
        operationalPhase: string;
        trainingPartners: string[];
      };
      comparableCBAs: Array<{
        city: string;
        project: string;
        cbaValue: string;
        keyTerms: string[];
      }>;
    }>(
      `Design a Community Benefit Agreement for Montgomery, AL.

Project: ${project}
Investment: $${investmentAmount.toLocaleString()}

Montgomery context:
- Population 200,603
- 290 police officers (understaffed)
- 50%+ youth homicide arrests under 21
- 598 city-owned blighted properties
- Median home price ~$190K
- Alabama State University nearby (workforce training partner)
- Montgomery Public Schools system

Based on comparable CBAs from data center cities:
- Loudoun County VA (extensive data center corridor)
- Quincy WA (large-scale data center community)
- New Albany OH (Meta, Google facilities)
- Council Bluffs IA (Google, Facebook)

Generate:
1. Specific CBA components with dollar values
2. Job training fund recommendations
3. Local hiring commitments for construction and operations
4. Infrastructure contributions (roads, broadband, community facilities)
5. Utility rate stabilization requirements
6. Environmental mitigation requirements
7. Tax abatement scenarios comparing 7 vs 10 year terms

Return comprehensive CBA design document as JSON.`,
      SYSTEM_PROMPTS.COMPASS
    );

    await prisma.aiAnalysis.create({
      data: {
        module: "compass",
        analysisType: "cba_design",
        prompt: `${project}, $${investmentAmount}`,
        response: JSON.stringify(cba),
        model,
      },
    });

    return ok(cba);
  } catch (e) {
    console.error("CBA design error:", e);
    return serverError("Failed to design CBA");
  }
}
