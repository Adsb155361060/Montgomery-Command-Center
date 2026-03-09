/**
 * POST /api/auth/logout — Invalidate session
 */
import prisma from "@/lib/db";
import { ok, serverError } from "@/lib/response";
import { extractToken, verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Delete the session
        await prisma.session.deleteMany({
          where: { token },
        });
      }
    }

    const response = ok(null, { message: "Logged out successfully" });

    // Clear cookie
    response.headers.set(
      "Set-Cookie",
      "mcc_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );

    return response;
  } catch (e) {
    console.error("Logout error:", e);
    return serverError("Logout failed");
  }
}
