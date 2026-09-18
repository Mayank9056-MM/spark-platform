# Backend module inventory

## Implemented, mounted API modules

| Module              | Location                               | Public capabilities / RBAC resource                                                 | Models                                                                                                          | Tests | Current risk                                                             |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| Auth                | `modules/auth`                         | login, refresh, activation, reset, session management                               | User, Session, RefreshToken, VerificationToken                                                                  | none  | refresh rotation race; reset delivery absent                             |
| Users               | `modules/user`                         | self-service `/me`; admin lifecycle                                                 | User                                                                                                            | none  | `/me` service must be reviewed with object authorization tests           |
| RBAC                | `modules/rbac/*`                       | roles, permissions, assignments, authorization                                      | Role, Permission, RolePermission, RoleAssignment                                                                | none  | scope is route permission resolution, not universal object authorization |
| Audit               | `modules/audit`                        | internal write service only                                                         | AuditLog                                                                                                        | none  | append-only not enforced at DB role level                                |
| Academic structure  | `modules/academic/*`, `academic-years` | CRUD/lifecycle for departments/programs/curricula/catalogs/subjects/electives/years | Department, Program, CurriculumVersion, SemesterCatalog, Subject, SubjectComponent, ElectiveGroup, AcademicYear | none  | historical-state and concurrency rules are mostly service-level          |
| Admissions          | `modules/admissions`                   | create/read/update/cancel                                                           | Admission                                                                                                       | none  | prechecks rely on constraints for races                                  |
| Student enrollment  | `modules/student-enrollments`          | create/read/update/cancel/withdraw                                                  | StudentEnrollment                                                                                               | none  | no dedicated RBAC resource                                               |
| Semester enrollment | `modules/semester-enrollments`         | create/read                                                                         | SemesterEnrollment                                                                                              | none  | attempt-number concurrency relies partly on unique constraint            |
| Promotion           | `modules/promotion`                    | batches, decisions, finalization                                                    | PromotionBatch, PromotionDecision                                                                               | none  | complex workflow has no automated tests                                  |
| Subject offerings   | `modules/subject-offerings`            | create/read                                                                         | SubjectOffering                                                                                                 | none  | authorized as `subject`                                                  |
| Faculty assignments | `modules/faculty-assignments`          | create/read                                                                         | FacultyAssignment                                                                                               | none  | no faculty-role semantic check evident in service inventory              |
| Timetable           | `modules/timetables`                   | create/read                                                                         | Timetable                                                                                                       | none  | conflict protection should be DB-enforced/verified via tests             |
| Lectures            | `modules/lectures`                     | create/read/status actions                                                          | Lecture                                                                                                         | none  | needs lifecycle/concurrency tests                                        |
| Attendance          | `modules/attendance`                   | session/create/read/lock/bulk mark/correct                                          | AttendanceSession, AttendanceRecord                                                                             | none  | per-record checks can be query-heavy                                     |

## Persistence-only or unmounted modules

- `modules/rooms/room.repository.ts` and `modules/time-slots/timeSlot.repository.ts` are repositories only; neither is mounted in `app.ts`.
- `Assignment`, `StudyMaterial`, `Notice`, `Notification`, `CalendarEvent`, `Document`, and `SystemSetting` exist only in Prisma/migration. No matching API module was found.

## Shared infrastructure

| Component             | Location                     | Role                                                               |
| --------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Common response/error | `common/`                    | `ApiResponse`, pagination, `ApiError`, Prisma mapping              |
| Middleware            | `middlewares/`               | auth, validation, rate limit, errors, request logging              |
| Lib/config            | `lib/`, `config/env.ts`      | Prisma, JWT, password/token helpers, logger, validated environment |
| Database              | `packages/database`          | Prisma schema, generated client, PG adapter client                 |
| Shared logger         | `packages/shared/src/logger` | Winston factory/transports/serializers/context                     |

Detailed module groups: [identity/RBAC](identity-rbac.md), [academic](academic-structure.md), [lifecycle](student-lifecycle.md), and [delivery](delivery-attendance.md).
