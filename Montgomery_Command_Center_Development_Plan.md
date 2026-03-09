# Montgomery Command Center Development Plan

## 1. Purpose

This document translates the PRD into an execution plan for design, data engineering, application development, analytics, testing, and pilot rollout. It is optimized for two delivery horizons:

1. Hackathon prototype: 4 days to demonstrate the integrated value of all four modules.
2. Pilot product: 12 weeks to deliver an operational city-facing platform for the CTO office, MPD shift command, and Code Enforcement.

The plan assumes the local Montgomery CSVs are the primary data source for the prototype and that web-scraped or partner data can be stubbed, simulated, or added incrementally.

## 2. Delivery Principles

- Build the shared data and map foundation first. Every module depends on consistent geography, time, and entity linkage.
- Prioritize the PRD's strongest demo path: Sentinel MGM plus Blight-to-Bright first, then YouthShield and DataCenter Compass.
- Deliver thin vertical slices end-to-end rather than building isolated backend features with no UI.
- Treat privacy and aggregation as core product requirements, not polish work.
- Separate prototype-grade assumptions from pilot-grade operational features.

## 3. Target Outcomes

### 3.1 Hackathon outcomes

- Load the Montgomery CSV inventory into a relational database.
- Normalize spatial data into one canonical coordinate system.
- Ship a shared city map with module overlays.
- Demonstrate one working feature from each module.
- Demonstrate at least two cross-module convergence alerts.
- Generate one executive briefing view.

### 3.2 Pilot outcomes

- Role-based dashboards for executive, operational, and public users.
- Stable weekly data refresh from city datasets.
- Reliable address and parcel matching across core datasets.
- Operational Sentinel and Blight workflows for real city staff.
- Actionable YouthShield and Compass prototypes backed by documented assumptions.

## 4. Scope by Phase

### 4.1 Phase 0: Hackathon prototype

In scope:

- Shared map shell and command view
- Core ingestion pipeline for local CSVs
- Spatial normalization and district joins
- Sentinel P0 demo
- Blight P0 demo
- YouthShield P0 demo
- DataCenter Compass P0 demo
- Cross-module alert feed
- Executive summary report screen

Out of scope:

- Full partner integrations
- Live news/social scraping in production quality
- Authentication hardening beyond demo-safe access control
- High-accuracy ML claims that cannot be validated during the event
- Full PDF export pipeline if screen and print styles cover the story

### 4.2 Phase 1: Pilot deployment

In scope:

- Production auth and RBAC
- Weekly automated refresh for city CSVs
- Audit logging
- Operational dashboards for 2 pilot departments
- Repeatable deployment pipeline
- Baseline observability and data quality monitoring

### 4.3 Phase 2: Full deployment

In scope:

- All districts
- Full YouthShield routing workflows with partner data
- DataCenter benchmarking and scenario persistence
- Public transparency portal
- Auto-generated briefings and reporting

## 5. Proposed Team Structure

Minimum team for hackathon:

- 1 full-stack lead
- 1 frontend/map engineer
- 1 data engineer
- 1 analytics/ML engineer
- 1 product/designer/presenter

Minimum team for 12-week pilot:

- Product manager
- Tech lead
- 2 frontend engineers
- 2 backend/data engineers
- 1 GIS/data quality engineer
- 1 ML/analytics engineer
- 1 designer
- 1 QA engineer

## 6. Technical Delivery Architecture

### 6.1 Core stack

- Frontend: React + TypeScript + Tailwind + shadcn/ui
- Mapping: Mapbox GL JS
- Backend: FastAPI
- Database: PostgreSQL + PostGIS
- Background jobs: Celery + Redis
- Analytics notebooks and jobs: Python
- Deployment: Docker-based, with simple staging and production environments

### 6.2 Architecture shape

Use a modular monolith for the pilot. Split code by domain but keep one deployable service until usage and ownership justify service extraction.

Suggested repository structure:

```text
/apps/web
/apps/api
/packages/ui
/packages/maps
/packages/types
/data/raw
/data/processed
/infra
/docs
```

### 6.3 Domain boundaries

- `shared`: auth, geography, search, alerts, reports
- `sentinel`: incidents, deployment, staffing, business risk
- `youthshield`: assets, school proximity, gap analysis, interventions
- `blight`: parcels, nuisance, violations, regeneration scoring
- `compass`: permits, visitation, population trends, simulations

## 7. Data Engineering Plan

### 7.1 Immediate data reality

The local CSVs are usable, but the data foundation needs normalization before cross-module analytics will be credible.

