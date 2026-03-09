/**
 * GET  /api/auth/me — Get current authenticated user
 * POST /api/auth/me — Update profile
 */
import prisma from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/response";
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
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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
    });

    if (!user || !user.isActive) {
      return new Response(JSON.stringify({ success: false, error: "User not found or deactivated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return ok({ user });
  } catch (e) {
    console.error("Auth/me error:", e);
    return serverError("Failed to fetch user");
  }
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { name, title, department, district } = body;

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(name && { name }),
        ...(title !== undefined && { title }),
        ...(department !== undefined && { department }),
        ...(district !== undefined && { district }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        title: true,
        department: true,
        district: true,
        modules: true,
      },
    });

    return ok({ user }, { message: "Profile updated" });
  } catch (e) {
    console.error("Auth/me update error:", e);
    return serverError("Failed to update profile");
  }
}
