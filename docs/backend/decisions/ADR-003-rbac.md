# ADR-003: Database-backed RBAC with fresh permission resolution

## Status

Observed/inferred from RBAC module, permission catalog, and auth JWT payload.

## Context

Roles, permissions, and scoped assignments are persisted; JWT intentionally carries only user/session IDs.

## Decision

Resolve current role permissions and scopes for each protected request through central `authorize` middleware rather than embedding roles in access tokens.

## Alternatives considered

Not recorded in the repository.

## Consequences

Role changes take effect without waiting for token expiry. The policy vocabulary currently reuses parent resources for subject offerings and semester enrollments; object-level checks must be implemented where route permission is insufficient.

## Future revisit conditions

Revisit if performance measurement requires caching or if policy demands a richer resource/scope model.
