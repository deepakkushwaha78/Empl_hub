# Employee Management and Attendance

A responsive employee portal and admin console built with Next.js, TypeScript, Tailwind CSS, FastAPI, SQLAlchemy, Alembic, and PostgreSQL. Employees can sign in, check in and out, and review their own history. Admins manage employees and departments and review attendance and working-hour reports.

## Architecture

```text
Browser → Next.js UI and same-origin API proxy → FastAPI /api/v1 → PostgreSQL
                 HttpOnly session cookie             JWT validation
```

Next.js stores the JWT in an HttpOnly, SameSite cookie and forwards it to FastAPI. FastAPI owns permissions, server UTC timestamps, attendance rules, and report calculations. SQLAlchemy handles data access; Alembic applies schema changes. The [architecture document](docs/architecture.md) describes the boundaries and rule decisions.

Signing out clears the browser cookie and writes an audit event. Issued JWTs remain valid until their configured expiration; deactivating an account blocks existing tokens immediately.

## Features

- Admin and employee roles with expiring JWTs, Argon2 password hashes, inactive-user checks, and login rate limiting.
- Admin employee and user-account creation, edits, activation, deactivation, search, filters, and departments.
- One attendance row per employee and organization-local date, duplicate check-in protection, server-time check-out, calculated working minutes, and audit records.
- Configurable timezone, office hours, late threshold, working weekdays, and day-length thresholds.
- Employee dashboard, private attendance history, and profile. Admin dashboard with four focused chart views, filtered attendance table, and date/employee/department reports with CSV export.
- Request IDs, structured request log lines, and an admin activity log for login, logout, employee, and attendance events. Liveness is `/api/v1/health`; database readiness is `/api/v1/ready`.

## Folder structure

```text
backend/
  app/api/v1/       versioned FastAPI routes
  app/core/         settings, database, and security
  app/models/       SQLAlchemy entities and enums
  app/schemas/      Pydantic request and response types
  app/services/     attendance rules and audit helpers
  app/repositories/ reusable queries
  alembic/versions/ explicit migrations
  tests/            pytest API and schema tests
frontend/
  app/              routes and same-origin API handlers
  components/       shell, cards, tables, charts, dialogs
  services/         typed API client
  hooks/            session hook
  types/            API data types
  utils/            date, time, and status formatting
docs/               architecture and implementation plan
```

## Quick start with Docker

Requirements: Docker Engine and Docker Compose.

```bash
cp .env.example .env
# Replace both values in .env with unique secrets. Example generators:
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 48   # JWT_SECRET_KEY
docker compose up --build -d
docker compose exec backend python -m app.seed --development
```

The seed command prints generated development credentials **once**. Keep that terminal output private. It is idempotent and refuses to run when `ENVIRONMENT=production`. Open `http://localhost:3000` for the app and `http://localhost:8000/docs` for development API documentation. The API also exposes `/redoc` in development. No default production password is provided.

To view services or stop them:

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down` keeps the PostgreSQL volume. `docker compose down -v` deletes the database volume; use it only when you intend to erase local data.

## Local development without Docker

Requirements: Python 3.12+, Node.js 18.18+, npm, and PostgreSQL 16+.

1. Create a PostgreSQL database and user. Set `DATABASE_URL` to a SQLAlchemy URL such as `postgresql+psycopg://user:password@localhost:5432/employee_management`.
2. Configure `JWT_SECRET_KEY` with at least 32 random characters and set `ENVIRONMENT=development`. Copy `backend/.env.example` to `backend/.env` and edit the values.
3. In `backend/`, run:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -c constraints.txt -e '.[dev]'
alembic upgrade head
python -m app.seed --development
uvicorn app.main:app --reload --port 8000
```

4. In a second terminal, copy `frontend/.env.example` to `frontend/.env.local`, then run:

```bash
cd frontend
npm ci
npm run dev
```

The Next.js server reads `API_INTERNAL_URL`, defaulting to `http://127.0.0.1:8000/api/v1`. The browser calls Next.js on its own origin; it does not need direct access to the backend.

