# Practical threat model

## Assets and trust boundaries

Assets: password hashes, refresh-token hashes, access tokens in clients, RBAC assignments, academic history, attendance records, audit logs, and PostgreSQL. Trust boundaries: public HTTP → Express middleware, authenticated client → RBAC/service, service → Prisma/PostgreSQL, and process → configured reverse proxy/logging filesystem. Redis exists only in dev compose and is not an application trust boundary today. No file upload or external integration endpoint is implemented.

| Actor                            | Relevant capabilities / mitigations                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Unauthenticated/malicious client | login/reset/activation/refresh; Zod, limiters, dummy password check, opaque token hashing           |
| Authenticated student/faculty    | Bearer token, route RBAC; object-level authorization must be explicitly implemented per service     |
| Administrative user              | manages users/RBAC/academic state; transactional audit for most state mutation                      |
| Compromised account              | session listing/revocation/reset support; refresh reuse detection intended but has a race           |
| Concurrent request               | database constraints and selected guarded state updates; not all workflows atomically consume state |
| Database operator/runtime role   | can currently modify audit rows unless deployment permissions restrict it                           |

## STRIDE observations

- **Spoofing:** signature-verified JWT and opaque refresh hashing reduce token forgery; proxy trust must match topology.
- **Tampering:** validation, RBAC, transactions, and constraints help; audit table lacks database immutability.
- **Repudiation:** request IDs and audit fields exist; best-effort auth audit can be lost.
- **Information disclosure:** errors hide unhandled messages and mappers omit password hash; locked account response intentionally identifies the state after rate limit.
- **Denial of service:** global in-memory rate limit and 16 KiB parser cap help one process; no distributed limiter.
- **Elevation:** RBAC is centrally resolved per request; broad parent-resource permissions and route-only object checks are policy risks requiring test coverage.
