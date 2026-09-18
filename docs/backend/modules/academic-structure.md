# Academic structure modules

## Current implementation

The academic aggregate is implemented under `modules/academic` plus `academic-years`. Every mounted module follows `requireAuth → authorize → validate → controller → service → repository`.

| Module              | Models / lifecycle                                                                   | API capability                                   |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Departments         | `Department`; unique code                                                            | CRUD, `department:*`                             |
| Programs            | belongs to Department; duration/semester count validation                            | CRUD, `program:*`                                |
| Curriculum versions | belongs to Program; `DRAFT → ACTIVE → RETIRED` guarded service transitions           | CRUD plus activate/retire, `curriculumVersion:*` |
| Semester catalogs   | belongs to CurriculumVersion; numbered catalog rows                                  | CRUD, `semesterCatalog:*`                        |
| Subjects/components | subject belongs to catalog, optional elective group; components cascade with subject | CRUD, `subject:*`                                |
| Elective groups     | catalog-scoped groups                                                                | CRUD, `electiveGroup:*`                          |
| Academic years      | dates/active flag                                                                    | CRUD plus `/:id/activate`, `academicYear:*`      |

Services re-read related rows in transactions before mutation and use `recordAuditTx`. Repositories provide `*Tx` variants for service transactions. Database constraints protect key uniqueness, foreign keys, and dependent deletions; migration SQL also carries PostgreSQL checks/partial indexes where Prisma cannot express them.

## Invariants and historical data

- Curriculum status transitions and active-year behavior are enforced in services; callers cannot use generic state fields to transition these lifecycles.
- Catalog/subject/program relationships are verified in services and protected by FKs.
- Subject code is unique per catalog; component type is unique per subject; elective group name is unique per catalog.
- Deletion generally checks historical references before allowing mutation rather than relying on cascading academic-history deletion.

## Known problems

- The Prisma schema includes future-domain relationships beyond API ownership; schema growth should not be mistaken for implemented features.
- No automated tests validate lifecycle transitions, FK conflict mapping, or service-level historical protections.
- Service read-then-write rules need concurrency tests: constraints catch several duplicate races, but user-friendly domain errors depend on prechecks.

## Recommended future improvements

Add integration tests for all lifecycle commands and database constraints; document/implement administrative provisioning for room/time-slot catalogs; add explicit database constraints for invariants that are currently only safely expressible via a single-table check where feasible.