Observed issues:

- Mixed coordinate systems across files
- Partial missing coordinates in some datasets
- Address-only and parcel-only datasets that require linkage
- Inconsistent date formats
- PRD row counts that appear to be approximate snapshots rather than live counts

### 7.2 Data pipeline layers

#### Layer A: Raw ingestion

Tasks:

- Store each CSV as a versioned raw source.
- Record file name, ingest timestamp, row count, and schema hash.
- Load each file into `raw_*` tables without destructive cleaning.

Acceptance criteria:

- All local CSVs load successfully.
- Schema changes are detectable.
- Raw ingestion is rerunnable.

#### Layer B: Standardization

Tasks:

- Normalize column names to snake_case.
- Parse dates into canonical `date` or `timestamp` fields.
- Preserve original string values for auditability.
- Standardize booleans, enums, and empty values.

Acceptance criteria:

- Each source has a corresponding `stg_*` table.
- Failed parses are logged with counts.

#### Layer C: Spatial normalization

Tasks:

- Convert all coordinate-bearing datasets into WGS84 lat/lon geometry.
- Detect source CRS per dataset and document the conversion logic.
- Geocode address-only records where coordinates are missing.
- Join parcel-driven datasets to parcel/address reference tables.
- Attach council district, city boundary, and H3 cell IDs.

Acceptance criteria:

- Every core analytical table has either a geometry column or a documented reason why not.
- District joins work across core datasets.
- H3 assignment is available for incident, parcel, and asset-level analysis.

#### Layer D: Canonical marts

Tasks:

- Build `mart_incidents`
- Build `mart_parcels`
- Build `mart_businesses`
- Build `mart_schools_and_assets`
- Build `mart_population_mobility`
- Build `mart_permits_and_investment`

Acceptance criteria:

- Shared marts support all Phase 0 dashboards without custom per-feature SQL.

### 7.3 Priority source mapping

| Source | Primary use | Key actions |
| --- | --- | --- |
| `Fire_Rescue_All_Incidents.csv` | Sentinel, YouthShield | Parse incident time, geocode missing coordinates, classify incidents |
| `Nuisance.csv` | Blight, Sentinel | Link parcel and address, normalize complaint types |
| `Code_Violations.csv` | Blight | Convert projected XY, join parcels and district |
| `City_Owned_Properties.csv` | Blight, Compass | Build parcel inventory and reuse candidates |
| `Construction_Permit_Data.csv` | Blight, Compass | Normalize permits, project types, investment values |
| `Business_License.csv` | Sentinel, Compass | Geocode missing locations, classify corridor/business type |
| `School.csv` and `Education_Facility.csv` | YouthShield, Sentinel | Normalize school metadata and buffers |
| `Community_Centers.csv`, `Parks*`, `Libraries*` | YouthShield | Build youth asset network and hours coverage |
| `Daily_Population_Trends.csv`, `Visitors_Origin.csv` | Compass, Sentinel | Build mobility and demand proxies |
| `Received_311_Service_Requests.csv` | Blight, Sentinel | Service demand and neighborhood quality signal |

## 8. Shared Platform Workstreams

### 8.1 Workstream A: Design system and UX shell

Deliverables:

- App shell with module tabs
- Shared map canvas
- Filter bar for district, date, and layer visibility
- Alert feed layout
- Executive command view

Dependencies:

- Basic API shape
- Map layer contracts

### 8.2 Workstream B: Auth and roles

Deliverables:

- Demo auth for hackathon
- JWT-based RBAC for pilot
- Roles: executive, operations, public

Dependencies:

- User and permission model

### 8.3 Workstream C: Search and geospatial navigation

Deliverables:

- Address lookup
- District filter
- Layer toggle system
- "View this location across modules" workflow

Dependencies:

- Canonical geography tables

### 8.4 Workstream D: Alerts and reports

Deliverables:

- Cross-module alert service
- Rule definitions and severity levels
- Weekly executive briefing generator
- Export-friendly views

Dependencies:

- Shared marts and module outputs

## 9. Module Delivery Plan

### 9.1 Module 1: Sentinel MGM

#### Phase 0 deliverables

- Dynamic incident density map
- Force multiplier zones using time-windowed incident intensity and nuisance overlay
- Shift coverage mock optimizer based on available units and district balancing
- SB 298 staffing dashboard
- Business corridor risk layer using business licenses plus incidents

#### Implementation notes

