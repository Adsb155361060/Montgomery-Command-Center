/**
 * Sentinel MGM — Incidents listing with filtering.
 * GET /api/sentinel/incidents?district=X&page=1&limit=50&type=fire
 */
import prisma from "@/lib/db";
import { ok, serverError, parsePagination, parseDistrict, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = parseDistrict(searchParams);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;

    const where: Record<string, unknown> = {};
    if (district) where.district = { startsWith: district, mode: "insensitive" };
    if (type) where.incidentType = { contains: type, mode: "insensitive" };
    if (category) where.incidentCategory = { contains: category, mode: "insensitive" };

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({ where, skip, take: limit, orderBy: { id: "desc" } }),
      prisma.incident.count({ where }),
    ]);

    return ok(incidents, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Sentinel incidents error:", e);
    return serverError("Failed to fetch incidents");
  }
}