## Environment variables

| Variable | Service | Purpose |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Compose | PostgreSQL credential; required in root `.env` |
| `DATABASE_URL` | Backend | PostgreSQL SQLAlchemy URL |
| `JWT_SECRET_KEY` | Backend | JWT signing secret, at least 32 characters |
| `JWT_EXPIRE_MINUTES` | Backend | Access token lifetime; default 60 |
| `ENVIRONMENT` | Backend | `development` or `production`; production disables API docs and development seed |
| `CORS_ORIGINS` | Backend | JSON list of allowed direct browser origins |
| `APP_NAME` | Backend | OpenAPI title |
| `API_INTERNAL_URL` | Frontend | Server-to-server FastAPI base URL |
| `COOKIE_SECURE` | Frontend | Set `false` for local HTTP only; leave unset under production HTTPS |

## Database migrations

Run migrations before starting a new API version:

```bash
cd backend
alembic upgrade head
alembic current
alembic downgrade -1   # local rollback only, after reviewing data impact
```

Compose runs `alembic upgrade head` on backend startup. Production deployment should run migrations as a controlled release step before new API instances start. The API does not create tables automatically.

## API

All business endpoints are under `/api/v1`; FastAPI exposes request and response schemas at `/docs` and `/redoc` in development.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/users`, `PATCH /auth/users/{id}/status`, `POST /auth/admins` |
| Employees | `GET /employees`, `GET /employees/{id}`, `POST /employees`, `PUT /employees/{id}`, `PATCH /employees/{id}/status` |
| Departments | `GET /departments`, `POST /departments` |
| Attendance | `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/me`, `GET /attendance/today`, `GET /attendance/dashboard`, `GET /attendance/settings` |
| Admin | `GET /admin/dashboard`, `GET /admin/attendance`, `GET /admin/reports`, `GET /admin/audit-logs`, `POST /admin/attendance/manual`, `PUT /admin/attendance/{id}`, `PUT /admin/settings` |

Employees cannot query other employees' attendance. Admin-only routes enforce the role in FastAPI, independently of frontend navigation. The `GET /admin/reports` endpoint accepts `period=daily|weekly|monthly|custom`, `start_date`, `end_date`, `employee_id`, and `department_id`, and returns rows ready for CSV or Excel export.

## Tests and builds

```bash
cd backend && pytest -q
cd backend && ruff check app tests alembic && ruff format --check app tests alembic
cd frontend && npm run format:check && npm run typecheck && npm run build
```

The API suite uses an isolated SQLite database for fast endpoint and constraint checks. Run an additional PostgreSQL integration check through Compose before deployment. The frontend production build validates types and compiles all routes.

## Deployment notes

- Terminate HTTPS at a trusted reverse proxy. Leave `COOKIE_SECURE` enabled, restrict `CORS_ORIGINS`, and use unique secrets from a secret manager.
- Deploy PostgreSQL with backups and retention appropriate to your organization. Run Alembic migrations before switching traffic.
- Limit exposure of the backend port when using the Next.js proxy. `/docs` and `/redoc` are disabled when `ENVIRONMENT=production`.
- Use the health endpoint for process checks and collect JSON request log lines plus audit records. Do not log JWTs, passwords, or credential request bodies.
- The sample seed command is only for development. Provision the first production admin through a controlled one-time process using a unique generated password.

For the first production admin, after migrations, run `python -m app.bootstrap_admin --email admin@your-company.com` in an interactive backend shell. It prompts for a password, hashes it, and refuses to run once any admin exists. `BOOTSTRAP_ADMIN_PASSWORD` can supply the password in an automated secret-injection workflow; avoid placing it in shell history.

## Screenshots

Add screenshots of the employee dashboard, admin dashboard, attendance table, and reports here when preparing a release.



| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `HSVjvDco39mUTWKLS2OjrxOE` |
| Employee | `john@example.com` | `g0utvLqOHBBTJZGhT2tVaols` |
