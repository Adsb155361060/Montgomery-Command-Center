/**
 * POST /api/auth/register — Register a new user
 * Body: { email, password, name, role?, title?, department?, district? }
 */
import prisma from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/response";
import {
  hashPassword,
  signToken,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, role, title, department, district } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return badRequest("email, password, and name are required");
    }

    if (!validateEmail(email)) {
      return badRequest("Invalid email format");
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return badRequest(pwError);
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("A user with this email already exists");
    }

    // Validate role if provided
    const userRole: Role = role && ["EXECUTIVE", "OPERATIONAL", "CITIZEN"].includes(role)
      ? role
      : "CITIZEN";

    // Assign default modules based on role
    const defaultModules: Record<Role, string[]> = {
      EXECUTIVE: ["sentinel", "youthshield", "blight", "compass"],
      OPERATIONAL: ["sentinel", "youthshield", "blight", "compass"],
      CITIZEN: [],
    };

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: userRole,
        title: title || null,
        department: department || null,
        district: district || null,
        modules: body.modules || defaultModules[userRole],
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
        createdAt: true,
      },
    });

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      modules: user.modules,
      district: user.district,
    });

    const response = ok(
      { user, token },
      { message: "Registration successful" }
    );

    // Set cookie
    response.headers.set(
      "Set-Cookie",
      `mcc_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return response;
  } catch (e) {
    console.error("Register error:", e);
    return serverError("Registration failed");
  }
}
