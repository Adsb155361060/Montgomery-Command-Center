/**
 * Blight data endpoints — nuisances, violations, properties
 * GET /api/blight/nuisances
 * GET /api/blight/violations
 * GET /api/blight/properties
 */
import prisma from "@/lib/db";
import { ok, serverError, parsePagination, parseDistrict, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = parseDistrict(searchParams);

    const where: Record<string, unknown> = {};
    if (district) where.district = { contains: district, mode: "insensitive" };
    const type = searchParams.get("type") || undefined;
    if (type) where.type = { contains: type, mode: "insensitive" };
    const location = searchParams.get("location") || undefined;
    if (location) where.location = { contains: location, mode: "insensitive" };

    const [nuisances, total] = await Promise.all([
      prisma.nuisance.findMany({ where, skip, take: limit, orderBy: { id: "desc" } }),
      prisma.nuisance.count({ where }),
    ]);

    return ok(nuisances, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Nuisances error:", e);
    return serverError("Failed to fetch nuisances");
  }
}
