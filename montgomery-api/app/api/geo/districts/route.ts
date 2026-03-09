/**
 * Council districts data
 * GET /api/geo/districts — All 9 council districts
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const districts = await prisma.councilDistrict.findMany({
      orderBy: { distId: "asc" },
    });

    return ok(districts);
  } catch (e) {
    console.error("Districts error:", e);
    return serverError("Failed to fetch districts");
  }
}
