# Montgomery Command Center — Backend Architecture

## Overview

The Montgomery Command Center API is a **Next.js 15** backend serving 38 RESTful endpoints across 4 domain modules, a cross-module command layer, and a unified authentication system. It powers a city transformation platform for Montgomery, Alabama — integrating public safety, youth violence prevention, urban regeneration, and economic impact intelligence into a single data-driven backend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 24 |
| **Framework** | Next.js 15.5 (App Router, API Routes) |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 6 |
| **AI** | Google Gemini (6 models with intelligent routing) |
| **Auth** | JWT + bcrypt, role-based middleware |
| **Geospatial** | H3 hexagonal grid indexing |
| **Validation** | Zod |
| **Language** | TypeScript (strict mode) |

---

## Directory Structure

```
montgomery-api/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication & user management
│   │   │   ├── login/      # POST — JWT login
│   │   │   ├── register/   # POST — User registration
│   │   │   ├── me/         # GET/POST — Profile
│   │   │   ├── logout/     # POST — Session invalidation
│   │   │   └── users/      # GET — Admin user list (EXECUTIVE only)
│   │   ├── sentinel/       # Module 1: Public Safety
│   │   │   ├── incidents/  # GET — Paginated incident listing
│   │   │   ├── stats/      # GET — Sentinel overview stats
│   │   │   ├── force-multiplier/ # GET/POST — AI force multiplier zones
│   │   │   ├── deployment/ # POST — AI shift deployment optimizer
│   │   │   ├── compliance/ # GET/POST — SB 298 compliance analysis
│   │   │   ├── recruitment-roi/ # POST — AI recruitment ROI modeling
│   │   │   └── analyze/    # POST — General AI analysis
│   │   ├── youthshield/    # Module 2: Youth Violence Prevention
│   │   │   ├── stats/      # GET — YouthShield overview
│   │   │   ├── risk-zones/ # GET/POST — AI youth risk heat map
│   │   │   ├── intervention/ # POST — AI intervention routing
│   │   │   ├── gap-analysis/ # GET — AI after-school gap analyzer
│   │   │   └── resources/  # GET — Community assets & coordination
│   │   ├── blight/         # Module 3: Urban Regeneration
│   │   │   ├── stats/      # GET — Blight overview
│   │   │   ├── scores/     # GET/POST — AI blight severity scoring
│   │   │   ├── regeneration/ # POST — AI regeneration blueprints
│   │   │   ├── contagion/  # POST — AI blight contagion tracker
│   │   │   ├── nuisances/  # GET — Nuisance listing
│   │   │   ├── violations/ # GET — Code violation listing
│   │   │   └── properties/ # GET — City-owned property listing
│   │   ├── compass/        # Module 4: Economic Impact Intelligence
│   │   │   ├── stats/      # GET — Compass overview
│   │   │   ├── impact/     # GET — AI multi-project impact dashboard
│   │   │   ├── scenario/   # POST — AI what-if simulator
│   │   │   ├── cba/        # POST — AI CBA designer
│   │   │   └── permits/    # GET — Construction permit listing
│   │   ├── command/        # Cross-Module Intelligence
│   │   │   ├── dashboard/  # GET — Unified 4-module dashboard
│   │   │   ├── alerts/     # GET/POST — Convergence alert engine
│   │   │   └── briefing/   # GET/POST — AI executive briefing generator
│   │   ├── ai/             # AI Infrastructure
│   │   │   ├── chat/       # POST — Module-aware AI chat
│   │   │   └── stats/      # GET — AI model usage statistics
│   │   ├── geo/            # Geospatial
│   │   │   ├── lookup/     # GET — Address lookup across all modules
│   │   │   └── districts/  # GET — Council district data
│   │   └── health/         # GET — Health check
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── ai.ts               # Multi-model Gemini client with fallback chains
│   ├── auth.ts              # JWT, bcrypt, RBAC utilities
│   ├── db.ts                # Prisma client singleton
│   ├── geo.ts               # H3 hexagonal grid & distance utilities
│   ├── prompts.ts           # System prompts for all AI-powered endpoints
│   └── response.ts          # Standardized API response helpers
├── prisma/
│   └── schema.prisma        # 28 models (data + auth + analytics)
├── scripts/
│   └── seed.ts              # CSV-to-PostgreSQL data ingestion
├── middleware.ts             # RBAC enforcement on all /api routes
├── package.json
├── tsconfig.json
├── next.config.js
└── .env
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                         │
│          React Frontend (separate project)              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / JSON
┌───────────────────────▼─────────────────────────────────┐
│                   MIDDLEWARE                             │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ JWT Decode   │→ │ Expiry   │→ │ RBAC Module Check │  │
│  │ (Header/     │  │ Check    │  │ (Role × Module)   │  │
│  │  Cookie)     │  │          │  │                   │  │
│  └─────────────┘  └──────────┘  └───────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   API ROUTES                            │
│  ┌──────────┐ ┌───────────┐ ┌───────┐ ┌─────────┐     │
│  │ Sentinel │ │YouthShield│ │ Blight│ │ Compass │     │
│  │  7 routes│ │  5 routes │ │7 route│ │ 5 route │     │
│  └────┬─────┘ └─────┬─────┘ └───┬───┘ └────┬────┘     │
│       │              │           │          │           │
│  ┌────▼──────────────▼───────────▼──────────▼────┐     │
│  │           Command Layer (3 routes)            │     │
│  │     Dashboard · Alerts · Executive Briefing   │     │
│  └───────────────────────────────────────────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Auth (5) │ │  AI (2)  │ │ Geo (2)  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  LIB / SERVICES                         │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐ │
│  │ db.ts  │  │ ai.ts  │  │ geo.ts │  │ prompts.ts   │ │
│  │ Prisma │  │ Gemini │  │ H3 hex │  │ Module-aware │ │
│  │ client │  │ multi- │  │ grid   │  │ system       │ │
│  │        │  │ model  │  │ index  │  │ prompts      │ │
│  └───┬────┘  └───┬────┘  └────────┘  └──────────────┘ │
│      │           │                                      │
│  ┌───▼────┐  ┌───▼────────────────────────────────┐    │
│  │ Prisma │  │ Google Gemini API                  │    │
│  │ ORM    │  │ 6 models with intelligent routing  │    │
│  └───┬────┘  └────────────────────────────────────┘    │
└──────┼──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                   DATABASE                              │
│              PostgreSQL 16                              │
│  28 tables · 109K+ seeded rows from Montgomery CSVs    │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication & RBAC

### Three Role Tiers

| Tier | Role | Access Scope |
|---|---|---|
| **Executive** | Mayor, CTO, Council Members | All modules, all methods, user management, executive briefings |
| **Operational** | Shift Commander, CVI Worker, Code Enforcement, School Counselor, Planning Director | Assigned modules only (per-user `modules[]` array) |
| **Citizen** | Public residents | Read-only: stats endpoints, dashboard, geo lookups |

### Auth Flow

```
Client                        Middleware                    Route Handler
  │                              │                              │
  ├─ POST /api/auth/login ──────►│ (public, passes through) ──►│
  │◄── { token, user } ─────────┤◄─── JWT + cookie ────────────┤
  │                              │                              │
  ├─ GET /api/sentinel/stats ───►│                              │
  │  Authorization: Bearer xxx   │─ decode JWT ─►               │
  │                              │─ check expiry ─►             │
  │                              │─ check role vs module ─►     │
  │                              │  EXECUTIVE → pass            │
  │                              │  OPERATIONAL → check modules │
  │                              │  CITIZEN → stats only (GET)  │
  │                              │──────────────────────────────►│
  │◄── { data } ────────────────┤◄──────────────────────────────┤
