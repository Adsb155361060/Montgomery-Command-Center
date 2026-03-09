/**
 * Shared API response helpers & validation.
 */

import { NextResponse } from "next/server";

/**
 * Recursively convert BigInt values to Number (or String for very large values)
 * so JSON.stringify doesn't throw.
 */
function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") {
    // If it fits safely in a JS number, convert; otherwise stringify
    return Number.MIN_SAFE_INTEGER <= Number(obj) && Number(obj) <= Number.MAX_SAFE_INTEGER
      ? Number(obj)
      : obj.toString();
  }
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data: serializeBigInts(data), ...meta });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data: serializeBigInts(data) }, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export function notFound(message: string = "Not found") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function serverError(message: string = "Internal server error") {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

/**
 * Parse pagination params from URL search params.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Parse district filter.
 */
export function parseDistrict(searchParams: URLSearchParams): string | undefined {
  const d = searchParams.get("district");
  return d || undefined;
}

/**
 * Build pagination metadata.
 */
export function paginationMeta(total: number, page: number, limit: number) {
  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
