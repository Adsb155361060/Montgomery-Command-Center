/**
 * AI Model Usage Stats
 * GET /api/ai/stats — Current model usage and rate limit status
 */
import AI from "@/lib/ai";
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const usageStats = AI.getUsageStats();

    const analysisCount = await prisma.aiAnalysis.groupBy({
      by: ["model"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const analysisByModule = await prisma.aiAnalysis.groupBy({
      by: ["module"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return ok({
      currentSession: usageStats,
      totalAnalyses: analysisCount.map((a) => ({
        model: a.model,
        count: a._count.id,
      })),
      analysesByModule: analysisByModule.map((a) => ({
        module: a.module,
        count: a._count.id,
      })),
      availableModels: {
        "gemini-2.5-flash": { rpm: 1000, tpm: "1M", specialty: "Primary workhorse" },
        "gemini-3-flash": { rpm: 1000, tpm: "1M", specialty: "High-throughput batch" },
        "gemini-2.0-flash": { rpm: 2000, tpm: "4M", specialty: "Fallback general" },
        "gemini-2.0-flash-lite": { rpm: 4000, tpm: "4M", specialty: "Fast classification" },
        "gemini-2.5-pro": { rpm: 150, tpm: "2M", specialty: "Deep analysis" },
        "gemini-3-pro": { rpm: 25, tpm: "1M", specialty: "Advanced reasoning" },
      },
    });
  } catch (e) {
    console.error("AI stats error:", e);
    return serverError("Failed to fetch AI stats");
  }
}
