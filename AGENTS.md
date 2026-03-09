# Repository Guidelines

## Project Structure & Module Organization
Primary application code lives in `montgomery-command-center/`. The React frontend is in `montgomery-command-center/apps/web`, with feature modules under `src/components/{command,sentinel,youthshield,blight,compass}`, shared UI in `src/components/shared`, app state in `src/contexts`, and API clients in `src/services/api.ts`. The FastAPI backend is in `montgomery-command-center/apps/api`, with routes in `routers/`, ML logic in `ml/`, shared loading code in `services/`, and settings in `config.py`. Keep raw or generated datasets out of source folders; project data belongs in `montgomery-command-center/data/` or the external `montgomery_data/` path referenced by the API.

## Build, Test, and Development Commands
Frontend commands run from `montgomery-command-center/apps/web`:

- `npm install` installs frontend dependencies from `package-lock.json`.
- `npm run dev` starts Vite on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.
- `npm run build` runs TypeScript compilation and creates a production bundle in `dist/`.
- `npm run lint` runs ESLint across the web app.

Backend commands run from `montgomery-command-center/apps/api`:

- `python -m venv .venv && source .venv/bin/activate` creates and activates a local virtual environment.
- `pip install -r requirements.txt` installs FastAPI, pandas, scikit-learn, and geospatial dependencies.
- `uvicorn main:app --reload --host 0.0.0.0 --port 8000` starts the API used by the frontend proxy.

## Coding Style & Naming Conventions
Follow existing style before introducing new patterns. Frontend files use TypeScript, React function components, semicolon-terminated statements, and 2-space indentation. Name components and context providers in `PascalCase`, hooks in `camelCase` with a `use` prefix, and route modules by domain, for example `routers/sentinel.py`. Python code follows PEP 8 with 4-space indentation and concise docstrings where useful.

## Testing Guidelines
There is no repository-owned automated test suite yet. Before opening a PR, run `npm run lint`, `npm run build`, and exercise the affected API route or UI flow locally. When adding tests, place frontend tests beside the feature or under `apps/web/src/__tests__/`, and backend tests under `apps/api/tests/` using `test_*.py`.

## Commit & Pull Request Guidelines
Git history currently contains only `Initial commit`, so no strong convention is established. Use short, imperative commit subjects such as `Add compass scenario validation` and keep unrelated changes separate. PRs should include a concise summary, impacted areas (`apps/web`, `apps/api`, `data`), local verification steps, and screenshots for visible UI changes.
