# Testing audit

## Inventory

Vitest and coverage scripts are configured at root and API package level. Repository discovery found **no test or spec files**. Therefore there is no demonstrated unit, integration, E2E, database, authorization, transaction, or concurrency coverage.

## Blocking coverage gaps

1. Auth: refresh rotation/reuse, password reset/session revocation, lockout, malformed/expired tokens, cookie attributes.
2. RBAC: permission resolution, expired/scoped assignments, self-service user identity checks, every protected route.
3. Lifecycle: admission cancellation, enrollment reference protections, all promotion outcomes/finalization rollback/retry.
4. Scheduling/attendance: conflict handling, lecture validity, locked-session behavior, eligibility, bulk mark idempotency/corrections.
5. Database: unique/FK/check constraints, migration-from-empty, audit rollback.
6. Operations: CORS/proxy/rate-limit/error response middleware contract and graceful shutdown.

## Recommended test strategy

- Unit-test pure mappers, validation, token/password helpers, and state-machine decisions.
- Use a disposable PostgreSQL database for service/repository integration tests; run two clients for guarded updates/races.
- E2E-test Express routes with Supertest and seeded RBAC grants.
- Gate pull requests on typecheck, lint, test, Prisma validation/generation, and migration status in CI.
