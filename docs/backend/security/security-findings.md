# Security findings

## SEC-001 — Refresh-token rotation is non-atomic

**Severity:** HIGH  
**Component:** Authentication/session management  
**Location:** `apps/api/src/modules/auth/auth.service.ts`, `refreshTokens()`; `auth.repository.ts`, refresh revoke/create methods.  
**Evidence:** The service reads a token, checks `revokedAt`, later calls `revokeRefreshToken(existingToken.id)`, and then `issueTokenPair()`. These operations are separate repository calls and are not inside a transaction or guarded `UPDATE ... WHERE revokedAt IS NULL`.  
**Risk:** Two requests bearing the same live refresh token can interleave: both read it as unrevoked; both revoke it; both create a distinct, valid replacement. The second use is not recognized as reuse, defeating the single-use rotation/reuse-detection guarantee.  
**Scenario:** A browser retry and an attacker with a copied refresh token concurrently call `/auth/refresh`. Both may receive valid token pairs.  
**Recommendation:** Atomically consume the old token using a conditional update (and check affected count) within a transaction that creates the replacement; treat zero affected rows as reuse and revoke the session. Add a concurrent integration test.  
**Status:** Confirmed by code inspection; exploitability requires concurrent possession/use of a refresh token.

## SEC-002 — Refresh endpoint bypasses credential-specific limiter

**Severity:** MEDIUM  
**Component:** Rate limiting  
**Location:** `apps/api/src/modules/auth/auth.routes.ts`; `middlewares/rate-limit.middleware.ts`.  
**Evidence:** Login, activation, and reset routes install `authRateLimiter`; `POST /refresh` does not. It receives only global `rateLimiter`.  
**Risk:** A stolen/guessed token endpoint has a substantially weaker, general limiter and shares its budget with all API traffic.  
**Recommendation:** Apply a dedicated refresh limiter keyed appropriately and back production limiters with shared storage.  
**Status:** Confirmed configuration gap; no claim of token guessing feasibility.

## SEC-003 — Audit immutability is not database-enforced

**Severity:** MEDIUM  
**Component:** Audit trail  
**Location:** `packages/database/prisma/schema.prisma`, `AuditLog` comments; migration baseline.  
**Evidence:** Schema explicitly states application append-only behavior and that `REVOKE UPDATE/DELETE` for a separate runtime role is not configured. No migration creates such role/grants.  
**Risk:** A compromised or overly privileged runtime DB credential can alter/delete audit evidence.  
**Recommendation:** Separate migration/owner and runtime roles; grant runtime INSERT/SELECT only on `audit_logs`; monitor failed audit writes.  
**Status:** Confirmed deployment/security control gap.

## SEC-004 — Distributed rate limiting is absent

**Severity:** LOW  
**Component:** Availability/abuse protection  
**Location:** `middlewares/rate-limit.middleware.ts`; `infrastructure/docker/docker-compose.dev.yml`.  
**Evidence:** `express-rate-limit` is configured without an external store. Redis is started only by development compose and is unused by API code.  
**Risk:** Limits are per process and reset on restart; multi-instance deployments can multiply allowed request volume.  
**Recommendation:** Use a Redis or database-backed store after defining proxy/deployment topology.  
**Status:** Confirmed architecture limitation; impact depends on production topology.
