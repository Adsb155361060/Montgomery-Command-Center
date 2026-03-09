/**
 * GET /api/blight/violations — Code violations listing
 */
import prisma from "@/lib/db";
import { ok, serverError, parsePagination, paginationMeta } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const district = searchParams.get("district") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: Record<string, unknown> = {};
    if (district) where.councilDistrict = { contains: district, mode: "insensitive" };
    if (status) where.caseStatus = status;

    const [violations, total] = await Promise.all([
      prisma.codeViolation.findMany({ where, skip, take: limit, orderBy: { id: "desc" } }),
      prisma.codeViolation.count({ where }),
    ]);

    return ok(violations, paginationMeta(total, page, limit));
  } catch (e) {
    console.error("Violations error:", e);
    return serverError("Failed to fetch code violations");
  }
}
