/**
 * GET /api/blight/properties — City-owned properties
 */
import prisma from "@/lib/db";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const zoning = searchParams.get("zoning") || undefined;
    const maintBy = searchParams.get("maintBy") || undefined;

    const where: Record<string, unknown> = {};
    if (zoning) where.zoning = { contains: zoning, mode: "insensitive" };
    if (maintBy) where.maintBy = { contains: maintBy, mode: "insensitive" };

    const [properties, total] = await Promise.all([
      prisma.cityOwnedProperty.findMany({ where, skip, take: limit, orderBy: { id: "asc" } }),
      prisma.cityOwnedProperty.count({ where }),
    ]);

    return ok(properties, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Properties error:", e);
    return serverError("Failed to fetch city-owned properties");
  }
}
