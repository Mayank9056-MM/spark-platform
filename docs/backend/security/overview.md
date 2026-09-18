# Security overview

## Current implementation

The API layers Helmet, HPP, request-size limits, constrained CORS, an IP rate limiter, Bearer JWT authentication, RBAC permission checks, Zod validation, Argon2 password hashing, opaque hashed refresh tokens, request IDs, and error message hiding. Password hashes are not mapped into user responses. `TRUST_PROXY` is validated/configurable and defaults false to avoid blindly accepting forwarded IPs.

## Known problems

The verified findings are in [security findings](security-findings.md). The highest-priority issue is non-atomic refresh rotation, which defeats the intended single-use guarantee under concurrent requests. Operational protections are incomplete: the limiter is in-memory, refresh is not auth-rate-limited, audit append-only is not DB-enforced, and no CI/test suite verifies security paths.

## Recommended future improvements

Prioritize SEC-001, then deploy shared rate limiting, establish database runtime roles, add security integration tests, and verify production cookie/proxy settings before exposure.
