# ADR-002: Prisma/PostgreSQL transactional persistence

## Status

Observed/inferred from schema, migration, and services.

## Context

The workspace has a Prisma schema, PostgreSQL migration lock/baseline, Prisma PG adapter, and services using interactive transactions.

## Decision

Use Prisma over PostgreSQL with schema/migration source in `packages/database`; use transaction clients for multi-record Phase-1 mutations and transactional audit rows.

## Alternatives considered

Not recorded in the repository.

## Consequences

Typed relations, FK/unique constraints, and transactions provide useful protection. Cross-table/polymorphic rules remain service-level; runtime audit immutability is not yet DB-enforced.

## Future revisit conditions

Revisit after operational backup/restore, runtime roles, schema evolution policy, and high-contention concurrency requirements are established.
