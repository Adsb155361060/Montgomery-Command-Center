/**
 * Database seeder — Ingests all Montgomery CSV datasets into PostgreSQL.
 * Run: npm run seed
 */
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { latLngToCell } from "h3-js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DATA_DIR = process.env.DATA_DIR || "/mnt/73045be2-d0e5-45dd-9b0c-11f6f42140b3/world_wide_hackathon/montgomery_data";

function readCSV(filename: string): Record<string, string>[] {
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    console.warn(`  ⚠ File not found: ${filename}`);
    return [];
  }
  const content = readFileSync(filepath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

function toFloat(val: string | undefined): number | null {
  if (!val || val === "" || val === "NA") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toInt(val: string | undefined): number | null {
  if (!val || val === "" || val === "NA") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toBigInt(val: string | undefined): bigint | null {
  if (!val || val === "" || val === "NA") return null;
  try { return BigInt(val); } catch { return null; }
}

function toH3(lat: number | null, lng: number | null, res: number = 7): string | null {
  if (!lat || !lng || lat === 0 || lng === 0) return null;
  // Validate rough Montgomery area (-87 to -86, 32 to 33)
  if (lng < -88 || lng > -85 || lat < 31 || lat > 34) return null;
  try {
    return latLngToCell(lat, lng, res);
  } catch {
    return null;
  }
}

async function seedIncidents() {
  console.log("🔥 Seeding incidents (Fire_Rescue_All_Incidents)...");
  const rows = readCSV("Fire_Rescue_All_Incidents.csv");
  console.log(`   Found ${rows.length} rows`);

  const batch = rows.map((r) => {
    const lat = toFloat(r.Latitude);
    const lng = toFloat(r.Longitude);
    return {
      incidentNumber: r.Incident_Number || null,
      incidentTypeCode: r.Incident_Type_Code || null,
      incidentType: r.Incident_Type || null,
      incidentCategory: r.Incident_Type_Category || null,
      address: r.Location_Street_Address || null,
      district: r.District || null,
      shift: r.Shift || null,
      latitude: lat,
      longitude: lng,
      h3Index: toH3(lat, lng, 7),
      unitName: r.Unit_Name || null,
      agencyName: r.Agency_Name || null,
      cancelledPrior: r.Cancelled_Prior_To_Arrival || null,
      dispatchTime: r.Time_in_Unit_Dispatched_DateTime || null,
      turnoutTime: r.Unit_Turnout_Time || null,
      travelTime: r.Unit_Travel_Time || null,
      responseTime: r.Unit_Response_Time || null,
      poapReceivedTs: toBigInt(r.Days_in_PSAP_Received_DateTime),
      unitDispatchedTs: toBigInt(r.Days_in_Unit_Dispatched_DateTime),
      unitEnrouteTs: toBigInt(r.Days_in_Unit_Enroute_DateTime),
      unitArrivalTs: toBigInt(r.Days_in_Unit_Arrival_Time),
      unitClearedTs: toBigInt(r.Days_in_Unit_Cleared_Scene_DateTime),
    };
  });

  // Insert in chunks
  for (let i = 0; i < batch.length; i += 500) {
    await prisma.incident.createMany({ data: batch.slice(i, i + 500), skipDuplicates: true });
    process.stdout.write(`   ${Math.min(i + 500, batch.length)}/${batch.length}\r`);
  }
  console.log(`   ✅ ${batch.length} incidents seeded`);
}

async function seed911Calls() {
  console.log("📞 Seeding 911 calls...");
  const rows = readCSV("911_Calls.csv");
  const batch = rows.map((r) => ({
    year: toInt(r.Year),
    month: r.Month || null,
    callCategory: r.Call_Category || null,
    phoneServiceType: r.Phone_Service_Provider_Type || null,
    callCountByPhone: toInt(r.Call_Count_by_Phone_Service_Pro),
    callOrigin: r.Call_Origin || null,
    callCountByOrigin: toInt(r.Call_Count_By_Origin),
  }));
  await prisma.call911.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} calls seeded`);
}

async function seedPoliceStations() {
  console.log("🚔 Seeding police & fire stations...");
  const rows = readCSV("Fire_Police.csv");
  const police = rows.filter((r) => (r.category || "").toLowerCase().includes("police"));
  const fire = rows.filter((r) => (r.category || "").toLowerCase().includes("fire"));

  if (police.length > 0) {
    await prisma.policeStation.createMany({
      data: police.map((r) => ({
        address: r.Address || null,
        name: r.Facility_Name || null,
        category: r.category || null,
        latitude: toFloat(r.Y),
        longitude: toFloat(r.X),
      })),
      skipDuplicates: true,
    });
  }
  if (fire.length > 0) {
    await prisma.fireStation.createMany({
      data: fire.map((r) => ({
        address: r.Address || null,
        name: r.Facility_Name || null,
        category: r.category || null,
        latitude: toFloat(r.Y),
        longitude: toFloat(r.X),
      })),
      skipDuplicates: true,
    });
  }
  console.log(`   ✅ ${police.length} police + ${fire.length} fire stations seeded`);
}

async function seedSchools() {
  console.log("🏫 Seeding schools...");
  const rows = readCSV("School.csv");
  const batch = rows.map((r) => ({
    name: r.NAME || null,
    address: r.Address || null,
    city: r.City || null,
    telephone: r.TELEPHONE || null,
    zip: r.ZIP || null,
    enrollment: toInt(r.ENRLMT) || toInt(r.Enroll),
    level: r.Level_ || null,
    schoolType: r.SchoolType || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.school.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} schools seeded`);
}

async function seedCommunityCenters() {
  console.log("🏠 Seeding community centers...");
  const rows = readCSV("Community_Centers.csv");
  const batch = rows.map((r) => ({
    facilityId: r.FACILITYID || null,
    name: r.FACILITYID || r.FULLADDR || null,
    address: r.FULLADDR || null,
    operDays: r.OPERDAYS || null,
    operHours: r.OPERHOURS || null,
    facilityType: r.FACILITYTYPE || null,
    description: r.Description || null,
    parking: toInt(r.NUMPARKING),
    restroom: r.RESTROOM || null,
    adaComply: r.ADACOMPLY || null,
    playground: r.PLAYGROUND || null,
    basketball: r.BASKETBALL || null,
    swimming: r.SWIMMING || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.communityCenter.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} community centers seeded`);
}

async function seedParks() {
  console.log("🌳 Seeding parks...");
  const rows = readCSV("Parks___Trails.csv");
  const batch = rows.map((r) => ({
    facilityId: r.FACILITYID || null,
    name: r.FACILITYID || null,
    type: r.Type || null,
    address: r.FULLADDR || null,
    operDays: r.OPERDAYS || null,
    operHours: r.OPERHOURS || null,
    parkArea: toFloat(r.PARKAREA),
    parkUrl: r.PARKURL || null,
    playground: r.PLAYGROUND || null,
    basketball: r.BASKETBALL || null,
    soccer: r.SOCCER || null,
    baseball: r.BASEBALL || null,
    softball: r.SOFTBALL || null,
    tennis: r.TENNIS || null,
    hiking: r.HIKING || null,
    fishing: r.FISHING || null,
    swimming: r.SWIMMING || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.park.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} parks seeded`);
}

async function seedLibraries() {
  console.log("📚 Seeding libraries...");
  const rows = readCSV("Libraries.csv");
  const batch = rows.map((r) => ({
    branchName: r.BRANCH_NAME || null,
    address: r.ADDRESS || null,
    latitude: null as number | null,
    longitude: null as number | null,
  }));
  await prisma.library.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} libraries seeded`);
}

async function seedNuisances() {
  console.log("🚮 Seeding nuisances...");
  const rows = readCSV("Nuisance.csv");
  const batch = rows.map((r) => ({
    offenseNo: r.OffenseNo || null,
    location: r.Location || null,
    remark: r.Remark || null,
    parcelNo: r.ParcelNo || null,
    type: r.Type || null,
    date: toBigInt(r.Date),
    district: r.District || null,
    hearingDate: r.HearingDate || null,
  }));

  for (let i = 0; i < batch.length; i += 500) {
    await prisma.nuisance.createMany({ data: batch.slice(i, i + 500), skipDuplicates: true });
    process.stdout.write(`   ${Math.min(i + 500, batch.length)}/${batch.length}\r`);
  }
  console.log(`   ✅ ${batch.length} nuisances seeded`);
}

async function seedCodeViolations() {
  console.log("⚠️ Seeding code violations...");
  const rows = readCSV("Code_Violations.csv");
  const batch = rows.map((r) => {
    const lat = toFloat(r.ParcelNo_Y);
    const lng = toFloat(r.ParcelNo_X);
    // These are sometimes in state plane coordinates, check for reasonable WGS84
    const realLat = lat && lat > 30 && lat < 35 ? lat : null;
    const realLng = lng && lng < -80 && lng > -90 ? lng : null;
    return {
      offenseNum: r.OffenceNum || null,
      caseDate: r.CaseDate || null,
      caseType: r.CaseType || null,
      caseStatus: r.CaseStatus || null,
      lienStatus: r.LienStatus || null,
      parcelNo: r.ParcelNo || null,
      councilDistrict: r.CouncilDistrict || null,
      address: r.Address1 || null,
      year: toInt(r.Year),
      month: toInt(r.Month),
      latitude: realLat,
      longitude: realLng,
      h3Index: toH3(realLat, realLng, 8),
    };
  });
  await prisma.codeViolation.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} code violations seeded`);
}

