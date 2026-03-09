/**
 * POST /api/auth/login — Authenticate user and return JWT
 * Body: { email, password }
 */
import prisma from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/response";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequest("email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return badRequest("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return badRequest("Invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      modules: user.modules,
      district: user.district,
    });

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent: ua,
      },
    });

    const response = ok(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          title: user.title,
          department: user.department,
          district: user.district,
          modules: user.modules,
        },
        token,
      },
      { message: "Login successful" }
    );

    response.headers.set(
      "Set-Cookie",
      `mcc_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return response;
  } catch (e: unknown) {
    console.error("Login error:", e);
    return serverError("Login failed");
  }
}
