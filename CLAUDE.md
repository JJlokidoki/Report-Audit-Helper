# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pentest Audit Helper — a penetration testing report management system. Russian-language UI. Microservices architecture: React SPA frontend + 5 Python FastAPI backend services communicating over HTTP, with SQLite as the sole database (accessed only by Report Service).

## Service Ports

| Service | Port | Path |
|---|---|---|
| Report Service | 8001 | `services/report-service` |
| Export Service | 8002 | `services/export-service` |
| Retest Service | 8003 (stub) | `services/retest-service` |
| AI Vuln Generator | 8004 | `services/ai-vuln-generator` |
| TestGen Service | 8005 (stub) | `services/testgen-service` |
| Frontend (dev) | 5173 | `frontend` |

## Development Commands

### Starting Services

Each backend service uses its own venv. On Windows, activate with `.\venv\Scripts\activate`.

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend services (each in its own terminal)
cd services/report-service && .\venv\Scripts\activate && uvicorn app.main:app --port 8001 --reload
cd services/export-service && .\venv\Scripts\activate && uvicorn app.main:app --port 8002 --reload
cd services/ai-vuln-generator && .\venv\Scripts\activate && uvicorn app.main:app --port 8004 --reload
```

Helper script to start/restart all services (kills occupied ports, loads `.env`):
```bash
bash scripts/start.sh            # all services
bash scripts/start.sh --frontend --report  # selective
```

### Docker

```bash
# Start all services
docker compose up --build

# Start in background
docker compose up -d --build

# Stop
docker compose down

# Rebuild single service
docker compose up --build report-service
```

LLM settings: copy `.env.example` → `.env` and adjust. `host.docker.internal` is used to reach host-local LLM servers from inside containers.

### Tests

```bash
# Backend — run tests for a specific service
cd services/report-service && python -m pytest tests/ -v
cd services/export-service && python -m pytest tests/ -v

# Single test
python -m pytest tests/test_reports.py::test_create_report -v

# Frontend
cd frontend && npm test
```

## Architecture

**Data flow:** Frontend → HTTP API → Services. Report Service is the only service with DB access. Export Service and AI Vuln Generator fetch data from Report Service via httpx.

**Report types:** web, ios, android, ai, iot — each has its own DOCX template set in `services/export-service/templates/{type}/`.

**Export pipeline:** Fetches data from Report Service → fills Word templates with docxtpl (Jinja2) → vulnerability template (`05_vulnerability.docx`) filled N times (once per vulnerability) → all composed into one DOCX via docxcompose in order: title → toc → general_info → test_results → vulnerabilities → threat_classification → checklist → returned as StreamingResponse (not saved to disk).

**AI integration:** Pluggable LLM providers via abstract `LLMProvider` base class in `providers/base.py`. Factory in `providers/__init__.py` selects provider by `LLM_PROVIDER` env var. To add a new provider: inherit `LLMProvider`, implement `chat()`/`stream()`/`supports_vision`, register in factory. Prompts stored as constants in `prompts.py` — never hardcode prompts in routers.

**Database:** SQLite file `services/report-service/report.db`. Auto-migrates on startup. Seeds preset software and creates security checks from `checklist_data.py` templates on report creation. Cascade deletes via SQLAlchemy relationships (`cascade="all, delete-orphan"`).

## Service-Specific Conventions

### Report Service (`services/report-service/`)
- Models in `models.py`, Pydantic schemas in `schemas.py` (Create/Update/Response per model)
- Routers: separate file per endpoint group in `routers/`, each with `APIRouter(prefix="/api/...", tags=[...])`
- DB session via dependency injection: `db: AsyncSession = Depends(get_db)`
- HTTP 404 if resource not found, 422 for validation errors
- Creating a Report auto-creates SecurityCheck records from `checklist_data.py`

### Export Service (`services/export-service/`)
- `filler.py` — `fill_template(path, context) -> BytesIO`
- `generator.py` — orchestrates full generation cycle
- Templates in `templates/{web,ios,android,ai,iot}/` — 7 templates per type

### AI Vuln Generator (`services/ai-vuln-generator/`)
- Env config: `LLM_PROVIDER` (ollama/openai/custom), `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TEMPERATURE` (0.1), `LLM_MAX_TOKENS` (2048)
- Streaming: `POST /api/ai/generate/stream` → `StreamingResponse(media_type="text/plain")`
- Prompts: `SYSTEM_PROMPT`, `KILLCHAIN_PROMPT`, `WSTG_PROMPT`, `SUMMARY_PROMPT` in `prompts.py`

## Frontend Conventions (`frontend/`)

- **Stack:** React 18, TypeScript strict, Vite, DaisyUI 5 + Tailwind CSS 4, React Router v7, TanStack Query, Axios, TipTap, TanStack Table, dnd-kit, react-hot-toast
- All TypeScript interfaces in `types/index.ts`
- All API requests through TanStack Query (`useQuery`/`useMutation`)
- API clients in `api/` — `reportApi.ts`, `exportApi.ts`, `aiApi.ts`
- Env vars: `VITE_REPORT_API_URL`, `VITE_EXPORT_API_URL`, `VITE_AI_API_URL`, `VITE_USE_RICH_EDITOR`
- Forms: controlled components, save on button click. Exception: checklist auto-saves on status/notes change
- Unimplemented tabs use `PlaceholderPage` component
- DaisyUI patterns: `table table-zebra`, `btn btn-primary`, `modal modal-box`, `form-control` + `label`

## Testing Conventions

### Backend (Python)
- pytest + pytest-asyncio + httpx `AsyncClient`
- Each service: `tests/conftest.py` (fixtures `test_client`, `test_db` with in-memory SQLite) + `test_*.py`
- Integration tests: `AsyncClient` with `app` directly (no server startup)
- Mock external deps: LLM providers, HTTP calls via `respx`
- Naming: `test_<action>_<entity>[_<condition>]`

### Frontend (TypeScript)
- Vitest + React Testing Library + MSW (Mock Service Worker)
- Tests next to components: `ComponentName.test.tsx` or in `__tests__/`

## General Code Style

- Python: PEP 8, type hints mandatory, Pydantic v2 for validation, async/await throughout
- TypeScript: strict mode
- Minimal comments — only for non-obvious logic
- Less code is better

## Documentation

- Technical specs per service: `docs/tz-*.md`
- Feature roadmap: `docs/task-list.md`
- WSTG checklist data: `docs/wstg-table.md`

## Backlog

- Ongoing backlog of ideas and improvements: `docs/backlog.md`
- Managed via `/backlog` skill (add, list, done, priority, show, idea)
- When an agent discovers something out of scope that needs improvement — suggest to the user: "добавь в бэклог через `/backlog add ...`"
- Before starting work on a feature area, check related backlog items: `/backlog list [category]`
- Do NOT automatically modify the backlog file without user request