- Start with rules and weighted scoring, not an over-claimed prediction model.
- Treat `Fire_Rescue_All_Incidents` as the main operational incident source for the prototype.
- Use nuisance, 311, business licenses, schools, and facilities as contextual layers.

#### Pilot upgrades

- Route optimization with explicit constraints
- Hiring and attrition scenario model
- News and official channel ingest
- Better commercial corridor vulnerability scoring

#### Exit criteria

- Commander can view district heatmaps, coverage gaps, and recommended focus zones.

### 9.2 Module 2: YouthShield

#### Phase 0 deliverables

- Youth risk heat map using incident proximity to schools and after-school hours
- After-school gap analyzer using schools, community centers, parks, libraries, and daycare
- Resource coordination map with hours and facility types

#### Implementation notes

- Keep all outputs aggregated to zones.
- Use walking-distance approximations where live routing is unavailable.
- Mark partner capacity and intervention routing as prototype logic unless partner feeds exist.

#### Pilot upgrades

- True intervention routing workflow
- Outcome tracking model
- School safety perimeter alerts
- Grant reporting exports

#### Exit criteria

- User can identify underserved blocks and nearby assets within the after-school risk window.

### 9.3 Module 3: Blight-to-Bright 2.0

#### Phase 0 deliverables

- Parcel-level or parcel-cluster blight severity score
- City-owned parcel map
- Regeneration recommendation cards for top parcels
- Contagion-style neighborhood priority map
- Correlation overlay with incidents

#### Implementation notes

- Build the score from nuisance, code violations, 311, environmental nuisance history, and parcel ownership.
- If exact parcel geometries are unavailable, use parcel identifiers and point/address proxies first.
- Use simple recommendation templates based on zoning, size, nearby assets, and district context.

#### Pilot upgrades

- Affordable housing preservation flags
- HUD compliance workflow
- Community proposal portal
- Council district briefings

#### Exit criteria

- Planning staff can see top-priority parcels, why they were ranked, and what reuse options are recommended.

### 9.4 Module 4: DataCenter Compass

#### Phase 0 deliverables

- Combined investment dashboard using permits, population trends, visitation proxies, and configurable assumptions
- Scenario slider interface
- Community benefit agreement recommendation panel
- Jobs and utility impact cards with transparent assumptions

#### Implementation notes

- The local data only partially supports the PRD vision; use a documented assumption model for missing utility, employer, and data center-specific inputs.
- Make uncertainty visible. Show "city data-backed" versus "modeled assumption" labels.

#### Pilot upgrades

- Comparable city benchmarking ingest
- Scenario persistence and side-by-side comparison
- Housing market impact overlays
- Environmental justice analysis

#### Exit criteria

- Executive user can explore scenarios and understand tradeoffs in jobs, housing, and utility pressure.

## 10. Cross-Module Intelligence Plan

### 10.1 First alert rules to implement

- High incidents + high nuisance + low youth asset coverage
- City-owned parcel near high-risk youth gap zone
- Growing permit activity near blighted parcels
- New business activity near improved blight conditions
- High incident zone with nearby schools during dismissal window

### 10.2 Alert output contract

Each alert should include:

- alert_id
- title
- severity
- geography
- modules involved
- evidence summary
- recommended action
- responsible owner
- timestamp

### 10.3 Executive briefing content

- Top citywide changes this week
- Top 3 cross-module alerts
- District-level wins and risks
- Staffing and intervention snapshots
- Regeneration and investment updates

## 11. Detailed Delivery Roadmap

### 11.1 Hackathon plan: 4 days

#### Day 1: foundation

- Set up repo structure and environments
- Load raw CSVs into PostgreSQL
- Create staging models
- Normalize at least 10 priority datasets
- Render city boundary, districts, and map shell

Done when:

- The app can display Montgomery districts and at least one normalized dataset layer.

#### Day 2: Sentinel and Blight

- Implement incident heatmap
- Implement blight severity scoring
- Build parcel and nuisance overlays
- Add shared district/date filters

Done when:

- A judge can switch between Sentinel and Blight views on the same map.

#### Day 3: YouthShield and Compass

- Implement after-school gap logic
- Implement youth asset map
- Implement scenario dashboard with assumption sliders
- Add first cross-module alerts

Done when:

- At least one alert combines three modules.

#### Day 4: polish and story

- Build command view
- Add executive briefing page
- Improve labels, legends, and transitions
- Test presentation flows and demo data

Done when:

- The team can run a reliable end-to-end demo without manual database edits.

### 11.2 Pilot plan: 12 weeks

#### Sprint 1: platform bootstrap

