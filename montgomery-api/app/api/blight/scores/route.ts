/**
 * B1 — Blight Severity Scoring Engine
 * GET /api/blight/scores — Parcel blight scores
 * POST /api/blight/scores — AI-recalculate blight scores
 */
import prisma from "@/lib/db";
import AI from "@/lib/ai";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = searchParams.get("district") || undefined;
    const minScore = parseInt(searchParams.get("minScore") || "0", 10);

    const where: Record<string, unknown> = {};
    if (district) where.district = { contains: district, mode: "insensitive" };
    if (minScore > 0) where.score = { gte: minScore };
    const riskLevel = searchParams.get("riskLevel") || undefined;
    if (riskLevel) where.riskLevel = { equals: riskLevel, mode: "insensitive" };

    const [scores, total] = await Promise.all([
      prisma.blightScore.findMany({ where, skip, take: limit, orderBy: { score: "desc" } }),
      prisma.blightScore.count({ where }),
    ]);

    return ok(scores, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Blight scores error:", e);
    return serverError("Failed to fetch blight scores");
  }
}

export async function POST() {
  try {
    // Gather nuisances and violations per parcel
    const nuisances = await prisma.nuisance.findMany();
    const violations = await prisma.codeViolation.findMany();
    const properties = await prisma.cityOwnedProperty.findMany();

    // Group nuisances by parcel
    const nuisanceByParcel: Record<string, number> = {};
    const nuisanceLocations: Record<string, string> = {};
    for (const n of nuisances) {
      const key = n.parcelNo || n.location || `loc_${n.id}`;
      nuisanceByParcel[key] = (nuisanceByParcel[key] || 0) + 1;
      if (n.location) nuisanceLocations[key] = n.location;
    }

    // Group violations by parcel
    const violationByParcel: Record<string, { count: number; status: string; lien: string }> = {};
    for (const v of violations) {
      const key = v.parcelNo || v.address || `viol_${v.id}`;
      if (!violationByParcel[key]) {
        violationByParcel[key] = { count: 0, status: v.caseStatus || "", lien: v.lienStatus || "" };
      }
      violationByParcel[key].count++;
    }

    // Merge all parcels
    const allParcels = new Set([
      ...Object.keys(nuisanceByParcel),
      ...Object.keys(violationByParcel),
      ...properties.map((p) => p.parcelNum || `prop_${p.id}`),
    ]);

    const parcelData = Array.from(allParcels).slice(0, 100).map((parcel) => ({
      parcel,
      nuisances: nuisanceByParcel[parcel] || 0,
      violations: violationByParcel[parcel]?.count || 0,
      lienStatus: violationByParcel[parcel]?.lien || "NA",
      location: nuisanceLocations[parcel] || "",
    }));

    const { data: scores } = await AI.json<Array<{
      parcel: string;
      score: number;
      riskLevel: string;
      location: string;
    }>>(
      `Score these Montgomery AL parcels for blight severity (0-100 scale). Consider:
- Number of nuisance complaints (junk vehicles, litter, overgrown grass, abandoned structures)
- Code violations count and status
- Lien history (Filed vs NA)
- Proximity clustering (multiple complaints = higher contagion risk)
- Score > 75 = "critical", 50-74 = "high", 25-49 = "medium", < 25 = "low"

Parcel data: ${JSON.stringify(parcelData)}

Return JSON array: parcel, score (0-100), riskLevel, location`,
      SYSTEM_PROMPTS.BLIGHT
    );

    // Delete existing scores for these parcels then bulk-insert fresh ones
    const parcelNos = scores.map((s) => s.parcel).filter(Boolean);
    await prisma.blightScore.deleteMany({ where: { parcelNo: { in: parcelNos } } });

    const data = scores.map((s) => {
      const pd = parcelData.find((p) => p.parcel === s.parcel);
      return {
        parcelNo: s.parcel,
        address: s.location || pd?.location,
        score: s.score,
        nuisanceCount: pd?.nuisances || 0,
        violationCount: pd?.violations || 0,
        riskLevel: s.riskLevel,
      };
    });

    await prisma.blightScore.createMany({ data });
    return ok({ scored: data.length, message: "Blight scores calculated" });
  } catch (e) {
    console.error("Blight scoring error:", e);
    return serverError("Failed to calculate blight scores");
  }
}
