import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  let dbStatus = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  return NextResponse.json({
    name: "Montgomery Command Center API",
    version: "1.0.0",
    status: "operational",
    database: dbStatus,
    modules: [
      "sentinel",
      "youthshield",
      "blight",
      "compass",
      "command",
      "ai",
    ],
    timestamp: new Date().toISOString(),
  });
}
