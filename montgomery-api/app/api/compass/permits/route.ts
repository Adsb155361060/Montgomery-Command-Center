/**
 * D4/D5 — Utility Cost Projector & Jobs Analyzer
 * GET /api/compass/permits — Construction permit data
 */
import prisma from "@/lib/db";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = searchParams.get("district") || undefined;
    const projectType = searchParams.get("projectType") || undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    const where: Record<string, unknown> = {};
    if (district) where.districtCouncil = { contains: district, mode: "insensitive" };
    if (projectType) where.projectType = { contains: projectType, mode: "insensitive" };
    if (year) where.year = year;
    const status = searchParams.get("status") || undefined;
    if (status) where.permitStatus = { contains: status, mode: "insensitive" };
    const address = searchParams.get("address") || undefined;
    if (address) where.physicalAddress = { contains: address, mode: "insensitive" };

    const [permits, total] = await Promise.all([
      prisma.constructionPermit.findMany({
        where, skip, take: limit,
        orderBy: { estimatedCost: "desc" },
      }),
      prisma.constructionPermit.count({ where }),
    ]);

    return ok(permits, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Permits error:", e);
    return serverError("Failed to fetch construction permits");
  }
}
