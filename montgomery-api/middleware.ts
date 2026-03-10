/**
 * Next.js Middleware — RBAC enforcement for all /api routes
 * Public routes pass through; protected routes require valid JWT + correct role
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
];

// Routes citizens can access with GET
const CITIZEN_GET_PATHS = [
  "/api/auth/me",
  "/api/sentinel/stats",
  "/api/youthshield/stats",
  "/api/blight/stats",
  "/api/compass/stats",
  "/api/command/dashboard",
  "/api/geo/districts",
  "/api/geo/lookup",
];

// Module access matrix by role
const ROLE_MODULES: Record<string, string[]> = {
  EXECUTIVE: ["sentinel", "youthshield", "blight", "compass", "command", "ai", "geo", "auth"],
  OPERATIONAL: ["sentinel", "youthshield", "blight", "compass", "ai", "geo", "auth"],
  CITIZEN: ["auth", "geo", "ai"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-API routes (pages, static files)
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow CORS preflight OPTIONS requests — browser sends these before every credentialed request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Public routes — always allow
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Extract token from Authorization header or cookie
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("mcc_token")?.value;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Provide Bearer token or login." },
      { status: 401 }
    );
  }

  // Decode JWT payload (middleware can't import full jsonwebtoken, so we decode manually)
  // The actual signature verification happens in the route handler via lib/auth
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token format");

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    const { role, exp } = payload;

    // Check expiration
    if (exp && Date.now() >= exp * 1000) {
      return NextResponse.json(
        { success: false, error: "Token expired. Please login again." },
        { status: 401 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Invalid token: missing role" },
        { status: 401 }
      );
    }

    // Citizen GET-only routes
    if (role === "CITIZEN") {
      const method = request.method;
      if (method === "GET" && CITIZEN_GET_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
      }
      // Citizens can POST to auth/logout, auth/me, and AI chat
      if (pathname.startsWith("/api/auth/logout") || pathname.startsWith("/api/auth/me")) {
        return NextResponse.next();
      }
      if (pathname.startsWith("/api/ai/") && method === "POST") {
        return NextResponse.next();
      }
    }

    // Extract module from path: /api/{module}/...
    const segments = pathname.split("/").filter(Boolean);
    const module = segments.length >= 2 ? segments[1] : "";

    // Executive access: everything
    if (role === "EXECUTIVE") {
      return NextResponse.next();
    }

    // Check module-level access
    const allowedModules = ROLE_MODULES[role] || [];
    if (allowedModules.includes(module)) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        success: false,
        error: `Access denied. Your role (${role}) cannot access the ${module} module.`,
        requiredRole: "EXECUTIVE or OPERATIONAL with module access",
      },
      { status: 403 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid token. Please login again." },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: "/api/:path*",
};
