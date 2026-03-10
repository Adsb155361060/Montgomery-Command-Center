/**
 * Authentication & Authorization utilities
 * - JWT token generation/verification
 * - Password hashing/comparison
 * - Role-based access control (RBAC)
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "mcc-jwt-secret-fallback";
const TOKEN_EXPIRY = "24h";
const SALT_ROUNDS = 12;

// ─── Password ───────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: number;
  email: string;
  role: Role;
  modules: string[];
  district?: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── RBAC: Module-level access matrix ───────────────────────────────────

const MODULE_ACCESS: Record<Role, string[]> = {
  EXECUTIVE: ["sentinel", "youthshield", "blight", "compass", "command", "ai", "geo"],
  OPERATIONAL: ["sentinel", "youthshield", "blight", "compass", "ai", "geo"],
  CITIZEN: ["geo", "ai"], // Public transparency portal — read-only + AI chat
};

// Routes accessible without login
const PUBLIC_ROUTES = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/me",
];

// Routes citizens can read (GET only)
const CITIZEN_READ_ROUTES = [
  "/api/sentinel/stats",
  "/api/youthshield/stats",
  "/api/blight/stats",
  "/api/compass/stats",
  "/api/command/dashboard",
  "/api/geo/districts",
  "/api/geo/lookup",
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

export function canAccessModule(role: Role, module: string): boolean {
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}

export function canAccessRoute(role: Role, pathname: string, method: string): boolean {
  // Public routes — always accessible
  if (isPublicRoute(pathname)) return true;

  // Extract module from path: /api/{module}/...
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const module = parts[1]; // "sentinel", "youthshield", etc.

  // Citizens get read-only access to stats/transparency endpoints
  if (role === "CITIZEN") {
    if (method === "GET" && CITIZEN_READ_ROUTES.some((r) => pathname.startsWith(r))) {
      return true;
    }
    return false;
  }

  // Operational users can access their assigned modules
  // Executive users can access everything
  if (role === "EXECUTIVE") return true;

  return canAccessModule(role, module);
}

// ─── Extract token from request ─────────────────────────────────────────

export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/mcc_token=([^;]+)/);
  return match ? match[1] : null;
}

// ─── Validate registration/login input ──────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}