async function seedCityOwnedProperties() {
  console.log("🏗️ Seeding city-owned properties...");
  const rows = readCSV("City_Owned_Properties.csv");
  const batch = rows.map((r) => ({
    calcAcre: toFloat(r.CALC_ACRE),
    parcelNum: r.PARCEL_NUM || null,
    owner: r.OWNER1_1 || null,
    propAddress: r.PROP_ADDRE || null,
    streetNum: r.STREET_NUM || null,
    streetName: r.STREET_NAM || null,
    neighborhood: r.NBHD || null,
    zoning: r.ZONING || null,
    appraisedVal: toFloat(r.APPRAISED_),
    useType: r.Use_ || null,
    devArea: r.Dev_Area || null,
    maintBy: r.Maint_By || null,
    notes: r.NOTES || null,
    latitude: null as number | null,
    longitude: null as number | null,
  }));
  await prisma.cityOwnedProperty.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} city-owned properties seeded`);
}

async function seedServiceRequests() {
  console.log("📋 Seeding 311 service requests...");
  const rows = readCSV("Received_311_Service_Requests.csv");
  const batch = rows.map((r) => {
    const lat = toFloat(r.Latitude);
    const lng = toFloat(r.Longitude);
    return {
      requestId: r.Request_ID || null,
      createDate: r.Create_Date || null,
      department: r.Department || null,
      requestType: r.Request_Type || null,
      address: r.Address || null,
      district: r.District || null,
      status: r.Status || null,
      closeDate: r.Close_Date || null,
      origin: r.Origin || null,
      latitude: lat,
      longitude: lng,
      year: toInt(r.Year),
      h3Index: toH3(lat, lng, 8),
    };
  });
  await prisma.serviceRequest311.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} service requests seeded`);
}

