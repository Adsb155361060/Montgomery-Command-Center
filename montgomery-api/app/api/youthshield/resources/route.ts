/**
 * Y5/Y6 — Resource Coordination & Community Asset Map
 * GET /api/youthshield/resources — All youth-serving facilities and programs
 */
import prisma from "@/lib/db";
import { ok, serverError, parseDistrict } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined; // school, center, park, library, daycare

    const [schools, centers, parks, libraries, daycares] = await Promise.all([
      (!type || type === "school") ? prisma.school.findMany() : Promise.resolve([]),
      (!type || type === "center") ? prisma.communityCenter.findMany() : Promise.resolve([]),
      (!type || type === "park") ? prisma.park.findMany() : Promise.resolve([]),
      (!type || type === "library") ? prisma.library.findMany() : Promise.resolve([]),
      (!type || type === "daycare") ? prisma.dayCare.findMany() : Promise.resolve([]),
    ]);

    return ok({
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        level: s.level,
        type: s.schoolType,
        enrollment: s.enrollment,
        latitude: s.latitude,
        longitude: s.longitude,
        resourceType: "school",
      })),
      communityCenters: centers.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        hours: c.operHours,
        days: c.operDays,
        type: c.facilityType,
        description: c.description,
        hasPlayground: c.playground === "Y",
        hasBasketball: c.basketball === "Y",
        latitude: c.latitude,
        longitude: c.longitude,
        resourceType: "community_center",
      })),
      parks: parks.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        area: p.parkArea,
        hasPlayground: p.playground === "Y",
        hasBasketball: p.basketball === "Y",
        hasSoccer: p.soccer === "Y",
        hasHiking: p.hiking === "Y",
        latitude: p.latitude,
        longitude: p.longitude,
        resourceType: "park",
      })),
      libraries: libraries.map((l) => ({
        id: l.id,
        name: l.branchName,
        address: l.address,
        latitude: l.latitude,
        longitude: l.longitude,
        resourceType: "library",
      })),
      daycares: daycares.map((d) => ({
        id: d.id,
        name: d.name,
        address: d.address,
        latitude: d.latitude,
        longitude: d.longitude,
        resourceType: "daycare",
      })),
      summary: {
        totalSchools: schools.length,
        totalCenters: centers.length,
        totalParks: parks.length,
        totalLibraries: libraries.length,
        totalDaycares: daycares.length,
        totalResources: schools.length + centers.length + parks.length + libraries.length + daycares.length,
      },
    });
  } catch (e) {
    console.error("Resources error:", e);
    return serverError("Failed to fetch youth resources");
  }
}
