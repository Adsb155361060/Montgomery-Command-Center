// ── User & Auth ──
export type UserRole = 'EXECUTIVE' | 'OPERATIONAL' | 'CITIZEN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  department?: string;
  district?: string;
  modules: string[];
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ── API Response ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── Command / Dashboard ──
export interface DashboardData {
  timestamp: string;
  district: string;
  sentinel: {
    totalIncidents: number;
    criticalZones: number;
    officerCount: number;
    requiredOfficers: number;
    complianceRatio: number;
    status: string;
  };
  youthshield: {
    highRiskZones: number;
    schools: number;
    communityCenters: number;
    dangerWindow: string;
    keyMetric: string;
  };
  blight: {
    nuisances: number;
    codeViolations: number;
    cityOwnedProperties: number;
    criticalParcels: number;
  };
  compass: {
    constructionPermits: number;
    totalInvestment: number;
    activeBusinesses: number;
    majorProjectsTotal: string;
  };
  crossModule: {
    recentAlerts: number;
    alerts: CrossModuleAlert[];
  };
}

export interface CrossModuleAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  modules: string[];
  district?: string;
  recommendation?: string;
  createdAt: string;
}

export interface ExecutiveBriefing {
  id: string;
  title: string;
  content: string;
  sentinelSummary: string;
  youthShieldSummary: string;
  blightSummary: string;
  compassSummary: string;
  crossModuleInsights: string;
  generatedBy: string;
  createdAt: string;
}

// ── Sentinel ──
export interface SentinelStats {
  totalIncidents: number;
  incidentsByType: Array<{ type: string; count: number }>;
  criticalZones: number;
  policeStations: number;
  total911Calls: number;
  byDistrict: Array<{ district: string; count: number }>;
  compliance: {
    currentOfficers: number;
    requiredOfficers: number;
    ratio: number;
    status: string;
  };
}

export interface Incident {
  id: string;
  incidentNumber?: string;
  type: string;
  category?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  date?: string;
  h3Index?: string;
  [key: string]: unknown;
}

export interface ForceMultiplierZone {
  id: string;
  h3Index: string;
  riskScore: number;
  multiplierEffect: number;
  shift: string;
  district?: string;
  incidentCount: number;
  recommendation?: string;
  [key: string]: unknown;
}

export interface DeploymentAssignment {
  officerId: string;
  zone: string;
  district: string;
  priority: string;
  patrolRoute: string;
  estimatedCoverage: number;
}

export interface DeploymentResult {
  assignments: DeploymentAssignment[];
  totalCoverage: number;
  gapZones: string[];
  recommendations: string[];
}

export interface ComplianceData {
  current: {
    officers: number;
    required: number;
    population: number;
    ratio: number;
    requiredRatio: number;
    gap: number;
    compliancePercent: number;
    currentSalary: number;
    firefighterSalary: number;
    salaryGap: number;
    weeklyAttrition: number;
  };
  projections: Array<{
    scenario: string;
    netGainPerMonth: number;
    monthsToCompliance: number;
    projectedDate: string;
    annualCostIncrease: number;
  }>;
  sb298: {
    threshold: string;
    consequence: string;
    status: string;
  };
}

export interface RecruitmentROI {
  district: string;
  additionalOfficers: number;
  projectedIncidentReduction: number;
  projectedIncidentReductionPct: number;
  monthlySavings: number;
  annualSavings: number;
  annualCost: number;
  roi: number;
  breakdownByCategory: Array<{
    category: string;
    currentIncidents: number;
    projectedReduction: number;
    savingsPerIncident: number;
    totalSavings: number;
  }>;
  justification: string;
}

// ── YouthShield ──
export interface YouthShieldStats {
  facilities: {
    schools: number;
    communityCenters: number;
    parks: number;
    libraries: number;
    daycares: number;
    total: number;
  };
  riskAssessment: {
    criticalZones: number;
    highRiskZones: number;
    avgRiskScore: number;
    avgGapScore: number;
  };
  keyMetrics: {
    homicideArrestsUnder21Pct: string;
    dangerWindowHours: string;
    interventionPrograms: number;
    gunViolenceRankNational: string;
  };
}

export interface YouthRiskZone {
  id: string;
  h3Index: string;
  riskScore: number;
  gapScore: number;
  district?: string;
  nearestSchool?: string;
  nearestCenter?: string;
  factors?: string;
  [key: string]: unknown;
}

export interface GapAnalysis {
  gapZones: Array<{
    zone: string;
    district: string;
    gapHours: number;
    nearestCenter: string;
    nearestCenterDistance: string;
    nearestCenterCloses: string;
    recommendation: string;
  }>;
  summary: {
    totalGapZones: number;
    worstDistrict: string;
    avgGapHours: number;
    centersClosingBefore6PM: number;
  };
  recommendations: string[];
}

export interface YouthResource {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  resourceType: string;
  [key: string]: unknown;
}

export interface InterventionResult {
  interventions: Array<{
    zone: string;
    riskScore: number;
    recommendedIntervention: string;
    provider: string;
    deploymentPoint: string;
    distanceToZone: string;
    alternativeProvider: string;
    urgency: string;
    timeSlot: string;
  }>;
  coverageGaps: string[];
  coordinationNotes: string;
}

