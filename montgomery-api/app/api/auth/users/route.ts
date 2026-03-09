/**
 * GET /api/auth/users — List all users (EXECUTIVE only)
 * Admin endpoint for managing platform users
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";
import { extractToken, verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "EXECUTIVE") {
      return new Response(JSON.stringify({ success: false, error: "Insufficient permissions. Executive role required." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        title: true,
        department: true,
        district: true,
        modules: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ users, total: users.length });
  } catch (e) {
    console.error("User list error:", e);
    return serverError("Failed to fetch users");
  }
}
