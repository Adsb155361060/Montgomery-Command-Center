// Auth Types
export type Role = 'EXECUTIVE' | 'OPERATIONAL' | 'CITIZEN';
export type Module = 'sentinel' | 'youthshield' | 'blight' | 'compass';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  title?: string;
  department?: string;
  district?: string;
  modules: Module[];
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface SentinelStats {
  totalIncidents: number;
  incidentsByType: { type: string; count: number }[];
  criticalZones: number;
  policeStations: number;
  total911Calls: number;
  byDistrict: { district: string; count: number }[];
  compliance: { officers: number; required: number; gap: number; status: string };
}

export interface Incident {
  id: string;
  incidentType: string;
  category?: string;
  h3Index?: string;
  lat?: number;
  lng?: number;
  incidentDate: string;
  address?: string;
  description?: string;
  district?: string;
}

export interface ForceMultiplierZone {
  id: string;
  h3Index: string;
  district?: string;
  shift?: string;
  preventionScore: number;
  incidentCount: number;
  nuisanceCount: number;
  calculatedAt: string;
}

export interface DeploymentResult {
  assignments: { district: string; officers: number; coverage: number; station?: string }[];
  totalCoverage: number;
  gapZones: string[];
  recommendations: string[];
}

export interface ComplianceData {
  current: { officers: number; required: number; population: number; ratio: number; gap: number; status: string };
  projections: { year: number; officers: number; compliant: boolean }[];
  sb298: Record<string, unknown>;
}

export interface YouthStats {
  facilities: { schools: number; communityCenters: number; parks: number; libraries: number; daycares: number; total: number };
  riskAssessment: Record<string, unknown>;
  keyMetrics: Record<string, unknown>;
}

export interface RiskZone {
  id: string;
  h3Index: string;
  district?: string;
  riskScore: number;
  gapScore: number;
  populationDensity?: number;
  incidentCount?: number;
  calculatedAt: string;
}

export interface GapAnalysis {
  gapZones: { h3Index: string; district?: string; gapHours: number; nearestCenter?: string }[];
  summary: { totalGapZones: number; worstDistrict: string; avgGapHours: number; centersClosingBefore6PM: number };
  recommendations: string[];
}

export interface BlightStats {
  totals: { nuisances: number; codeViolations: number; cityOwnedProperties: number; serviceRequests311: number };
  blightAnalysis: Record<string, unknown>;
  nuisanceByDistrict: { district: string; count: number }[];
  violationsByStatus: { status: string; count: number }[];
}

export interface BlightScore {
  id: string;
  parcelNo: string;
  address?: string;
  district?: string;
  blightScore: number;
  violationCount: number;
  nuisanceCount: number;
  lienStatus?: string;
  calculatedAt: string;
}

export interface Nuisance {
  id: string;
  nuisanceType: string;
  description?: string;
  address?: string;
  district?: string;
  reportedDate?: string;
  status?: string;
}

export interface CodeViolation {
  id: string;
  caseNumber?: string;
  violationType?: string;
  address?: string;
  district?: string;
  status?: string;
  openedDate?: string;
  lienAmount?: number;
}

export interface CityProperty {
  id: string;
  parcelNo: string;
  address?: string;
  district?: string;
  acreage?: number;
  zoning?: string;
  maintainedBy?: string;
}

export interface CompassStats {
  construction: { totalPermits: number; totalEstimatedCost: number; byType: { type: string; count: number }[] };
  economy: { activeBusinessLicenses: number; avgFoodScore: number };
  majorProjects: Record<string, unknown>;
  populationTrends: { date: string; population: number; visitors: number }[];
}

export interface Permit {
  id: string;
  permitNumber?: string;
  projectType?: string;
  description?: string;
  address?: string;
  district?: string;
  estimatedCost?: number;
  status?: string;
  issueDate?: string;
}

export interface CommandDashboard {
  timestamp: string;
  district?: string;
  sentinel: Record<string, unknown>;
  youthshield: Record<string, unknown>;
  blight: Record<string, unknown>;
  compass: Record<string, unknown>;
  crossModule: { recentAlerts: number; alerts: Alert[] };
}

export interface Alert {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  module?: string;
  generatedAt: string;
  isRead?: boolean;
}

export interface Briefing {
  id?: string;
  title: string;
  content: string;
  sentinelSummary?: string;
  youthShieldSummary?: string;
  blightSummary?: string;
  compassSummary?: string;
  crossModuleInsights?: string;
  generatedBy?: string;
  createdAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIStats {
  currentSession: Record<string, unknown>;
  totalAnalyses: { model: string; count: number }[];
  analysesByModule: { module: string; count: number }[];
  availableModels: Record<string, unknown>;
}

export interface District {
  id: string;
  name: string;
  districtNumber?: number;
  population?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