```

### Public Routes (No Auth Required)
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`

---

## AI Architecture

### Multi-Model Strategy

The backend uses **6 Gemini models** with intelligent routing based on task complexity:

| Model | Use Case | Rate Limit |
|---|---|---|
| **Gemini 2.0 Flash Lite** | Classification, tagging, simple lookups | 4K RPM |
| **Gemini 2.0 Flash** | Standard analysis, data processing | 2K RPM |
| **Gemini 2.5 Flash** | Complex analysis, pattern recognition | 1K RPM |
| **Gemini 3 Flash** | Advanced reasoning, multi-step analysis | 1K RPM |
| **Gemini 2.5 Pro** | Deep strategy, policy recommendations | 150 RPM |
| **Gemini 3 Pro** | Executive briefings, CBA design | 25 RPM |

### Fallback Chain

```
Primary Model → Secondary Model → Tertiary Model
     ↓ (on rate limit or error)
 e.g. Gemini 2.5 Flash → Gemini 2.0 Flash → Gemini 2.0 Flash Lite
```

### AI Task Types

| Method | Complexity | Model Selection |
|---|---|---|
| `AI.classify()` | Low | Flash Lite → Flash 2.0 |
| `AI.analyze()` | Medium | Flash 2.5 → Flash 2.0 → Flash Lite |
| `AI.strategize()` | High | Pro 2.5 → Flash 2.5 → Flash 2.0 |
| `AI.json()` | Medium | Flash 2.5 (structured output) |
| `AI.deepJson()` | High | Pro 2.5 (structured output) |
| `AI.batch()` | Variable | Flash Lite (bulk operations) |

### Module-Specific System Prompts