async function seedConstructionPermits() {
  console.log("🏗️ Seeding construction permits...");
  const rows = readCSV("Construction_Permit_Data.csv");
  console.log(`   Found ${rows.length} rows`);

  const batch = rows.map((r) => ({
    permitNo: r.PermitNo || null,
    parcelNo: r.ParcelNo || null,
    issuedDate: r.IssuedDate || null,
    expiredDate: r.ExpiredDate || null,
    permitStatus: r.PermitStatus || null,
    permitCode: r.PermitCode || null,
    zoning: r.Zoning || null,
    floodZone: r.FloodZone || null,
    permitDescription: r.PermitDescription || null,
    projectType: r.ProjectType || null,
    estimatedCost: toFloat(r.EstimatedCost),
    totalFee: toFloat(r.Total_Fee),
    ownerName: r.OwnerName || null,
    useType: r.UseType || null,
    jobDescription: (r.JobDescription || "").slice(0, 5000),
    year: toInt(r.Year),
    month: toInt(r.Month),
    districtCouncil: r.DistrictCouncil || null,
    contractorName: r.ContractorName || null,
    physicalAddress: r.PhysicalAddress || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));

  for (let i = 0; i < batch.length; i += 500) {
    await prisma.constructionPermit.createMany({ data: batch.slice(i, i + 500), skipDuplicates: true });
    process.stdout.write(`   ${Math.min(i + 500, batch.length)}/${batch.length}\r`);
  }
  console.log(`   ✅ ${batch.length} construction permits seeded`);
}

async function seedBusinessLicenses() {
  console.log("💼 Seeding business licenses...");
  const rows = readCSV("Business_License.csv");
  const batch = rows.map((r) => ({
    companyName: r.custCOMPANY_NAME || null,
    dba: r.custDBA || null,
    pvYear: toInt(r.pvYEAR),
    pvEffDate: r.pvEFFDATE || null,
    pvExpire: r.pvEXPIRE || null,
    scCode: r.scCODE || null,
    scName: r.scNAME || null,
    pvDesc: r.pvscDESC || null,
    fullAddress: r.Full_Address || null,
    zip: r.addrZIP_MAIL || null,
    city: r.addrCITY_MAIL || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.businessLicense.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} business licenses seeded`);
}

async function seedPopulationTrends() {
  console.log("📊 Seeding daily population trends...");
  const rows = readCSV("Daily_Population_Trends.csv");
  const batch = rows.map((r) => ({
    date: r.Date || null,
    type: r.Type || null,
    currentYear: toInt(r.Current_Year),
    previousYear: toInt(r.Previous_Year),
  }));
  await prisma.dailyPopulationTrend.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} population trends seeded`);
}

async function seedFoodScores() {
  console.log("🍔 Seeding food scores...");
  const rows = readCSV("Food_Scores.csv");
  const batch = rows.map((r) => ({
    establishment: r.Establishment || null,
    address: r.Capital || null,
    date: r.Date || null,
    score: toInt(r.Score_1),
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.foodScore.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} food scores seeded`);
}

async function seedCouncilDistricts() {
  console.log("🗳️ Seeding council districts...");
  const rows = readCSV("Council_District_2024.csv");
  const batch = rows.map((r) => ({
    distId: toInt(r.Id),
    name: r.Name || null,
    phone: r.Phone || null,
    email: r.Email || null,
    address: r.Address || null,
    link: r.Link || null,
  }));
  await prisma.councilDistrict.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} council districts seeded`);
}

async function seedDayCares() {
  console.log("👶 Seeding daycares...");
  const rows = readCSV("DayCare.csv");
  const batch = rows.map((r) => ({
    name: r.Name || r.FACILITYID || null,
    address: r.Address || r.FULLADDR || null,
    city: r.City || null,
    zip: r.ZIP || null,
    latitude: toFloat(r.Y),
    longitude: toFloat(r.X),
  }));
  await prisma.dayCare.createMany({ data: batch, skipDuplicates: true });
  console.log(`   ✅ ${batch.length} daycares seeded`);
}

async function seedUsers() {
  console.log("👤 Seeding default users (PRD personas)...");
  const hash = await bcrypt.hash("Montgomery2026!", 12);

  const users = [
    // EXECUTIVE tier
    {
      email: "mayor@montgomeryal.gov",
      passwordHash: hash,
      name: "Mayor Steven Reed",
      role: "EXECUTIVE" as const,
      title: "Mayor",
      department: "Executive Office",
      modules: ["sentinel", "youthshield", "blight", "compass"],
    },
    {
      email: "tporterfield@montgomeryal.gov",
      passwordHash: hash,
      name: "Dr. Tony Porterfield",
      role: "EXECUTIVE" as const,
      title: "CTO",
      department: "Technology",
      modules: ["sentinel", "youthshield", "blight", "compass"],
    },
    {
      email: "council4@montgomeryal.gov",
      passwordHash: hash,
      name: "Council Member District 4",
      role: "EXECUTIVE" as const,
      title: "Council Member",
      department: "City Council",
      district: "4",
      modules: ["sentinel", "youthshield", "blight", "compass"],
    },
    // OPERATIONAL tier
    {
      email: "shift.commander@mpd.montgomeryal.gov",
      passwordHash: hash,
      name: "Shift Commander",
      role: "OPERATIONAL" as const,
      title: "Patrol Supervisor",
      department: "MPD",
      modules: ["sentinel"],
    },
    {
      email: "moses.harper@soop.org",
      passwordHash: hash,
      name: "Moses Harper",
      role: "OPERATIONAL" as const,
      title: "SOOP Founder / CVI Worker",
      department: "Community Violence Intervention",
      modules: ["youthshield"],
    },
    {
      email: "code.enforcement@montgomeryal.gov",
      passwordHash: hash,
      name: "Code Enforcement Officer",
      role: "OPERATIONAL" as const,
      title: "Code Enforcement Officer",
      department: "City Planning",
      modules: ["blight"],
    },
    {
      email: "bbaken@alasu.edu",
      passwordHash: hash,
      name: "Bren Baken",
      role: "OPERATIONAL" as const,
      title: "AVP Planning",
      department: "Alabama State University",
      modules: ["compass"],
    },
    {
      email: "counselor@mps.edu",
      passwordHash: hash,
      name: "School Counselor",
      role: "OPERATIONAL" as const,
      title: "School Counselor",
      department: "Montgomery Public Schools",
      modules: ["youthshield"],
    },
    {
      email: "planning@montgomeryal.gov",
      passwordHash: hash,
      name: "Planning Director",
      role: "OPERATIONAL" as const,
      title: "Planning Director",
      department: "Economic Development",
      modules: ["compass", "blight"],
    },
    // CITIZEN tier
    {
      email: "citizen@montgomery.example",
      passwordHash: hash,
      name: "Montgomery Resident",
      role: "CITIZEN" as const,
      title: null,
      department: null,
      modules: [] as string[],
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`   ✅ ${users.length} users seeded (password: Montgomery2026!)`);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Montgomery Command Center — Database Seeder");
  console.log(`  Data directory: ${DATA_DIR}`);
  console.log("═══════════════════════════════════════════════════════\n");

  try {
    // Clear existing data
    console.log("🗑️ Clearing existing data...");
    await prisma.$transaction([
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
      prisma.aiAnalysis.deleteMany(),
      prisma.executiveBriefing.deleteMany(),
      prisma.crossModuleAlert.deleteMany(),
      prisma.forceMultiplierZone.deleteMany(),
      prisma.blightScore.deleteMany(),
      prisma.youthRiskZone.deleteMany(),
      prisma.incident.deleteMany(),
      prisma.call911.deleteMany(),
      prisma.policeStation.deleteMany(),
      prisma.fireStation.deleteMany(),
      prisma.school.deleteMany(),
      prisma.communityCenter.deleteMany(),
      prisma.park.deleteMany(),
      prisma.library.deleteMany(),
      prisma.dayCare.deleteMany(),
      prisma.nuisance.deleteMany(),
      prisma.codeViolation.deleteMany(),
      prisma.cityOwnedProperty.deleteMany(),
      prisma.serviceRequest311.deleteMany(),
      prisma.constructionPermit.deleteMany(),
      prisma.businessLicense.deleteMany(),
      prisma.dailyPopulationTrend.deleteMany(),
      prisma.foodScore.deleteMany(),
      prisma.councilDistrict.deleteMany(),
      prisma.pointOfInterest.deleteMany(),
      prisma.educationFacility.deleteMany(),
    ]);
    console.log("   ✅ Cleared\n");

    // Seed in logical order
    await seedUsers();
    await seedIncidents();
    await seed911Calls();
    await seedPoliceStations();
    await seedSchools();
    await seedCommunityCenters();
    await seedParks();
    await seedLibraries();
    await seedDayCares();
    await seedNuisances();
    await seedCodeViolations();
    await seedCityOwnedProperties();
    await seedServiceRequests();
    await seedConstructionPermits();
    await seedBusinessLicenses();
    await seedPopulationTrends();
    await seedFoodScores();
    await seedCouncilDistricts();

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  ✅ Seeding complete!");
    console.log("═══════════════════════════════════════════════════════");
  } catch (e) {
    console.error("❌ Seed error:", e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
