# Constraints, indexes, deletion, and migrations

## Verified constraints

- Unique keys protect identity (`users.email`), role/permission names, active natural academic identifiers, admission number, enrollment admission/roll number, semester attempt triple, decisions, offerings, assignments, attendance, and notification recipients.
- FKs use `RESTRICT` for most historical academic references, `CASCADE` for owned child rows such as role permissions, sessions→tokens, components, attendance session→records, and `SET NULL` where attribution/history may remain after actor deletion.
- Migration SQL includes PostgreSQL `CHECK` constraints and partial indexes in addition to Prisma declarations. The schema comments identify service-enforced cross-table invariants such as attendance eligibility and polymorphic scopes.
- Relevant indexes cover common lifecycle/list filters: user/session context, academic year/state, enrollment state, batch/decision lookups, offering/year, faculty/lecture date, attendance, and audit retrieval.

## Database versus application invariants

| Invariant                                                           | Enforcement                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| One attendance session per lecture / one record per student/session | database unique constraints                                 |
| Exactly one subject offering per subject/year                       | database unique constraint                                  |
| Promotion decision source unique / batch student unique             | database unique constraints                                 |
| Promotion state and outcome effects                                 | service transaction + guarded update                        |
| Catalog hierarchy and attendance eligibility                        | service joins/checks; not expressible as one local FK/check |
| Scope ID correctness and document owner existence                   | service-level only; future APIs absent                      |
| Audit append-only                                                   | application convention only, not DB privileges              |

## Migration baseline

`prisma.config.ts` loads `DATABASE_URL`; package scripts provide `db:validate`, `db:generate`, deploy/migrate/reset/studio. The migration lock specifies PostgreSQL. No migration history beyond the initial finalized baseline was found. This makes a fresh baseline conceptually simple but concentrates schema evolution in one large SQL file.

## Known problems

- No database-level audit immutability/runtime role separation.
- No verified backup/restore, production pooling, or migration deployment runbook.
- Timetable overlap integrity is not protected by a PostgreSQL exclusion constraint in the baseline.

## Recommended future improvements

Add migration review checks in CI, perform and document restore drills, grant the runtime role INSERT/SELECT-only permissions on audit logs, and add database-native scheduling conflict protection where the business rule requires it.