Each module has a tailored system prompt (`lib/prompts.ts`) that provides:
- Montgomery-specific context (population, geography, council districts)
- Module domain knowledge (e.g., SB 298 staffing requirements for Sentinel)
- Output format instructions for consistent AI responses
- Cross-module awareness for pattern detection

---

## Database Design

### 28 Prisma Models across 5 domains:

**Auth (2 tables)**
- `User` — 10 roles with RBAC, module assignments, district scoping
- `Session` — JWT session tracking with IP/user-agent

**Sentinel MGM (5 tables)**
- `Incident` — 55,727 fire/rescue incidents with H3 hex indexing
- `Call911` — 85 monthly call aggregations
- `PoliceStation` — 18 stations
- `FireStation` — 15 stations
- `ForceMultiplierZone` — AI-generated risk zones

**YouthShield (5 tables)**
- `School` — 84 schools with enrollment data
- `CommunityCenter` — 21 centers with amenity details
- `Park` — 64 parks with activity offerings
- `Library` — 12 branches
- `DayCare` — 198 facilities
- `YouthRiskZone` — AI-generated risk heat map zones

**Blight-to-Bright (5 tables)**
- `Nuisance` — 6,102 nuisance records
- `CodeViolation` — 815 violations with H3 indexing
- `CityOwnedProperty` — 597 parcels with zoning/appraisal
- `ServiceRequest311` — 711 service requests with H3 indexing
- `BlightScore` — AI-generated severity scores

**Compass (4 tables)**
- `ConstructionPermit` — 41,871 permits ($3.2B total investment)
- `BusinessLicense` — 491 active licenses
- `DailyPopulationTrend` — 1,460 daily visitor/commuter trends
- `FoodScore` — 1,350 health inspection scores

**Cross-Module (5 tables)**
- `CouncilDistrict` — 9 districts with contact info
- `PointOfInterest` — General POI registry
- `EducationFacility` — Extended education data
- `CrossModuleAlert` — AI convergence alerts
- `AiAnalysis` — AI analysis audit log
- `ExecutiveBriefing` — Auto-generated briefings

### Geospatial Indexing

All location-bearing records include **H3 hexagonal grid indices** for privacy-preserving spatial aggregation:
- **Resolution 7** (Sentinel): ~5.16 km² hexagons for patrol zone analysis
- **Resolution 8** (YouthShield/Blight): ~0.74 km² hexagons for neighborhood-level analysis

---

## API Design Patterns

### Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 55727,
    "totalPages": 1115
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

### Pagination

List endpoints support `?page=1&limit=50` query parameters with metadata in the response.

### Filtering

Data endpoints support contextual query filters:
- `?district=4` — Filter by council district
- `?type=fire` — Filter by category/type
- `?shift=A` — Filter by operational shift
- `?year=2024` — Filter by year
- `?status=open` — Filter by record status

---

## Data Flow

### CSV Ingestion Pipeline

```
montgomery_data/*.csv
        │
        ▼
   scripts/seed.ts
   ┌──────────────┐
   │ csv-parse    │ Parse CSV rows
   │ h3-js        │ Calculate H3 hex indices for geo records
   │ Prisma       │ Bulk insert with createMany()
   └──────┬───────┘
          │
          ▼
   PostgreSQL (28 tables, 109K+ rows)
```

### 40+ CSV files ingested:
- Fire_Rescue_All_Incidents.csv (55,727 rows)
- Construction_Permit_Data.csv (41,871 rows)
- Nuisance.csv (6,102 rows)
- Plus 14 additional datasets

---

## Cross-Module Intelligence

The Command layer synthesizes data across all 4 modules:

```
┌──────────┐  ┌───────────┐  ┌───────┐  ┌─────────┐
│ Sentinel │  │YouthShield│  │ Blight│  │ Compass │
│ incidents│  │ risk zones│  │ scores│  │ permits │
└────┬─────┘  └─────┬─────┘  └───┬───┘  └────┬────┘
     │              │            │            │
     └──────────────┴────────────┴────────────┘
                    │
            ┌───────▼────────┐
            │ Command Layer  │
            │                │
            │ • Dashboard:   │ Unified vital signs from all 4 modules
            │ • Alerts:      │ AI detects cross-module convergence patterns
            │ • Briefing:    │ AI generates weekly executive summaries
            └────────────────┘
```

**Example convergence pattern**: A neighborhood showing high incident rates (Sentinel) + youth risk (YouthShield) + blight concentration (Blight) + no new investment (Compass) triggers an automated cross-module alert.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key for all AI endpoints |
| `JWT_SECRET` | Secret key for JWT token signing |
| `DATA_DIR` | Path to Montgomery CSV data directory |
| `NODE_ENV` | `development` or `production` |

---

## Running the Backend

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed data (all CSVs + default users)
npm run seed

# Development server (port 8000)
npm run dev

# Production build
npm run build && npm start
```
