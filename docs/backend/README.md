# S.P.A.R.K. backend documentation

> **Evidence baseline:** repository inspection on 2026-09-18. Source code and Prisma schema are authoritative; this documentation describes the current implementation, not a target state.

S.P.A.R.K. is a pnpm/Turborepo college-ERP workspace. The implemented backend is an Express 5 TypeScript modular monolith, backed by Prisma 7/PostgreSQL. The API exposes Phase-1 academic, enrollment, scheduling, attendance, identity, RBAC, and audit capabilities. The Prisma schema also defines future-domain tables (assignments, materials, notices, notifications, calendar, documents, settings), but there are no matching API modules/routes; they are **not implemented backend features**.

## Verified technology baseline

| Area                | Current implementation                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Runtime/API         | Node >=20, Express 5.2, TypeScript 6                                                      |
| Persistence         | Prisma 7.8, `@prisma/adapter-pg`, PostgreSQL 16 development container                     |
| Validation/security | Zod 4, Argon2, JWT, opaque hashed refresh tokens, Helmet, HPP, CORS, `express-rate-limit` |
| Logging             | Winston + daily rotate file, AsyncLocalStorage request context                            |
| Workspace           | pnpm 10.15, Turborepo 2.10                                                                |
| Tests               | Vitest configured, but no `*.test.*`/`*.spec.*` files were found                          |
| Redis               | Dev compose starts Redis 7, but API source has no Redis client/use                        |
| CI/CD               | No `.github` workflow was found                                                           |

## Navigation

- **Architecture:** [overview](architecture/overview.md), [request lifecycle](architecture/request-lifecycle.md), [dependency graph](architecture/dependency-graph.md).
- **Modules:** [complete inventory](modules/README.md), [identity and RBAC](modules/identity-rbac.md), [academic structure](modules/academic-structure.md), [student lifecycle](modules/student-lifecycle.md), [delivery and attendance](modules/delivery-attendance.md).
- **Database:** [overview and ERD](database/overview.md), [constraints and migrations](database/constraints-and-migrations.md), [transaction strategy](database/transaction-strategy.md).
- **API:** [endpoint catalogue](api/endpoints.md), [authentication and errors](api/authentication-and-errors.md).
- **Security:** [overview](security/overview.md), [threat model](security/threat-model.md), [findings](security/security-findings.md).
- **Operations:** [configuration and runtime](operations/runtime.md).
- **Testing:** [strategy and audit](testing/strategy.md).
- **Workflows:** [critical workflows](workflows/critical-workflows.md).
- **Decision records:** [ADR index](decisions/ADR-INDEX.md).
- **Audit reports:** [architecture](audits/architecture-audit.md), [database](audits/database-audit.md), [performance](audits/performance-audit.md), [testing](audits/testing-audit.md), [production readiness](audits/production-readiness.md).

## Reading conventions

- **CURRENT / VERIFIED**: directly supported by executable source, schema, migration, or configuration.
- **KNOWN PROBLEM**: a source-grounded finding; see linked audit reports.
- **RECOMMENDED**: not implemented; a future action, never a statement of current behavior.
- File references are repository-relative and intentionally point maintainers back to the source of truth.
