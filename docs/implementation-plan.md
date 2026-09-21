# Employee Management implementation plan

The user authorized completion of the application after the Phase 1 scaffold. Work proceeds in the requested phase order. Each milestone is checked before the next one.

1. **Schema:** SQLAlchemy models and explicit Alembic migration for users, employees, departments, attendance, settings, and audit logs. Verify constraints and migrations.
2. **Authentication:** Argon2 password hashes, expiring JWTs, active-user checks, and login auditing. Verify valid/invalid login and protected routes.
3. **Employee management:** Admin-only CRUD, search, filtering, activation, and departments. Verify employee privacy and validation.
4. **Attendance:** Server UTC timestamps and organization-local date, one row per day, open-session guard, checkout duration, and employee history. Verify duplicate and missing-session conflicts.
5. **Admin data:** Dashboard summaries, filtered attendance, and daily/weekly/monthly/employee/department reports. Verify role boundaries and aggregates.
6. **Frontend:** Responsive app shell, login, dashboards, employee CRUD, attendance history, reports, profile, and charts. Verify TypeScript and build.
7. **Integration and containers:** Browser API client, JWT session handling, Dockerfiles, Compose, seed script, and environment templates. Verify end-to-end paths where services are available.
8. **Hardening:** Critical API tests, request logging and audit, deployment README, security review. Verify full suite and production build.

Operational rulings: one organization timezone/settings row; Monday–Friday working week initially; one attendance row per employee per local date; check-out closes the open row even after midnight; inactive accounts fail token checks; reports derive absent days from configured working weekdays.
