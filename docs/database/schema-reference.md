# ERP Platform — Database Schema Reference

**Audience:** engineers working in `packages/database` or any app consuming `@repo/database`.
**Source of truth:** `packages/database/prisma/schema.prisma`
**Database:** PostgreSQL, accessed via Prisma ORM 7 (Rust-free client, config via `prisma.config.ts`).

This document explains _what each model is for_, _how the domains connect_, and _why certain non-obvious modeling decisions were made_. Read this before writing a migration or a new query module — several relationships here are denormalized or polymorphic on purpose, and "fixing" them without context will break invariants elsewhere.

---

## 1. How to read this schema

A few conventions apply everywhere, so they're explained once here instead of repeated per model:

| Pattern                                                                                                | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizationId` on a model that also reaches its org through a parent (e.g. `Program.organizationId`) | **Deliberate denormalization.** It avoids a multi-hop join for tenant-scoped queries and leaves room for future partitioning by `organizationId`. It is _not_ a data-integrity backstop — the app layer must keep it in sync with the parent's org on writes.                                                                                                                                                                                                                                                                                                                 |
| `deletedAt DateTime?`                                                                                  | Soft delete. Present on models where a record might legitimately need to disappear from normal views but must be recoverable/auditable (`User`, `Role`, `Organization`, `Assignment`, `StudyMaterial`, `Notice`, `CalendarEvent`, `Document`). Absent on models that represent structural/historical facts that should never be deleted, only re-statused (`Department`, `Program`, `CurriculumVersion`, `AcademicYear`, `Division`, `Subject`). Every query against a soft-deletable model must filter `deletedAt: null` explicitly — Prisma does not do this automatically. |
| `xxxByUserId` fields (`createdByUserId`, `gradedByUserId`, `decidedByUserId`, etc.)                    | Actor tracking. Always a plain FK to `User`, never a computed/derived value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Enum-scoped polymorphic pointer (`scopeType` + `scopeId`, or `ownerType` + `ownerId`)                  | Used in `RoleAssignment`, `NoticeAudience`, `CalendarEvent`, and `Document`. These are **not** enforced by a database foreign key — Prisma cannot express a FK that targets different tables depending on a sibling column. Referential integrity for these fields is an **application-layer responsibility**. See §12.3.                                                                                                                                                                                                                                                     |
| No `updatedAt` on a model that has `createdAt`                                                         | Signals an intentionally immutable record (currently only `PromotionDecision`). Once written, it must never be updated in place — corrections happen via a new row/decision, not a mutation.                                                                                                                                                                                                                                                                                                                                                                                  |
| Implicit indexes                                                                                       | Prisma automatically creates a database index on every foreign-key scalar column. You do not need to add `@@index([xxxId])` manually just to speed up a join on a single FK — only add explicit indexes for **composite** filter/sort patterns not already covered by a `@@unique` or another `@@index`.                                                                                                                                                                                                                                                                      |

---

## 2. Domain map

```
DOMAIN 1  Identity        Organization, User, Role/Permission, RoleAssignment, Session, tokens
DOMAIN 2  Academic Struct. Department, Program, CurriculumVersion, SemesterCatalog, AcademicYear, Division
DOMAIN 3  Student Lifecycle Admission → StudentEnrollment → SemesterEnrollment → PromotionBatch/Decision
DOMAIN 4  Curriculum       Subject, SubjectComponent, ElectiveGroup, SubjectOffering, StudentElectiveSelection
DOMAIN 5  Teaching         FacultyAssignment, Room, TimeSlot, Timetable, Lecture
DOMAIN 6  Attendance       AttendanceSession, AttendanceRecord
DOMAIN 7  Coursework       Assignment, AssignmentSubmission, StudyMaterial
DOMAIN 8  Communication    Notice/NoticeAudience, Notification/NotificationRecipient, CalendarEvent
DOMAIN 9  System            Document, AuditLog, OrganizationSetting
```

Read order for a new engineer: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**. Domains 3–7 form the operational core; 1, 8, 9 are cross-cutting.

There is **no separate `Student`/`Faculty`/`Staff` model.** Everyone is a `User`; their role in the institution is entirely determined by their `RoleAssignment` rows plus, for students specifically, the presence of an `Admission` and `StudentEnrollment`. Don't create a parallel "profile" table per role without a strong reason — it duplicates identity data that already lives on `User`.

---

## 3. Domain 1 — Identity (Tenancy, Users, RBAC, Sessions)

### Organization

The tenant root. Everything in the system hangs off an `organizationId` somewhere in its ancestry.

- `status`: `ACTIVE | SUSPENDED | ARCHIVED` — gate access at the auth/middleware layer on this, not just on individual `User.status`.
- `slug`: unique, used for tenant resolution (e.g. subdomain or path-based routing).

### User

One row per human, regardless of role (student, faculty, admin, staff all live here).

- `email` is unique **per organization**, not globally (`@@unique([organizationId, email])`). The same email can exist in two different tenant orgs as two different `User` rows. **Design implication:** if your login flow doesn't already know which org a user belongs to (e.g., no subdomain-based tenant resolution), you cannot look up a user by email alone — you need an org-selection step first, or add a genuinely global lookup index/table if cross-org login-by-email is required.
- `passwordHash` is nullable — supports invited-but-not-yet-activated users and future SSO-only accounts.
- `status`: `PENDING_ACTIVATION | ACTIVE | SUSPENDED | LOCKED | DEACTIVATED | ARCHIVED`.
- `failedLoginAttempts` / `lockedUntil` — basic brute-force lockout support; pair with `Session`/`RefreshToken` revocation on lock.

### Role / Permission / RolePermission

Standard RBAC catalog. `Permission` is global (shared catalog across all tenants); `Role` is per-organization, so each tenant can compose its own roles from the shared permission catalog. `isSystemDefined` marks roles that ship with the platform and probably shouldn't be editable/deletable from tenant admin UIs.

### RoleAssignment

The actual grant: `user` + `role` + `scopeType` (`ORGANIZATION | DEPARTMENT | DIVISION`) + optional `scopeId`.

- `organizationId` here is the denormalization pattern from §1 — enables org-scoped permission queries without joining through `User`.
- `role` relation uses `onDelete: Restrict` — you physically cannot delete a `Role` while it's still assigned to anyone. Revoke/reassign first.
- `grantedByUserId` is nullable with `onDelete: SetNull` — preserves the assignment if the granting admin's account is later removed.
- **Known gap:** nothing prevents two overlapping _active_ assignments of the same role+scope to the same user (see main review — consider a partial unique index if your permission-resolution logic assumes at most one active grant per role+scope).
- **Known gap:** `scopeType` has no `PROGRAM` level. If program-level roles (e.g. "Program Coordinator") are needed, this enum needs extending.

### Session / RefreshToken

Standard rotating-refresh-token session model. `Session` tracks device/location metadata for "your active sessions" UI and bulk revocation; `RefreshToken` is the actual rotating credential, always scoped to a `Session` and cascade-deleted with it.

### VerificationToken

Single-purpose, single-use tokens (`ACCOUNT_ACTIVATION | INVITE_USER | PASSWORD_RESET | EMAIL_CHANGE`). The `metadata Json?` field is a deliberate, narrow exception to normalization — e.g. holding the pending new email address for an `EMAIL_CHANGE` token until it's consumed, rather than adding a `pendingEmail` column to `User` that's meaningless 99% of the time.

---

## 4. Domain 2 — Academic Structure

Hierarchy: **Department → Program → CurriculumVersion → SemesterCatalog**, orthogonally crossed with **AcademicYear → Division**.

- **Department**: top-level academic unit (e.g. "Computer Engineering").
- **Program**: a degree offered by a department (e.g. "B.Tech CSE"), with `durationYears`/`totalSemesters`.
- **CurriculumVersion**: a _versioned_ syllabus for a program (`DRAFT | ACTIVE | RETIRED`). This is the key to safely evolving curricula: editing a curriculum creates/updates a `DRAFT` version rather than mutating what current students are already enrolled under.
- **SemesterCatalog**: one row per semester number within a curriculum version (e.g. "Semester 3 of CSE-2024"). This is what `Subject` rows actually hang off — subjects belong to a specific semester of a specific curriculum version, not to the `Program` directly.
- **AcademicYear**: a real academic term/session (e.g. "2025-26"). `isActive` marks the current one; enforcing "only one active year per org" is an **app-layer rule**, not a DB constraint — validate it in the service that flips this flag.
- **Division**: an actual class section (e.g. "CSE Div A, 2025-26") — the intersection of a `Program`, an `AcademicYear`, and a `Department`. This is where students physically sit for attendance/timetable purposes.

**Why `SemesterCatalog` and `Division` are different things:** `SemesterCatalog` answers "what should be taught in semester 3 of this curriculum" (a syllabus concept, timeless). `Division` answers "which real group of students, in which real year" (an operational concept, time-bound). A `SubjectOffering` (Domain 4) is what connects the two.

---

## 5. Domain 3 — Student Lifecycle

This is the most carefully modeled part of the schema — read it closely before touching it.

### Admission

The **one-time, permanent, historical record** of how a student entered the institution. It is deliberately **not** the same thing as enrollment — a student's ongoing academic status changes constantly, but the fact that they were admitted via, say, `LATERAL_ENTRY` on a specific date never changes.

- `userId` is `@unique` — one admission per user, ever.
- **Edge case to confirm with product:** because `userId` is unique and `status` can be `CANCELLED`, a user whose admission is cancelled can never receive a _new_ `Admission` row under the current schema. If "cancel and properly re-admit the same person later" needs to be a real, first-class flow, this constraint needs revisiting.

### StudentEnrollment

The ongoing academic record: which `Program`, which `CurriculumVersion` (**locked at the time of enrollment** — a later curriculum revision does not retroactively change what an already-enrolled student is expected to study), `rollNumber`, and lifecycle `status` (`ACTIVE | ON_GAP_YEAR | WITHDRAWN | DISCONTINUED | GRADUATED | ALUMNI`).

- A user _can_ have more than one `StudentEnrollment` over time (no unique constraint on `userId` alone) — covers transfers, dual programs, or a `READMISSION`-type re-entry after withdrawal, all without needing a second `Admission` row.

### SemesterEnrollment

One **attempt** at one semester. `attemptNumber` increments on a repeat (`unique([studentEnrollmentId, semesterCatalogId, attemptNumber])`), so a detained/failed semester doesn't overwrite history — it gets a new attempt row.

- This is the row that `AttendanceRecord`, `AssignmentSubmission`, and `StudentElectiveSelection` all key off — **always tie those to `semesterEnrollmentId`, never directly to `userId` or `StudentEnrollment`.** This keeps every academic record correctly scoped to _which specific term/attempt_ it happened in.

### PromotionBatch / PromotionDecision

Modeling a promotion cycle as an explicit, auditable batch process rather than an ad-hoc status update:

- `PromotionBatch` = "the promotion run for Division X, Academic Year Y" (`DRAFT → FINALIZED`).
- `PromotionDecision` = one immutable decision per student in that batch (`PROMOTE | REPEAT | WITHDRAW | DISCONTINUE | GRADUATE`), linking the `SemesterEnrollment` it **closes** (`fromSemesterEnrollmentId`, always required) to the one it **opens** (`toSemesterEnrollmentId`, nullable — null for terminal outcomes like `WITHDRAW`/`GRADUATE`).
- **Deliberately no `updatedAt`** — a promotion decision, once made, is a permanent audit record. Corrections must be modeled as a new decision, never an edit.
- No DB constraint currently caps a division+year at one `FINALIZED` batch — confirm with product whether re-running/correcting a finalized promotion cycle is a valid scenario.

---

## 6. Domain 4 — Curriculum (Subjects, Components, Electives)

### Subject

Belongs to a `SemesterCatalog` (not directly to a `Program`). `isElective` + optional `electiveGroupId` distinguish core subjects (`electiveGroupId: null`) from elective options.

### ElectiveGroup

Groups mutually exclusive elective choices within one semester (e.g. "Open Elective Group 1: choose one of Python / AI / Cloud"). `minSelect`/`maxSelect` define the choice cardinality.

### StudentElectiveSelection

Records which subject a student picked from a group, for a given `SemesterEnrollment`.

- **Known, documented simplification:** `unique([semesterEnrollmentId, electiveGroupId])` assumes exactly one selection per group — correct for the common `maxSelect = 1` case. If any group ever needs `maxSelect > 1`, this constraint must be dropped and replaced with an app-layer count check against `ElectiveGroup.maxSelect`.

### SubjectComponent

Splits a subject into `THEORY | PRACTICAL | TUTORIAL | PROJECT` parts, each with its own `credits`/`hoursPerWeek`. Exists as a separate model (rather than boolean flags on `Subject`) specifically so components can have different faculty, credit weights, and timetable slots — flattening this back onto `Subject` breaks the moment any subject has 2+ parts.

### SubjectOffering

The "this subject is being taught to this division this year" row — one per `(subject, division, academicYear)`, regardless of how many components or faculty are involved. Everything operational (faculty assignments, timetable entries, lectures, assignments, study materials) hangs off the `SubjectOffering`, not off `Subject` directly.

---

## 7. Domain 5 — Teaching (Faculty, Rooms, Timetable, Lectures)

### FacultyAssignment

"This faculty member teaches this component of this offering." MVP-simplified to **one faculty per (offering, component)** — no batch/section-within-division dimension yet (`unique([subjectOfferingId, subjectComponentId])`). If lab batches (e.g. splitting a division into Batch 1/2 for practicals with different faculty) become a requirement, this model needs a `batchId`/batch dimension added.

### Room / TimeSlot

Static resources. `TimeSlot` uses `@db.Time` for start/end (correct — no date component needed) and covers `MONDAY`–`SATURDAY` only (no Sunday — confirm this matches your institution's calendar before assuming it's a bug).

### Timetable

The **recurring pattern**: "this offering+component, taught by this faculty, happens every Tuesday 10–11am in Room 204, from `effectiveFrom` until `effectiveTo`." Changes mid-term (room swap, faculty change) close the old row (`effectiveTo` set) rather than editing it in place — this preserves an accurate history of what the timetable actually was on any given past date.

- **No DB-level double-booking prevention.** Nothing stops the same room or faculty member being assigned to two different `Timetable` rows at the same `timeSlotId` with overlapping active ranges. This must be enforced at the service layer (or via a partial unique index — see main review, §1).
- `subjectComponentId` and `facultyAssignmentId` here duplicate information already implied by `subjectOfferingId` + `FacultyAssignment` — this is intentional denormalization for query convenience, but means the three fields _can_ drift out of consistency if not validated together on write.

### Lecture

The **actual dated occurrence** — where attendance attaches. `timetableId` is nullable so an ad-hoc extra class doesn't require faking a recurring `Timetable` row behind it. `unique([subjectOfferingId, scheduledDate, startTime])` prevents duplicate lecture records for the same offering/slot, but (like `Timetable`) has no cross-check against room/faculty double-booking with an unrelated offering.

---

## 8. Domain 6 — Attendance

### AttendanceSession

One per `Lecture` (`lectureId @unique`) — deliberately no batch dimension, since the `Lecture` already carries the division. `status: OPEN | LOCKED` — lock a session once attendance is finalized to prevent further edits (enforce this at the service layer; the DB doesn't block writes to a locked session's records on its own).

### AttendanceRecord

One row per `(attendanceSession, semesterEnrollment)` (`@@unique`), `status: PRESENT | ABSENT | LATE | EXCUSED`. Ties to `semesterEnrollmentId` (not `userId`) — consistent with the Domain 3 convention of anchoring all academic activity to the specific term/attempt. `correctedAt`/`correctionReason` support post-hoc corrections without losing the original marking context.

---

## 9. Domain 7 — Coursework (Assignments & Study Material)

### Assignment / AssignmentSubmission

`Assignment` belongs to a `SubjectOffering`. `AssignmentSubmission` is `unique([assignmentId, semesterEnrollmentId])` — **one submission row per student per assignment.** Resubmission (`status: RESUBMISSION_REQUESTED`) overwrites the same row rather than creating a new versioned attempt.

> **Confirm with product:** if you need to show a student's full submission history (e.g. "you submitted 3 times, here's each file"), this schema does not support it as-is — you'd need a child `SubmissionAttempt` table. If only the latest state matters, current design is fine.

### StudyMaterial

Simple: title/description/file, belongs to a `SubjectOffering`, soft-deletable.

### Attachments

Neither model has its own attachment table — file attachments for both go through the shared `Document` model in Domain 9 (`ownerType: ASSIGNMENT | ASSIGNMENT_SUBMISSION | STUDY_MATERIAL | NOTICE`).

---

## 10. Domain 8 — Communication

### Notice / NoticeAudience

`Notice` is the content (`publishedAt: null` = still a draft). `NoticeAudience` is a **separate table**, not a single `scopeType`/`scopeId` pair directly on `Notice`, specifically because one notice may need to fan out to _multiple_ audiences at once (e.g. CS department AND Mechanical department simultaneously) — a single scope pair can't express that.

### Notification / NotificationRecipient

Split for the same reason many notification systems split content from delivery: a notice going out to 500 students shouldn't duplicate `title`/`body` 500 times. One `Notification` row (with a `metadata Json?` polymorphic payload, e.g. `{ assignmentId }`), many `NotificationRecipient` rows tracking per-user `deliveredAt`/`readAt`.

### CalendarEvent

Reuses the same `ScopeType` enum as `RoleAssignment`/`NoticeAudience` (`ORGANIZATION | DEPARTMENT | DIVISION`) rather than inventing a parallel one. Same caveat as other scope-based polymorphic fields: no DB-level FK, app-layer responsibility to keep `scopeId` valid for the given `scopeType`.

---

## 11. Domain 9 — System (Documents, Audit, Settings)

### Document

Metadata-only row — actual file bytes live in object storage (`storageKey` is the S3/R2 path/key). Polymorphic owner (`ownerType` + `ownerId`) covers `ASSIGNMENT | ASSIGNMENT_SUBMISSION | STUDY_MATERIAL | NOTICE`.

- **No DB-level FK** on `ownerId` (same polymorphic limitation as §12.3) — deleting an owning row won't cascade to its `Document` rows, so they can become orphaned unless cleaned up by a job or the owner models stay soft-delete-only.
- `sizeBytes` is `Int` (max ~2.1GB) — fine for typical PDFs/images; switch to `BigInt` before you need to support large file/video uploads.

### AuditLog

`organizationId` and `actorUserId` are both nullable — some actions are platform-level (no single tenant) or system-initiated (no human actor, e.g. a scheduled job). `oldValue`/`newValue` as `Json?` capture arbitrary before/after state per action. `entityType` is a free string rather than an enum, since it needs to reference many different model names — reasonable pragmatic choice for an audit trail.

### OrganizationSetting

Generic per-org key/value store (`value Json`) — intentionally loose so new settings don't require a schema migration each time. Use for genuinely tenant-configurable toggles/preferences, not for anything that needs to be queried/filtered on (that should be a real column somewhere).

---

## 12. Cross-cutting patterns (read this before adding a new model)

### 12.1 Multi-tenancy

Every query that touches tenant data must be scoped by `organizationId`, either directly (many models carry it) or by joining up to a parent that does. There is currently no single enforced entry point (like a Prisma middleware or extension) guaranteeing this — it relies on every service function remembering to filter correctly. **Recommendation for anyone extending this:** wrap tenant-scoped Prisma calls in a shared repository/service layer rather than calling `prisma.model.findMany()` directly from route handlers, so tenant scoping can't be forgotten.

### 12.2 Soft delete

Only some models have `deletedAt` (see §1 table). When adding a query against a soft-deletable model, always filter `deletedAt: null` explicitly unless you specifically want to include deleted rows (e.g. an admin "trash" view).

### 12.3 Polymorphic associations — no DB-level integrity

Four places use a `type` + `id` pair pointing at "whichever table `type` says": `RoleAssignment.scopeId`, `NoticeAudience.scopeId`, `CalendarEvent.scopeId`, `Document.ownerId`. None of these have a real foreign key (Prisma can't express a conditional FK). Consequences to design around:

- Deleting the "target" row does **not** cascade or restrict — you can end up with a `scopeId`/`ownerId` pointing at nothing.
- There's no DB-level guarantee the `scopeId`/`ownerId` even points at a row of the right table.
- Any service that writes these fields must validate the target exists and matches the declared type; any service that deletes a potential target must consider whether it needs to clean up references.

### 12.4 "Shadow" denormalized FK triples

`FacultyAssignment`, `Timetable`, and `Lecture` each carry more than one FK that _should_ agree with each other (e.g. a `Timetable`'s `subjectComponentId` should belong to the same subject as its `subjectOfferingId`). This is intentional — it avoids extra joins on hot read paths (timetable rendering, lecture listing) — but it means writes to these models need a shared validation helper rather than relying on the database to catch mismatches.

### 12.5 Immutable audit-style records

`PromotionDecision` (no `updatedAt`) is the current example. If you add another "this happened and must never be edited" concept later (e.g. a grade-finalization record), follow the same pattern: `createdAt` only, corrections via a new row, not an update.

---

## 13. Known limitations / follow-up list

Use this as a literal punch list — check items off as they're addressed, or explicitly mark "confirmed as intended" once discussed with product.

| #   | Item                                                                            | Type                                                            |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | No DB-level prevention of room/faculty double-booking in `Timetable`/`Lecture`  | Bug risk — recommend partial unique indexes                     |
| 2   | `FacultyAssignment`/`Timetable`/`Lecture` shadow FK triples not cross-validated | Bug risk — needs shared validation helper                       |
| 3   | Polymorphic `scopeId`/`ownerId` fields have no FK, no cascade/orphan handling   | Bug risk — needs policy decision                                |
| 4   | `RoleAssignment` allows duplicate/overlapping active grants                     | Bug risk — consider partial unique index                        |
| 5   | Most relations rely on implicit `onDelete` behavior instead of being explicit   | Maintainability — make explicit everywhere                      |
| 6   | `Document.sizeBytes` is `Int32`, caps at ~2.1GB                                 | Future-proofing — switch to `BigInt`                            |
| 7   | `deletedAt` presence is inconsistent across Domain 2/4 models                   | Consistency — document the intended policy                      |
| 8   | Generator uses deprecated `prisma-client-js` instead of `prisma-client`         | Tooling — confirm intentional (Next.js/Turbopack compatibility) |
| 9   | `ScopeType` has no `PROGRAM` level                                              | Open question for product                                       |
| 10  | `AssignmentSubmission` has no resubmission history (overwrite-in-place)         | Open question for product                                       |
| 11  | `PromotionBatch` allows multiple batches per division+year with no uniqueness   | Open question for product                                       |
| 12  | `Admission.userId` uniqueness blocks re-admission after `CANCELLED` status      | Open question for product                                       |
| 13  | `TimeSlot` has no uniqueness guard against duplicate slot templates             | Minor                                                           |

---

## 14. Enum glossary

| Enum                       | Values                                                                                       | Used by                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `OrganizationStatus`       | ACTIVE, SUSPENDED, ARCHIVED                                                                  | Organization                                  |
| `UserStatus`               | PENDING_ACTIVATION, ACTIVE, SUSPENDED, LOCKED, DEACTIVATED, ARCHIVED                         | User                                          |
| `ScopeType`                | ORGANIZATION, DEPARTMENT, DIVISION                                                           | RoleAssignment, NoticeAudience, CalendarEvent |
| `VerificationPurpose`      | ACCOUNT_ACTIVATION, INVITE_USER, PASSWORD_RESET, EMAIL_CHANGE                                | VerificationToken                             |
| `CurriculumStatus`         | DRAFT, ACTIVE, RETIRED                                                                       | CurriculumVersion                             |
| `AdmissionType`            | REGULAR, LATERAL_ENTRY, MANAGEMENT_QUOTA, GOVERNMENT_QUOTA                                   | Admission                                     |
| `AdmissionStatus`          | CONFIRMED, CANCELLED                                                                         | Admission                                     |
| `EnrollmentType`           | REGULAR, LATERAL_ENTRY, READMISSION                                                          | StudentEnrollment                             |
| `StudentLifecycleStatus`   | ACTIVE, ON_GAP_YEAR, WITHDRAWN, DISCONTINUED, GRADUATED, ALUMNI                              | StudentEnrollment                             |
| `SemesterEnrollmentStatus` | IN_PROGRESS, PROMOTED, REPEATED, DETAINED, WITHDRAWN, DISCONTINUED, GRADUATED                | SemesterEnrollment                            |
| `PromotionBatchStatus`     | DRAFT, FINALIZED                                                                             | PromotionBatch                                |
| `PromotionOutcome`         | PROMOTE, REPEAT, WITHDRAW, DISCONTINUE, GRADUATE                                             | PromotionDecision                             |
| `SubjectComponentType`     | THEORY, PRACTICAL, TUTORIAL, PROJECT                                                         | SubjectComponent                              |
| `RoomType`                 | LECTURE_HALL, LABORATORY, SEMINAR_HALL                                                       | Room                                          |
| `DayOfWeek`                | MONDAY … SATURDAY (no Sunday)                                                                | TimeSlot                                      |
| `LectureStatus`            | SCHEDULED, COMPLETED, CANCELLED                                                              | Lecture                                       |
| `AttendanceSessionStatus`  | OPEN, LOCKED                                                                                 | AttendanceSession                             |
| `AttendanceStatus`         | PRESENT, ABSENT, LATE, EXCUSED                                                               | AttendanceRecord                              |
| `SubmissionStatus`         | SUBMITTED, LATE, GRADED, RESUBMISSION_REQUESTED                                              | AssignmentSubmission                          |
| `NotificationType`         | NOTICE_PUBLISHED, ASSIGNMENT_DUE, ATTENDANCE_LOW, GRADE_POSTED, ROLE_GRANTED, GENERIC        | Notification                                  |
| `CalendarEventType`        | HOLIDAY, EXAM, WORKSHOP, SEMINAR, PLACEMENT, TECH_FEST, SPORTS, MEETING, OTHER               | CalendarEvent                                 |
| `DocumentOwnerType`        | ASSIGNMENT, ASSIGNMENT_SUBMISSION, STUDY_MATERIAL, NOTICE                                    | Document                                      |
| `AuditAction`              | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ROLE_GRANTED, ROLE_REVOKED, PERMISSION_CHANGED, OTHER | AuditLog                                      |

---

_Last reviewed against `schema.prisma` as of this document's creation. If you change a model's cascade behavior, uniqueness constraints, or add a new polymorphic pattern, update the relevant section above in the same PR._
