# Testing strategy

## Current implementation

Vitest configuration and `pnpm test` scripts are present, but no test files were discovered. The configured Turborepo test task depends on builds and emits coverage when tests exist.

## Recommended layered strategy

| Layer       | Scope                                                                          | Priority examples                                                                       |
| ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Unit        | pure validation, mappers, JWT/token/password helpers, promotion decision rules | malformed input, DTO secret omission, status transitions                                |
| Integration | Prisma repositories/services against PostgreSQL                                | FKs/unique/check constraints, rollback + audit atomicity                                |
| HTTP/E2E    | Express via Supertest with seeded DB/RBAC                                      | middleware order, envelope/status, auth/RBAC/IDOR negative paths                        |
| Concurrency | simultaneous DB/API clients                                                    | refresh consume-once, promotion finalize-once, attendance lock/mark, timetable conflict |
| Migration   | blank DB + deploy/status                                                       | baseline applies and generated client/schema agree                                      |

See the source-grounded gap inventory in [testing audit](../audits/testing-audit.md).