- Finalize repo, environments, CI, linting, and migrations
- Land raw/staging/canonical data architecture
- Ship auth skeleton and navigation shell

#### Sprint 2: geography and data quality

- Finish CRS normalization
- Finish district and H3 assignments
- Add data quality dashboard and ingest logging

#### Sprint 3: Sentinel v1

- Incident maps, focus zones, staffing dashboard
- Business corridor vulnerability layer
- Operational filters by district, shift, and time

#### Sprint 4: Blight v1

- Blight score engine
- City-owned parcel inventory
- Regeneration recommendation cards
- Correlation with incidents and 311

#### Sprint 5: YouthShield v1

- School safety buffers
- After-school gap analyzer
- Asset map and service gap overlays

#### Sprint 6: Compass v1

- Scenario simulator
- Project impact cards
- Assumption registry and confidence labeling

#### Sprint 7: cross-module intelligence

- Alert engine
- Command view
- Shared location detail page

#### Sprint 8: reporting and exports

- Executive briefing generator
- District briefing pages
- Printable report views

#### Sprint 9: hardening

- RBAC completion
- Audit logging
- Performance tuning
- Monitoring and error tracking

#### Sprint 10: pilot readiness

- UAT with CTO office
- UAT with MPD shift command and Code Enforcement
- Fixes, training materials, and launch checklist

#### Sprint 11: field feedback iteration

- Improve operational flows based on pilot usage
- Tighten map performance and mobile usability
- Adjust rules and thresholds

#### Sprint 12: controlled launch

- Pilot release
- Weekly refresh jobs live
- Support and triage process active

## 12. Backlog Prioritization

### 12.1 P0 build order

1. Shared ingestion and geography layer
2. Shared map shell and command view
3. Sentinel incident and staffing views
4. Blight scoring and parcel prioritization
5. Youth gap and asset map
6. Compass scenario dashboard
7. Cross-module alerts

### 12.2 P1 build order

1. Route optimization and staffing scenarios
2. Intervention routing and outcome tracking
3. Affordable housing and HUD workflows
4. Comparable city and utility impact modules
5. Reporting and public transparency portal

## 13. Testing Strategy

### 13.1 Data tests

- Schema and null checks
- Coordinate conversion validation
- Date parsing validation
- District join coverage
- Duplicate and orphan parcel detection

### 13.2 Application tests

- API contract tests
- Map layer rendering tests
- RBAC tests
- Alert rule unit tests
- Report generation snapshot tests

### 13.3 User validation

- Command-view walkthrough with CTO stakeholders
- Shift command workflow review
- Code enforcement prioritization review
- Youth partner review for privacy and usefulness

## 14. Privacy, Ethics, and Security Implementation

- Aggregate YouthShield outputs to H3 zones only
- Hide sensitive operational detail in public views
- Log all exports and report generation
- Add minimum-threshold suppression for sparse youth metrics
- Maintain a written assumption register for modeled outputs
- Review stigmatization risks in any neighborhood-scoring display

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Mixed coordinate systems break maps | High | Add explicit CRS detection and test conversions per dataset |
| Missing parcel geometry weakens parcel analytics | High | Use parcel ID plus address proxies now; add parcel shapefiles later |
| PRD overpromises ML accuracy for hackathon | High | Use transparent rule-based prototypes with labeled assumptions |
| Partner data is unavailable | Medium | Build import templates and stub workflows |
| Too much scope for 4 days | High | Restrict each module to one compelling P0 slice |
| Compass lacks direct utility and employer data | Medium | Mark assumptions clearly and isolate simulation inputs |
| Performance degrades with map layers | Medium | Precompute tiles, cluster points, cache queries |

## 16. Definition of Done

### 16.1 Hackathon done

- One shared app with all four modules visible
- All visuals tied to real Montgomery datasets or clearly labeled assumptions
- At least two cross-module alerts
- One strong narrative demo for mayor/CTO use

### 16.2 Pilot done

- Staff can use the system weekly without engineering intervention
- Data refresh completes automatically
- Access controls and audit logging are active
- Sentinel and Blight support real operational decisions
- YouthShield and Compass are credible, documented, and expandable

## 17. Immediate Next Steps

1. Create the repo structure and choose whether this is a monorepo from day one.
2. Stand up PostgreSQL with PostGIS and load all local CSVs into raw tables.
3. Document coordinate system handling for each priority dataset.
4. Implement the shared map shell and district filters.
5. Build Sentinel and Blight first, then layer in YouthShield and Compass.
