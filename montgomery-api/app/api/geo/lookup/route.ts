/**
 * Address Lookup — Unified search across all 4 modules
 * GET /api/geo/lookup?address=123+Main+St — Search all modules for an address
 */
import prisma from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || address.length < 3) {
      return badRequest("address parameter is required (min 3 chars)");
    }

    const searchTerm = address.toUpperCase();

    // Search across all modules in parallel
    const [
      incidents,
      nuisances,
      violations,
      properties,
      permits,
      businesses,
      schools,
      centers,
      parks,
      serviceRequests,
    ] = await Promise.all([
      prisma.incident.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 20,
      }),
      prisma.nuisance.findMany({
        where: { location: { contains: searchTerm, mode: "insensitive" } },
        take: 20,
      }),
      prisma.codeViolation.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 20,
      }),
      prisma.cityOwnedProperty.findMany({
        where: {
          OR: [
            { propAddress: { contains: searchTerm, mode: "insensitive" } },
            { streetName: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: 20,
      }),
      prisma.constructionPermit.findMany({
        where: {
          OR: [
            { physicalAddress: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        take: 20,
      }),
      prisma.businessLicense.findMany({
        where: { fullAddress: { contains: searchTerm, mode: "insensitive" } },
        take: 20,
      }),
      prisma.school.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 10,
      }),
      prisma.communityCenter.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 10,
      }),
      prisma.park.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 10,
      }),
      prisma.serviceRequest311.findMany({
        where: { address: { contains: searchTerm, mode: "insensitive" } },
        take: 20,
      }),
    ]);

    return ok({
      query: address,
      results: {
        sentinel: {
          incidents: incidents.length,
          data: incidents,
        },
        blight: {
          nuisances: nuisances.length,
          violations: violations.length,
          properties: properties.length,
          serviceRequests: serviceRequests.length,
          data: { nuisances, violations, properties, serviceRequests },
        },
        compass: {
          permits: permits.length,
          businesses: businesses.length,
          data: { permits, businesses },
        },
        youthshield: {
          schools: schools.length,
          centers: centers.length,
          parks: parks.length,
          data: { schools, centers, parks },
        },
      },
      totalResults: incidents.length + nuisances.length + violations.length + properties.length + permits.length + businesses.length + schools.length + centers.length + parks.length + serviceRequests.length,
    });
  } catch (e) {
    console.error("Address lookup error:", e);
    return serverError("Failed to perform address lookup");
  }
}
