# Architecture and delivery plan

## Purpose

Provide a maintainable application where employees record their own attendance and admins manage people and review team activity. The backend owns identity, authorization, attendance timestamps, and all reporting calculations.

## System boundaries

```text
Browser → Next.js UI → versioned FastAPI routes → services → repositories → PostgreSQL
                              ↘ authentication and policy ↗
```

- **Frontend:** Next.js App Router with TypeScript and Tailwind CSS. Route pages assemble reusable components; service modules call the versioned API; typed data contracts live in `types/`.
- **API:** FastAPI routers handle HTTP validation and response codes. Services enforce attendance and authorization rules. Repositories contain SQLAlchemy queries. Pydantic schemas define public inputs and outputs. ORM models describe persistence.
- **Database:** PostgreSQL with Alembic migrations. The API will not call `create_all` in production.
- **Deployment:** Docker Compose will run the browser app, API, and PostgreSQL on an internal network in Phase 9.

This is a modular monolith: one deployable API with clear feature boundaries. It keeps the first release simple while allowing the attendance rules and reporting queries to evolve independently.

## Identity and access design

- A user has an immutable ID, unique email, password hash, role (`admin` or `employee`), and active flag. An employee profile has a unique employee code and a one-to-one user relationship.
- Authenticated routes resolve a user from an expiring JWT. Role checks run in API dependencies. Employee attendance queries are scoped to the authenticated employee ID in the service and repository, never to an employee ID supplied by the caller.
- Inactive users cannot log in or use existing tokens. Passwords are hashed with a modern password hasher; secrets come from environment variables. Login responses never expose hashes or internal audit data.
- The frontend handles display and navigation guards; the API remains authoritative for every permission decision.

## Attendance and time design

- The backend creates aware UTC check-in and check-out timestamps. `attendance_date` is the date of check-in in the configured organization timezone. The browser displays server-provided localized values.
- One attendance row per employee and organization-local date is enforced by a database unique constraint. A separate guard prevents an employee from opening another session while any prior session remains open. Check-out finds that open session, including if it crosses midnight.
- `working_minutes` is calculated from UTC instants at check-out; it is never accepted from the client. A database transaction protects check-in and check-out transitions against concurrent requests.
- `attendance_settings` owns office start/end, late threshold, half/full day thresholds, timezone, and working weekdays. Services read these rules instead of embedding clock values in routes. `is_late` remains true after a short day changes the display status to `half_day`.
- On office check-out, working time below `half_day_hours` is absent; time below `full_day_hours` is half day; a full day keeps its present or late status. Work-from-home remains a separate status. The late-arrival flag remains available even when a short day changes the display status.
- Presence statuses are `present`, `absent`, `late`, `half_day`, `leave`, and `work_from_home`. A recorded session and an absent day are distinct concepts: reports derive unrecorded working days as absent until an approved leave or other explicit status applies. Holiday support can be added without changing attendance timestamps.

## Planned data model

Alembic creates `users`, `employees`, `departments`, `attendance`, `attendance_settings`, and `audit_logs`. Key constraints include unique normalized user email, unique employee code, unique employee `user_id`, unique department name, unique `(employee_id, attendance_date)`, and indexed attendance date/status plus employee/date. `manager_id` references another employee. UTC timestamp columns use PostgreSQL `TIMESTAMPTZ`.

## Errors and observability

The API will return validated, stable error responses and appropriate HTTP status codes. Business conflicts such as duplicate check-in use `409`; missing active sessions use `409`; unauthenticated requests use `401`; forbidden role access uses `403`. Structured logs will include request IDs without credentials or tokens. An append-only audit log will capture security and attendance events with actor, action, resource, timestamp, and IP.

## Delivery sequence

| Phase | Deliverable | Verification |
| --- | --- | --- |
| 1 | Repository layout, minimal API and UI shells, architecture docs | Python syntax, API health test, frontend build |
| 2 | SQLAlchemy models, Alembic initial migration, constraints | Migration upgrade/downgrade on PostgreSQL |
| 3 | Password hashing, JWT login and identity dependencies | Login and unauthorized API tests |
| 4 | Admin employee and department CRUD, activation | Validation and role restriction tests |
| 5 | Check-in/out and employee history | Duplicate, missing session, timezone, duration tests |
| 6 | Admin dashboard, filters, aggregate reports | Cross-employee and date aggregation tests |
| 7 | Responsive login, employee/admin dashboard, tables, forms | Frontend typecheck and UI checks |
| 8 | Typed API client, session flow, loading/errors | End-to-end employee and admin flows |
| 9 | Dockerfiles and Compose networking | Clean container build and startup |
| 10 | Critical API regression suite and fixtures | Full pytest suite |
| 11 | Request IDs, structured logging, audit completeness | Log and audit assertions |
| 12 | Security review, production settings and docs | Configuration and permission review |

The phase table records the order used to build this repository. See the README for current run and verification commands.
