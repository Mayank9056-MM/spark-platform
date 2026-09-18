# ADR-001: Modular monolith and service/repository layering

## Status

Observed/inferred from implementation.

## Context

The API is one Express process with modules under `apps/api/src/modules`; domain routes are mounted by `app.ts` and share a database.

## Decision

Use module-local route/controller/service/repository/mapper/validation files within a single deployable API.

## Alternatives considered

Not recorded in the repository.

## Consequences

Shared cross-cutting infrastructure is straightforward; module boundaries are source conventions rather than process isolation. Route-only RBAC and undocumented persistence-only dependencies require continuing review.

## Future revisit conditions

Revisit if independent deployment/scaling or stronger bounded-context isolation becomes necessary.
