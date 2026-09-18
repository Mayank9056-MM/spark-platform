# Operations, configuration, logging, and deployment

## Current implementation

`config/env.ts` Zod-validates database/JWT/Argon2/CORS/logging/bootstrap-admin/proxy values at process startup. `server.ts` listens on configured port, handles SIGTERM/SIGINT, closes HTTP server, disconnects Prisma, and forces exit after 30 seconds. Unhandled rejection/exception are logged then enter shutdown.

The shared logger uses Winston, structured serializers/transports, and AsyncLocalStorage context. Request logging creates a safe `X-Request-ID`, logs method/path/status/duration/IP/user agent/content length, and error middleware logs normalized error metadata. Request IDs flow into audit rows where `recordAudit*` is used. Password/token body logging was not found in the request logger.

Development compose starts PostgreSQL 16 and Redis 7. There is no API service/container, production compose, Kubernetes/deployment manifest, CI workflow, health/readiness route, metrics endpoint, or Redis application client in the repository.

## Known problems

- Environment schema requires initial-super-admin values even when normal API runtime does not invoke bootstrap; deployment must provide them.
- CORS origin is a single string, so multiple production origins are not represented without code/config design change.
- `/health`, `/healthz`, and `/metrics` are skipped by logger defaults but are not implemented.
- There is no verified backup/restore, monitoring, alerting, log collection/retention, or CI/CD process.

## Recommended future improvements

Add authenticated/unprivileged readiness/health semantics, metrics and alerting, a production deployment/migration runbook, secret manager integration, a shared limiter store only if Redis becomes an owned dependency, and test graceful shutdown.
