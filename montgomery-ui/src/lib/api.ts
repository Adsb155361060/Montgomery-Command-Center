const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('mcc_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch { /* ignore parse errors */ }

    // Auto-logout on 401 — token expired or invalid
    if (res.status === 401) {
      localStorage.removeItem('mcc_token');
      localStorage.removeItem('mcc_user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    throw new ApiError(msg, res.status);
  }

  const json = await res.json();
  // The API returns { success, data, ... } — unwrap when present
  if (json && typeof json === 'object' && 'success' in json) {
    if (!json.success) throw new ApiError(json.error || 'Unknown error', res.status);
    return json as T;
  }
  return json as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
export const auth = {
  login: (email: string, password: string) =>
    post<{ data: { user: import('@/types').User; token: string } }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    post<{ data: { user: import('@/types').User; token: string } }>('/auth/register', data),
  me: () => get<{ data: { user: import('@/types').User } }>('/auth/me'),
  updateProfile: (data: Record<string, string>) =>
    post<{ data: { user: import('@/types').User } }>('/auth/me', data),
  logout: () => post<{ data: { message: string } }>('/auth/logout'),
  users: () => get<{ data: { users: import('@/types').User[]; total: number } }>('/auth/users'),
};

// ═══════════════════════════════════════
// COMMAND (Cross-Module)
// ═══════════════════════════════════════
export const command = {
  dashboard: (district?: string) =>
    get<{ data: import('@/types').DashboardData }>(`/command/dashboard${district ? `?district=${district}` : ''}`),
  alerts: (params?: { page?: number; limit?: number; severity?: string; module?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.severity) q.set('severity', params.severity);
    if (params?.module) q.set('module', params.module);
    const qs = q.toString();
    return get<{ data: import('@/types').CrossModuleAlert[]; meta: import('@/types').PaginationMeta }>(`/command/alerts${qs ? `?${qs}` : ''}`);
  },
  generateAlerts: () =>
    post<{ data: { alerts: number; message: string } }>('/command/alerts'),
  briefing: () =>
    get<{ data: import('@/types').ExecutiveBriefing }>('/command/briefing'),
  generateBriefing: () =>
    post<{ data: import('@/types').ExecutiveBriefing }>('/command/briefing'),
};

// ═══════════════════════════════════════
// SENTINEL
// ═══════════════════════════════════════
export const sentinel = {
  stats: (district?: string) =>
    get<{ data: import('@/types').SentinelStats }>(`/sentinel/stats${district ? `?district=${district}` : ''}`),
  incidents: (params?: { page?: number; limit?: number; district?: string; type?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.type) q.set('type', params.type);
    if (params?.category) q.set('category', params.category);
    return get<{ data: import('@/types').Incident[]; meta: import('@/types').PaginationMeta }>(`/sentinel/incidents?${q.toString()}`);
  },
  forceMultiplier: (params?: { page?: number; limit?: number; district?: string; shift?: string; riskLevel?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.shift) q.set('shift', params.shift);
    if (params?.riskLevel) q.set('riskLevel', params.riskLevel);
    return get<{ data: import('@/types').ForceMultiplierZone[]; meta: import('@/types').PaginationMeta }>(`/sentinel/force-multiplier?${q.toString()}`);
  },
  generateForceMultiplier: () =>
    post<{ data: { zones: number; message: string } }>('/sentinel/force-multiplier'),
  deployment: (data?: { officerCount?: number; shift?: string; district?: string }) =>
    post<{ data: import('@/types').DeploymentResult }>('/sentinel/deployment', data || {}),
  compliance: () =>
    get<{ data: import('@/types').ComplianceData }>('/sentinel/compliance'),
  complianceScenario: (params: Record<string, unknown>) =>
    post<{ data: Record<string, unknown> }>('/sentinel/compliance', params),
  recruitmentROI: (data?: { district?: string; shift?: string; additionalOfficers?: number }) =>
    post<{ data: import('@/types').RecruitmentROI }>('/sentinel/recruitment-roi', data || {}),
  analyze: (data: { analysisType: string; query: string; district?: string }) =>
    post<{ data: { analysis: string; model: string; id: string } }>('/sentinel/analyze', data),
};

// ═══════════════════════════════════════
// YOUTHSHIELD
// ═══════════════════════════════════════
export const youthshield = {
  stats: () =>
    get<{ data: import('@/types').YouthShieldStats }>('/youthshield/stats'),
  riskZones: (params?: { page?: number; limit?: number; district?: string; riskLevel?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.riskLevel) q.set('riskLevel', params.riskLevel);
    return get<{ data: import('@/types').YouthRiskZone[]; meta: import('@/types').PaginationMeta }>(`/youthshield/risk-zones?${q.toString()}`);
  },
  generateRiskZones: () =>
    post<{ data: { zones: number; message: string } }>('/youthshield/risk-zones'),
  gapAnalysis: (params?: { district?: number } | string) => {
    const d = typeof params === 'string' ? params : params?.district;
    return get<{ data: import('@/types').GapAnalysis }>(`/youthshield/gap-analysis${d ? `?district=${d}` : ''}`);
  },
  resources: (params?: { type?: string; page?: number; limit?: number } | string) => {
    const q = new URLSearchParams();
    if (typeof params === 'string') { q.set('type', params); }
    else if (params) { if (params.type) q.set('type', params.type); if (params.page) q.set('page', String(params.page)); if (params.limit) q.set('limit', String(params.limit)); }
    const qs = q.toString();
    return get<{ data: Record<string, unknown[]> & { summary: Record<string, number> } }>(`/youthshield/resources${qs ? `?${qs}` : ''}`);
  },
  intervention: (data?: { zoneH3?: string; interventionType?: string }) =>
    post<{ data: import('@/types').InterventionResult }>('/youthshield/intervention', data || {}),
};

// ═══════════════════════════════════════
// BLIGHT
// ═══════════════════════════════════════
export const blight = {
  stats: () =>
    get<{ data: import('@/types').BlightStats }>('/blight/stats'),
  nuisances: (params?: { page?: number; limit?: number; district?: string; type?: string; location?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.type) q.set('type', params.type);
    if (params?.location) q.set('location', params.location);
    return get<{ data: import('@/types').Nuisance[]; meta: import('@/types').PaginationMeta }>(`/blight/nuisances?${q.toString()}`);
  },
  violations: (params?: { page?: number; limit?: number; district?: string; status?: string; caseType?: string; address?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.status) q.set('status', params.status);
    if (params?.caseType) q.set('caseType', params.caseType);
    if (params?.address) q.set('address', params.address);
    return get<{ data: import('@/types').CodeViolation[]; meta: import('@/types').PaginationMeta }>(`/blight/violations?${q.toString()}`);
  },
  properties: (params?: { page?: number; limit?: number; zoning?: string; district?: number; neighborhood?: string; address?: string; maintBy?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.zoning) q.set('zoning', params.zoning);
    if (params?.district) q.set('district', String(params.district));
    if (params?.neighborhood) q.set('neighborhood', params.neighborhood);
    if (params?.address) q.set('address', params.address);
    if (params?.maintBy) q.set('maintBy', params.maintBy);
    return get<{ data: import('@/types').CityOwnedProperty[]; meta: import('@/types').PaginationMeta }>(`/blight/properties?${q.toString()}`);
  },
  scores: (params?: { page?: number; limit?: number; district?: string; minScore?: number; riskLevel?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.minScore) q.set('minScore', String(params.minScore));
    if (params?.riskLevel) q.set('riskLevel', params.riskLevel);
    return get<{ data: import('@/types').BlightScore[]; meta: import('@/types').PaginationMeta }>(`/blight/scores?${q.toString()}`);
  },
  generateScores: () =>
    post<{ data: { scored: number; message: string } }>('/blight/scores'),
  contagion: (data?: { parcelNo?: string; district?: string; h3Index?: string; months?: number }) =>
    post<{ data: import('@/types').ContagionResult }>('/blight/contagion', data || {}),
  regeneration: (data?: { parcelNo?: string; district?: string; count?: number; censusTract?: string }) =>
    post<{ data: import('@/types').RegenerationBlueprint[] }>('/blight/regeneration', data || {}),
};

// ═══════════════════════════════════════
// COMPASS
// ═══════════════════════════════════════
export const compass = {
  stats: () =>
    get<{ data: import('@/types').CompassStats }>('/compass/stats'),
  permits: (params?: { page?: number; limit?: number; district?: string; projectType?: string; year?: number; status?: string; address?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.district) q.set('district', params.district);
    if (params?.projectType) q.set('projectType', params.projectType);
    if (params?.year) q.set('year', String(params.year));
    if (params?.status) q.set('status', params.status);
    if (params?.address) q.set('address', params.address);
    return get<{ data: import('@/types').ConstructionPermit[]; meta: import('@/types').PaginationMeta }>(`/compass/permits?${q.toString()}`);
  },
  impact: () =>
    get<{ data: import('@/types').ImpactDashboard }>('/compass/impact'),
  scenario: (data: Record<string, unknown> | string) =>
    post<{ data: import('@/types').ScenarioResult }>('/compass/scenario', typeof data === 'string' ? { scenario: data } : data),
  cba: (data?: Record<string, unknown>) =>
    post<{ data: import('@/types').CBAResult }>('/compass/cba', data || {}),
};

// ═══════════════════════════════════════
// AI
// ═══════════════════════════════════════
export const ai = {
  chat: (data: { message: string; module?: string; context?: string } | string, module?: string, context?: string) =>
    post<{ data: import('@/types').AiChatResponse }>('/ai/chat', typeof data === 'string' ? { message: data, module, context } : data),
  aiStats: () =>
    get<{ data: import('@/types').AiStats }>('/ai/stats'),
};

// ═══════════════════════════════════════
// GEO
// ═══════════════════════════════════════
export const geo = {
  lookup: (data: { address: string } | string) => {
    const addr = typeof data === 'string' ? data : data.address;
    return get<{ data: import('@/types').GeoLookupResult }>(`/geo/lookup?address=${encodeURIComponent(addr)}`);
  },
  districts: () =>
    get<{ data: import('@/types').CouncilDistrict[] }>('/geo/districts'),
};

// ═══════════════════════════════════════
// CITIZEN
// ═══════════════════════════════════════
export const citizen = {
  overview: () =>
    get<{ data: import('@/types').CitizenOverview }>('/citizen/overview'),
};

// ═══════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════
export const health = {
  check: () => get<{ data: Record<string, unknown> }>('/health'),
};

export { ApiError };
export default { auth, command, sentinel, youthshield, blight, compass, ai, geo, citizen, health };
