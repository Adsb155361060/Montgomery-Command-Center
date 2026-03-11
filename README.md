# Montgomery Command Center

A unified, AI-powered civic intelligence platform for the City of Montgomery, Alabama. Built for the **World Wide Vibes Hackathon**, it integrates public safety, youth violence prevention, urban renewal, and economic development into a single command center with role-based access for executives, operations staff, and citizens.

---

## Modules

| Module | Focus | Key Capabilities |
|---|---|---|
| **Sentinel MGM** | Public Safety | Incident tracking (55K+ records), AI force multiplier zones, shift deployment optimization, SB 298 compliance, recruitment ROI modeling |
| **YouthShield** | Youth Violence Prevention | AI risk zone mapping, after-school gap analysis, community resource coordination, intervention routing |
| **Blight-to-Bright** | Urban Regeneration | AI blight severity scoring, code violations (815+), nuisance tracking (6K+), regeneration blueprints, contagion analysis |
| **DataCenter Compass** | Economic Intelligence | Construction permits ($3.2B pipeline), impact dashboards, what-if scenario simulator, cost-benefit analysis designer |
| **Cross-Module Command** | Unified Intelligence | AI convergence alerts, executive briefings, city-wide dashboard, geo lookup |
| **Citizen Portal** | Public Transparency | Approved alerts, neighborhood conditions, city actions, resident guidance, AI explainer |

---

## Tech Stack

### Frontend (`montgomery-ui/`)

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 3 (light/dark themes) |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 (lazy-loaded pages) |
| State | Context API (Auth, Theme, Background Tasks) |

### Backend (`montgomery-api/`)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, API Routes) |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 (28 models, 109K+ seeded rows) |
| AI | Google Gemini (6 models with intelligent routing) |
| Auth | JWT + bcrypt, role-based middleware |
| Geospatial | H3 hexagonal grid indexing |
| Validation | Zod |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Adsb155361060/Montgomery-Command-Center.git
cd Montgomery-Command-Center
```

### 2. Set up the backend

```bash
cd montgomery-api
cp .env.example .env
# Edit .env with your database URL, Gemini API key, and JWT secret
npm install
npx prisma db push
npm run seed       # Ingests 40+ CSV files (109K+ rows)
npm run dev        # Starts API on http://localhost:8000
```

**Environment variables** (`.env`):

```
DATABASE_URL="postgresql://user:password@host:5432/montgomery_command_center?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key"
JWT_SECRET="change-this-to-a-long-random-secret-in-production"
NODE_ENV="production"
```

### 3. Set up the frontend

```bash
cd montgomery-ui
cp .env.example .env
# For local dev, leave VITE_API_URL empty (Vite proxies /api to localhost:8000)
npm install
npm run dev        # Starts UI on http://localhost:5173
```

For production, set `VITE_API_URL` to your deployed API URL.

---

## Demo Credentials

All demo accounts use password: **`Montgomery2026!`**

| Role | Email | Access |
|---|---|---|
| **Executive** (Mayor) | `mayor@montgomeryal.gov` | Full access — all modules, briefings, AI tools, user management |
| **Operational** (Shift Commander) | `shift.commander@mpd.montgomeryal.gov` | Sentinel module + alerts, deployment tools |
| **Citizen** | `citizen@montgomery.example` | Public transparency portal — approved alerts, neighborhood conditions, city actions |

---

## Project Structure

```
Montgomery-Command-Center/
├── montgomery-ui/          # React frontend (port 5173)
│   ├── src/
│   │   ├── pages/          # 37 lazy-loaded pages across all modules
│   │   ├── components/     # Layout, shared UI, module-specific components
│   │   ├── contexts/       # Auth, Theme, BackgroundTask providers
│   │   ├── hooks/          # useFetch, useBackgroundAction
│   │   ├── lib/            # API client (38 endpoints), utils, export
│   │   └── types/          # TypeScript interfaces (500+ lines)
│   └── index.html
├── montgomery-api/         # Next.js backend (port 8000)
│   ├── app/api/            # 38 RESTful endpoints
│   ├── lib/                # AI services, auth, Prisma client
│   ├── prisma/             # Schema (28 models) + seed scripts
│   └── scripts/            # Data ingestion from 40+ CSV files
└── montgomery_data/        # Source CSV datasets
```

---

## Features

- **Role-Based Access Control** — Three-tier system (Executive, Operational, Citizen) with module-level permissions
- **AI-Powered Analytics** — Gemini-driven convergence alerts, risk scoring, intervention routing, scenario modeling, and executive briefings
- **Interactive Onboarding** — Guided tour with sidebar auto-scrolling and step-by-step module walkthrough
- **Light & Dark Themes** — Full theme support with CSS custom properties; light mode by default
- **Background Task Engine** — Long-running AI operations persist across page navigation with toast notifications
- **Geospatial Intelligence** — H3 hexagonal grid indexing for address-level lookups across all modules
- **Real-Time Dashboard** — Unified KPIs from all four modules with cross-module alert detection
- **Citizen Portal** — Public-facing transparency view with approved alerts, neighborhood conditions, and resident guidance
- **Data Export** — Export tables and analytics to CSV

---

## API Endpoints (38 total)

| Domain | Endpoints |
|---|---|
| Auth | `login`, `register`, `me`, `logout`, `users` |
| Command | `dashboard`, `alerts` (GET/POST), `briefing` (GET/POST) |
| Sentinel | `stats`, `incidents`, `force-multiplier` (GET/POST), `deployment`, `compliance` (GET/POST), `recruitment-roi`, `analyze` |
| YouthShield | `stats`, `risk-zones` (GET/POST), `gap-analysis`, `resources`, `intervention` |
| Blight | `stats`, `nuisances`, `violations`, `properties`, `scores` (GET/POST), `contagion`, `regeneration` |
| Compass | `stats`, `permits`, `impact`, `scenario`, `cba` |
| Intelligence | `ai/chat`, `ai/stats`, `geo/lookup`, `geo/districts` |
| Citizen | `overview`, `assistant/runs` (GET/POST), `assistant/runs/:id` |

---

## Scripts

### Frontend

```bash
npm run dev       # Start dev server (port 5173)
npm run build     # Type-check + production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

### Backend

```bash
npm run dev       # Start API (port 8000)
npm run build     # Production build
npm run seed      # Seed database from CSV files
npm run db:push   # Push Prisma schema to database
npm run db:studio # Open Prisma Studio GUI
```

---

## License

Built for the World Wide Vibes Hackathon — City of Montgomery, Alabama.