// ── Blight ──
export interface BlightStats {
  totals: {
    nuisances: number;
    codeViolations: number;
    cityOwnedProperties: number;
    serviceRequests311: number;
  };
  blightAnalysis: {
    criticalParcels: number;
    highSeverityParcels: number;
    avgBlightScore: number;
  };
  nuisanceByDistrict: Array<{ district: string; count: number }>;
  violationsByStatus: Array<{ status: string; count: number }>;
}

export interface Nuisance {
  id: string;
  caseNumber?: string;
  type?: string;
  status?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface CodeViolation {
  id: string;
  violationNumber?: string;
  type?: string;
  status?: string;
  address?: string;
  district?: string;
  [key: string]: unknown;
}

export interface CityOwnedProperty {
  id: string;
  parcelNum?: string;
  address?: string;
  zoning?: string;
  acreage?: number;
  appraisedValue?: number;
  maintBy?: string;
  [key: string]: unknown;
}

export interface BlightScore {
  id: string;
  parcelNum: string;
  address?: string;
  score: number;
  severity: string;
  factors?: string;
  district?: string;
  [key: string]: unknown;
}

export interface ContagionResult {
  contagionZones: Array<{
    parcel: string;
    address: string;
    contagionScore: number;
    affectedNeighbors: number;
    spreadRisk: string;
    remediationImpact: string;
    priority: string;
  }>;
  hotspots: Array<{
    area: string;
    blightDensity: string;
    spreadDirection: string;
    interventionUrgency: string;
  }>;
  positiveSpillover: Array<{
    area: string;
    remediatedParcels: number;
    neighborhoodImprovement: string;
  }>;
  recommendations: string[];
}

export interface RegenerationBlueprint {
  parcelNum: string;
  address: string;
  acreage: number;
  zoning: string;
  recommendations: Array<{
    reuse: string;
    viabilityPct: number;
    estimatedCost: string;
    timeframe: string;
    justification: string;
  }>;
  nearbyContext: string;
  catalyticPotential: string;
}

// ── Compass ──
export interface CompassStats {
  construction: {
    totalPermits: number;
    totalEstimatedCost: number;
    byType: Array<{ type: string; count: number; totalCost: number }>;
  };
  economy: {
    activeBusinessLicenses: number;
    avgFoodScore: number;
  };
  majorProjects: Record<string, {
    investment: number;
    status: string;
    permanentJobs: number;
  }>;
  populationTrends: Array<Record<string, unknown>>;
}

export interface ImpactDashboard {
  totalInvestment: number;
  projects: Array<{
    name: string;
    investment: number;
    constructionJobs: number;
    permanentJobs: number;
    status: string;
    utilityImpact: string;
    housingImpact: string;
    timeline: string;
  }>;
  combinedImpact: {
    totalConstructionJobs: number;
    totalPermanentJobs: number;
    projectedUtilityCostIncrease: string;
    projectedHousingPriceIncrease: string;
    projectedWaterDemandIncrease: string;
    taxRevenueProjection: string;
    trafficImpact: string;
  };
  confidenceIntervals: Record<string, string>;
  keyRisks: string[];
  opportunities: string[];
}

export interface ScenarioResult {
  scenario: string;
  assumptions: string[];
  projections: Record<string, Record<string, string | number>>;
  utilityImpact: Record<string, string>;
  jobImpact: Record<string, string | number>;
  housingImpact: Record<string, string>;
  taxRevenue: Record<string, string>;
  communityBenefit: Record<string, unknown>;
  riskFactors: string[];
  confidenceLevel: string;
  modelUsed: string;
}

export interface CBAResult {
  project: string;
  investmentAmount: number;
  recommendedCBAValue: string;
  components: Array<{
    category: string;
    description: string;
    estimatedValue: string;
    justification: string;
    comparableCity: string;
  }>;
  negotiationPoints: string[];
  taxAbatementAnalysis: Record<string, string>;
  localHiringTargets: Record<string, string>;
  comparableCBAs: Array<{
    city: string;
    project: string;
    cbaValue: string;
    keyTerms: string;
  }>;
}

export interface ConstructionPermit {
  id: string;
  permitNumber?: string;
  projectType?: string;
  address?: string;
  estimatedCost?: number;
  district?: string;
  year?: number;
  [key: string]: unknown;
}

// ── AI ──
export interface AiChatResponse {
  response: string;
  module: string;
  model: string;
}

export interface AiStats {
  currentSession: Record<string, unknown>;
  totalAnalyses: Array<{ model: string; count: number }>;
  analysesByModule: Array<{ module: string; count: number }>;
  availableModels: Record<string, Record<string, unknown>>;
}

// ── Geo ──
export interface GeoLookupResult {
  query: string;
  results: {
    sentinel: { incidents: number; data: Incident[] };
    blight: { nuisances: number; violations: number; properties: number; serviceRequests: number; data: Record<string, unknown[]> };
    compass: { permits: number; businesses: number; data: Record<string, unknown[]> };
    youthshield: { schools: number; centers: number; parks: number; data: Record<string, unknown[]> };
  };
  totalResults: number;
}

export interface CouncilDistrict {
  id: string;
  distId: number;
  name: string;
  council_member?: string;
  [key: string]: unknown;
}
