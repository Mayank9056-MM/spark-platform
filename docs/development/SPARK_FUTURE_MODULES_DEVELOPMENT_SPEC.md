# S.P.A.R.K. — Future Modules Development Specification

|                              |                                                                      |
| ---------------------------- | -------------------------------------------------------------------- |
| **Project**                  | S.P.A.R.K.                                                           |
| **Full Name**                | Strategic Platform for Analytics, Reports & Knowledgeflow            |
| **Client**                   | Cyber Sentinels — HVPM College of Engineering & Technology, Amravati |
| **System Type**              | Production-Grade College ERP / Campus Management Platform            |
| **Current Phase**            | Phase 1 Complete                                                     |
| **Document Status**          | Engineering Baseline for Future Development                          |
| **Architecture**             | Modular Monolith with SaaS-Ready Boundaries                          |
| **Primary Backend**          | TypeScript + Express.js                                              |
| **Database**                 | PostgreSQL                                                           |
| **ORM**                      | Prisma                                                               |
| **Frontend**                 | Next.js App Router + TypeScript                                      |
| **Monorepo**                 | Turborepo + pnpm                                                     |
| **Caching / Infrastructure** | Redis                                                                |
| **CI/CD**                    | GitHub Actions                                                       |
| **Testing**                  | Vitest + Integration/E2E testing                                     |
| **Last Updated**             | 2026-09-18                                                           |

---

## 1. Purpose of This Document

This document defines the engineering standards, architectural boundaries, implementation workflow, security requirements, testing expectations, and future module roadmap for S.P.A.R.K.

It exists to ensure that future modules are implemented consistently with the architecture established during Phase 1.

This document is **not** a generic CRUD development guide.

Every future module must integrate into the existing architecture without weakening:

- domain integrity
- authorization
- transaction boundaries
- auditability
- database consistency
- type safety
- API consistency
- testability
- maintainability
- production readiness

Future development must treat Phase 1 as the architectural baseline.

---

## 2. Current System Status

Phase 1 domain implementation is complete.

Current major domains include:

- Authentication
- RBAC
- Academic Structure
- Departments
- Programs
- Curricula
- Semester Catalog
- Subjects
- Electives
- Academic Years
- Admissions
- Student Enrollment
- Semester Enrollment
- Promotion
- Faculty
- Faculty Assignment
- Rooms
- Time Slots
- Timetable
- Lectures
- Attendance
- Audit

The Phase 1 lifecycle is:

```text
Department
    ↓
Program
    ↓
Curriculum
    ↓
Curriculum Activation
    ↓
Semester Catalog
    ↓
Subjects / Electives
    ↓
Academic Year
    ↓
Admission
    ↓
Student Enrollment
    ↓
Semester Enrollment
    ↓
Faculty
    ↓
Subject Offering
    ↓
Faculty Assignment
    ↓
Room / Time Slot
    ↓
Timetable
    ↓
Lecture
    ↓
Attendance Session
    ↓
Attendance
    ↓
Attendance Lock
    ↓
Promotion
    ↓
Next Semester
    ↓
Graduation
```

Future modules must integrate with these established concepts instead of creating parallel representations.

---

## 3. Core Technology Stack

### Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Recharts
- Lucide Icons

### Backend

- Node.js
- Express.js
- TypeScript
- Zod
- Prisma
- PostgreSQL
- Redis

### Infrastructure

- Docker
- GitHub Actions
- Linux
- CI/CD

### Repository

- Turborepo
- pnpm workspaces

---

## 4. Architectural Philosophy

S.P.A.R.K. follows a **modular-monolith** architecture.

The system is intentionally **not** being implemented as microservices at this stage.

The architecture should preserve clear module boundaries so that future extraction into services remains possible if scale requires it.

The backend follows this request path:

```text
HTTP Request
    ↓
Route
    ↓
Authentication
    ↓
Authorization / RBAC
    ↓
Validation
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
PostgreSQL
```

The reverse (response) path is:

```text
PostgreSQL
    ↓
Prisma
    ↓
Repository
    ↓
Service
    ↓
DTO / Mapper
    ↓
Controller
    ↓
ApiResponse
    ↓
HTTP Response
```

---

## 5. Mandatory Module Structure

Every future backend module should follow the established modular structure:

```text
modules/
└── <module>/
    ├── index.ts
    ├── <module>.types.ts
    ├── <module>.validation.ts
    ├── <module>.mapper.ts
    ├── <module>.repository.ts
    ├── <module>.service.ts
    ├── <module>.controller.ts
    ├── <module>.routes.ts
    └── __tests__/
        ├── <module>.service.test.ts
        ├── <module>.repository.test.ts
        ├── <module>.integration.test.ts
        └── <module>.e2e.test.ts
```

Not every module must contain every file. Files should exist only when their responsibilities are actually required. **Do not create empty architectural files simply to satisfy a template.**

---

## 6. Module Boundary Rules

A module owns its domain behavior. A module should not directly manipulate another module's internal repository.

**Bad:**

```ts
import { someInternalRepository } from '../fees/internal/repository.js';
```

**Preferred:**

```ts
import { feesService } from '../fees/index.js';
```

or an explicitly exposed module capability.

Each module should expose a deliberate public API through `index.ts`. `index.ts` is the public API boundary — internal implementation details should remain private.

---

## 7. Dependency Direction

Dependencies should generally flow toward domain capabilities.

Example:

```text
Payment
  ↓
Fees
  ↓
Student Enrollment
```

A module must not create circular dependencies merely for convenience. If:

```text
A → B
B → A
```

appears necessary, stop and reconsider the domain boundary. Possible solutions include:

- extracting a shared domain concept
- moving orchestration to a higher-level service
- exposing a narrow capability
- using an event/outbox mechanism where appropriate

Do not solve circular dependencies with arbitrary imports or architectural shortcuts.

---

## 8. Database Design Rules

PostgreSQL is the authoritative persistence layer. Database constraints must protect critical invariants even if application logic fails.

Use database constraints for:

- uniqueness
- foreign keys
- nullability
- CHECK constraints
- partial unique indexes
- exclusion constraints
- referential integrity

Application services must enforce:

- domain rules
- cross-entity rules
- authorization
- lifecycle transitions
- workflow rules

The two layers are complementary.

---

## 9. Prisma Rules

All schema modifications must consider: Model, Enum, Relation, Index, Unique Constraint, Partial Index, Check Constraint, Foreign Key, Delete Behavior, Migration.

Do not modify `schema.prisma` without evaluating its effect on:

- existing data
- historical records
- existing modules
- queries
- indexes
- migrations
- production deployment
- transaction behavior

After schema changes:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev
```

Before production:

```bash
pnpm prisma migrate status
pnpm prisma migrate deploy
```

---

## 10. Migration Policy

Before the first real production deployment, the development database may be reset and development migration history may be cleaned up if necessary.

**After production begins**, production migration history must be treated as immutable history.

Never:

- delete production migrations
- rewrite applied migrations
- modify old migrations
- reset production
- manually alter schema without a migration

All future production schema changes must use new migrations.

---

## 11. Historical Data Principle

S.P.A.R.K. contains academic records that have historical meaning, e.g.:

- admission
- student enrollment
- semester enrollment
- promotion
- attendance
- lecture
- timetable
- curriculum

Historical records should not be casually overwritten. Before implementing `update` / `delete` / `archive` / `restore`, ask:

> **Does this record represent current configuration or historical fact?**

Configuration may be mutable. Historical facts generally require:

- immutability
- controlled lifecycle transitions
- correction workflows
- audit records
- append-only history where appropriate

---

## 12. Lifecycle Design

Avoid generic status mutation.

**Bad:**

```http
PATCH /resource/:id
{
  "status": "ACTIVE"
}
```

**Prefer domain-specific commands:**

```http
POST /resource/:id/activate
POST /resource/:id/archive
POST /resource/:id/cancel
POST /resource/:id/lock
```

Only implement lifecycle commands that are actually supported by the domain. Do not invent lifecycle states merely because they seem useful.

---

## 13. Service Layer Rules

Services own business logic. Services are responsible for:

- domain validation
- cross-entity validation
- authorization-sensitive domain checks
- lifecycle transitions
- transaction orchestration
- audit coordination
- race-condition handling
- invoking repositories

Services must not become generic utility classes. A service method should represent a meaningful domain operation.

---

## 14. Repository Layer Rules

Repositories own persistence. Repositories should handle:

- Prisma queries
- filtering
- pagination
- sorting
- database writes
- transaction-aware operations

Repositories should **not** decide business policy.

**Avoid:**

```ts
repository.promoteStudentIfEligible(...)
```

if eligibility is a domain decision.

**Prefer:**

```text
Service:    validate promotion
                ↓
Repository: persist promotion
```

---

## 15. Transaction Rules

Any operation that changes multiple related records must be evaluated for transactional consistency.

Typical example:

```text
Business mutation
    +
Audit record
```

should occur in the same transaction.

- If the mutation fails → mutation rollback, audit rollback
- If the mutation commits → mutation committed, audit committed, success log emitted

Do not emit a success log before the transaction commits.

---

## 16. Transaction Boundary

Preferred pattern:

```ts
await prisma.$transaction(async (tx) => {
  // domain validation
  // mutation
  // audit
});
```

Repositories should accept:

```ts
type Db = PrismaClient | Prisma.TransactionClient;
```

where appropriate. Transaction-aware repository methods should use the transaction client.

---

## 17. Concurrency

Every future module must identify race conditions before implementation.

Examples:

- two admins activate the same record
- two users create the same resource
- two requests consume the same inventory
- two payments update the same invoice
- two users mark the same attendance
- two admins finalize the same workflow

For each critical mutation, determine:

- Can concurrent requests occur?
- Does application validation prevent it?
- Does the database prevent it?
- Is a guarded update required?
- Is retry behavior required?
- What happens on unique constraint failure?

Never rely solely on `find → if missing → create` for uniqueness-sensitive operations.

---

## 18. Race-Condition Pattern

Prefer guarded transitions:

```sql
UPDATE ... WHERE status = 'OPEN'
```

rather than:

```text
SELECT
if OPEN
UPDATE
```

when concurrent transitions are possible. Expected concurrent failure should be converted into a controlled domain/API error.

---

## 19. TypeScript Standards

The project uses strict TypeScript. Assume:

```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true
}
```

Avoid `any`. Avoid `// @ts-ignore`. Avoid unsafe assertions (`value as SomeType`) unless the invariant is explicitly established.

Be careful with `undefined` / `null` / optional properties, especially under `exactOptionalPropertyTypes`. Prefer explicitly modeled nullable values where the database supports null.

---

## 20. Validation Rules

Zod owns request-shape validation. Validation should cover:

- body, params, query
- UUIDs, enums, dates
- pagination, sorting
- strings, numeric boundaries
- arrays, nested structures

Validation must **not** contain database queries or business logic.

Example:

```ts
const schema = z.object({
  studentId: z.uuid(),
  amount: z.number().positive(),
});
```

Service-level (not validation-level) concerns: student exists? student eligible? amount allowed? workflow state valid?

---

## 21. Controller Rules

Controllers must remain thin.

**Controller responsibilities:**

- extract validated input
- obtain authenticated actor
- call service
- return `ApiResponse`

**Controllers should not:**

- query Prisma
- perform business logic
- implement authorization
- manually manipulate database transactions
- duplicate validation
- construct complex domain decisions

---

## 22. Route Rules

Routes should follow:

```text
Authentication
    ↓
Authorization
    ↓
Validation
    ↓
Controller
```

Example:

```ts
router.post(
  '/',
  authenticate,
  authorize('resource', 'create'),
  validate({ body: createSchema }),
  controller.create,
);
```

Routes must use existing middleware and conventions. Do not create new middleware when an existing equivalent already exists.

---

## 23. RBAC Rules

RBAC is centralized. Before adding a new resource or action:

1. inspect the current RBAC catalog
2. inspect existing permission mapping
3. determine whether an existing resource/action represents the operation
4. reuse it when appropriate
5. only introduce a new permission when the domain genuinely requires it

Never silently invent a resource, action, role, scope, or permission just to make a module compile. RBAC must remain aligned with the actual authorization model.

---

## 24. Actor Identity

Authenticated user identity must come from the server-side authentication context. Never accept:

```json
{ "createdByUserId": "..." }
```

from an untrusted client when the value should represent the current actor. Use `req.user!.id` or the project's established authenticated-user abstraction.

---

## 25. Audit Requirements

Audit important state-changing operations. Audit records should capture enough information to answer: Who? What? Which entity? When? What action? What changed?

Audit creation should occur inside the same transaction as the mutation when atomicity matters. Do not make audit logging a reason to make the primary mutation succeed while audit silently fails.

---

## 26. Logging

Application logs and audit logs are different.

**Audit** — business/security history, e.g. `USER_UPDATED`, `ADMISSION_CANCELLED`, `PROMOTION_FINALIZED`, `ATTENDANCE_LOCKED`.

**Application logging** — operational observability, e.g. request completed, database timeout, external API failure, unexpected exception.

Success logs for transactional mutations should occur after successful commit. Never log passwords, access tokens, refresh tokens, sensitive payment credentials, or unnecessary personal data.

---

## 27. Error Handling

Use the existing `ApiError`, `ErrorCode`, and global error handler. Do not create inconsistent response shapes inside modules.

Domain failures should map to stable error codes, e.g.:

- `NOT_FOUND`
- `ALREADY_EXISTS`
- `INVALID_STATE`
- `FORBIDDEN`
- `CONFLICT`
- `VALIDATION_ERROR`

Use existing project error codes whenever possible. Do not create duplicate semantic errors.

---

## 28. API Response Standard

Use `ApiResponse` for successful HTTP responses. Maintain consistent structures across modules. Do not introduce module-specific response formats.

---

## 29. DTO Boundary

Persistence models must not automatically become public API contracts. Use explicit DTOs.

Preferred flow:

```text
Prisma Model
    ↓
Mapper
    ↓
DTO
    ↓
Controller
```

Mappers should generally remain scalar-only. Do not expose Prisma relation objects, internal persistence structures, or unnecessary database fields unless explicitly required by the API contract.

---

## 30. Pagination

List endpoints should use the project's established pagination conventions. At minimum evaluate: page, limit, sort, filters. Enforce reasonable maximum limits. Never allow arbitrary database sorting fields from user input — use allowlists:

```ts
const allowedSortFields = [...];
```

---

## 31. Filtering

Filters must map deliberately to supported repository queries. Do not dynamically pass arbitrary query parameters into Prisma.

**Bad:**

```ts
prisma.resource.findMany({ where: req.query });
```

**Prefer explicit mapping:** status, departmentId, academicYearId, createdFrom, createdTo.

---

## 32. API Design Principles

Use resource-oriented APIs where appropriate.

```text
GET    /resources
GET    /resources/:id
POST   /resources
PATCH  /resources/:id
```

For domain commands:

```text
POST /resources/:id/activate
POST /resources/:id/cancel
POST /resources/:id/lock
```

Do not create endpoints merely because CRUD makes them easy. The API should expose actual domain capabilities.

---

## 33. Delete Policy

Before adding `DELETE`, ask:

- Is this configuration?
- Is this historical data?
- Is this referenced elsewhere?
- Does deletion destroy auditability?
- Should this be archived instead?

For historical records, prefer controlled lifecycle transitions. Database `onDelete` behavior must be intentionally chosen. Never use `CASCADE` without understanding its complete downstream impact.

---

## 34. External Services

Future modules may integrate with payment gateways, email providers, SMS, cloud storage, notification providers, and AI services.

External operations must not be treated as normal database writes. Consider:

```text
DB transaction
    ↓
Outbox/event
    ↓
Worker
    ↓
External service
```

when reliable asynchronous delivery is required. Do not call external APIs inside long-running database transactions unless there is a specific reason and failure strategy.

---

## 35. Idempotency

Any externally triggered operation that can be retried should be evaluated for idempotency, especially: payments, webhook processing, notifications, file processing, background jobs, external synchronization.

Example:

```text
same webhook
     ↓
received twice
     ↓
must not create duplicate payment
```

Use appropriate unique keys / idempotency keys.

---

## 36. Financial Modules

Financial modules require additional care (fees, invoices, payments, refunds, discounts, receipts).

- Never use floating-point arithmetic for monetary values — use the project's PostgreSQL decimal/numeric representation.
- Financial records should preserve historical truth. Avoid destructive updates to completed financial transactions.
- Payment gateway state must be reconciled against provider events/webhooks.

---

## 37. File and Document Modules

For uploads:

```text
Client
  ↓
API
  ↓
Validation
  ↓
Object Storage
  ↓
Metadata DB
```

Do not store large binary files directly in PostgreSQL unless there is an explicit requirement. Validate file type, file size, filename, content type, ownership, and access permissions. Never trust client-provided MIME type alone for security-sensitive uploads.

---

## 38. Notification Modules

Notifications should distinguish: notification creation, delivery, read state, delivery failure.

Avoid making a user request wait unnecessarily for email/SMS/push delivery. For reliable delivery consider:

```text
Transaction
    ↓
Outbox
    ↓
Worker
    ↓
Provider
```

---

## 39. Background Jobs

Background jobs should be used for operations that are slow, retryable, asynchronous, externally dependent, or computationally expensive — e.g. email, reports, large exports, notification delivery, file processing, analytics aggregation.

Jobs must define: retry policy, failure handling, idempotency, observability, and dead-letter strategy where required.

---

## 40. Redis Rules

Redis may be used for caching, short-lived state, rate limiting, distributed coordination where justified, and notification/job infrastructure.

Redis must **not** automatically become the source of truth. PostgreSQL remains authoritative for persistent ERP business data unless explicitly designed otherwise.

Every cache needs: key strategy, TTL strategy, invalidation strategy, failure behavior.

---

## 41. Caching

Before adding caching, identify:

- What is expensive?
- How frequently does it change?
- Can stale data be tolerated?
- How is invalidation performed?
- What happens if Redis is unavailable?

Do not cache everything. Incorrect caching can create more correctness problems than performance benefits.

---

## 42. Security Requirements

Every module must evaluate: authentication, authorization, object-level authorization, input validation, SQL/ORM safety, rate limiting, sensitive data exposure, logging exposure, file upload security, replay/idempotency, CSRF where applicable, CORS, session/token handling.

Security must be considered at design time.

---

## 43. Object-Level Authorization

Passing RBAC is not necessarily sufficient.

Example: a user having `attendance:update` does not automatically mean they may modify **every** attendance record. The service may need to verify:

- Does this faculty member own/teach this lecture?
- Does this HOD have department scope?
- Does this officer have the required institutional scope?

Use the actual project's authorization model. Do not invent additional roles or scope rules.

---

## 44. Scope Model

Current architecture is intentionally single-college.

Current scope types: `COLLEGE`, `DEPARTMENT`.

Do not introduce `organization`, `tenant`, `campus`, or `section` unless requirements change. The architecture should remain SaaS-ready without prematurely implementing multi-tenancy.

---

## 45. Testing Standard

A future module is not complete when the code compiles. Minimum testing should cover Unit, Integration, and E2E where applicable.

---

## 46. Unit Tests

Service tests should cover:

- **Success** — valid creation, valid update, valid lifecycle transition
- **Validation** — invalid state, invalid relation, invalid input
- **Authorization** — unauthorized actor, unauthorized resource access
- **Conflict** — duplicate operation, concurrent operation behavior
- **Transaction** — mutation rollback, audit rollback
- **Edge Cases** — null values, empty lists, boundary values, repeated operations

---

## 47. Integration Tests

Integration tests should use a real PostgreSQL environment where database behavior matters. Verify: foreign keys, unique constraints, indexes where relevant, CHECK constraints, transactions, rollback, concurrent behavior, Prisma behavior, migration compatibility.

Do not mock away the database behavior you are specifically trying to verify.

---

## 48. E2E Tests

E2E tests should verify the full path:

```text
HTTP
 ↓
Authentication
 ↓
RBAC
 ↓
Validation
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL
```

Test realistic workflows instead of isolated HTTP status codes only.

---

## 49. Concurrency Tests

Every critical module must identify concurrency-sensitive operations, e.g.: fee payment, inventory deduction, attendance marking, timetable creation, promotion finalization, notification processing, webhook handling.

Where applicable, test concurrent request pairs and verify the database remains consistent.

---

## 50. Test Data

Tests should use deterministic fixtures. Avoid tests depending on existing local database state, manual records, random production-like data, or execution order.

Prefer: factory, fixture, seed helper, transaction rollback, isolated test database.

---

## 51. Seed Data

Production seed data and development seed data must be distinguished.

- **Development seed** may include: sample departments, programs, academic years, users, roles, permissions, sample students, sample faculty.
- **Production bootstrap** should contain only intentionally required system data.

Never seed fake production users or sample financial data into a real production environment.

---

## 52. Future Module Development Workflow

Every new module must follow this sequence.

**Step 1 — Requirement Definition**
Define purpose, actors, entities, relationships, lifecycle, business rules, security requirements, external dependencies, historical behavior. Do not start coding before the domain is understood.

**Step 2 — Existing Architecture Audit**
Inspect Prisma schema, RBAC catalog, authentication, audit, shared errors, shared responses, logging, existing related modules, route conventions, validation conventions, testing infrastructure. Never implement a module in isolation.

**Step 3 — Domain Model**
Define entities, enums, relations, indexes, constraints, lifecycle. Explicitly identify which data is mutable configuration versus historical fact.

**Step 4 — Database Design**
Evaluate PK, FK, UNIQUE, CHECK, INDEX, PARTIAL UNIQUE, EXCLUDE, NULLABILITY, DELETE BEHAVIOR. Only introduce a database constraint when its business invariant is clear.

**Step 5 — Types**
Create explicit ID types, DTOs, create inputs, update inputs, filter types, pagination types, lifecycle types. Do not expose Prisma models as API contracts automatically.

**Step 6 — Validation**
Create Zod schemas for params, query, body. Validation should remain request-shape-only.

**Step 7 — Mapper**
Create scalar DTO mappers where required. Ensure Date → ISO string, Time → API time representation, null → null, and no accidental relation exposure.

**Step 8 — Repository**
Implement only required persistence operations (find, list, create, update, delete, transition) when the domain requires them. Add transaction-aware methods where mutations require transactions.

**Step 9 — Service**
Implement domain validation, authorization-sensitive checks, state transitions, transaction orchestration, audit, concurrency handling. This is the core domain layer.

**Step 10 — Controller**
Keep it thin: validated request → service → `ApiResponse`.

**Step 11 — Routes**
Implement authentication, RBAC, validation, controller — in the established order.

**Step 12 — Tests**
Write tests before declaring the module complete: service, repository/integration, HTTP/E2E where applicable.

**Step 13 — Security Review**
Check RBAC, object-level access, input validation, data exposure, audit, logging, rate limiting, idempotency.

**Step 14 — Database Verification**
Run `pnpm prisma validate`, `pnpm prisma generate`, `pnpm prisma migrate status`, and the project's typecheck, lint, tests, build.

**Step 15 — Production Readiness Review**
A module is complete only after Code ✓, Tests ✓, Database ✓, Security ✓, Authorization ✓, Audit ✓, Concurrency ✓, Error handling ✓, Observability ✓, Documentation ✓.

---

## 53. Phase 2 Planned Modules

### 1. Fees & Billing

Potential domain areas: Fee Structure, Fee Heads, Student Fee Assignment, Invoices, Installments, Discounts, Scholarships, Dues, Receipts, Financial Status. Exact requirements must be defined before implementation.

### 2. Payment Gateway

Potential domain areas: Payment Intent, Payment Attempt, Gateway Transaction, Webhook, Payment Verification, Refund, Reconciliation, Idempotency. External gateway behavior must be modeled explicitly.

### 3. Assignments

Potential areas: Assignment, Assignment Submission, Evaluation, Grades, Deadlines, Attachments. Must integrate with existing `SubjectOffering`, `FacultyAssignment`, `SemesterEnrollment` where applicable.

### 4. Study Materials

Potential areas: Material, File Metadata, Subject/Offering Association, Visibility, Download Access, Versioning. Must integrate with the existing academic structure.

### 5. Notifications

Potential channels: In-App, Email, SMS, Push. Delivery architecture should be asynchronous where appropriate.

### 6. Announcements

Potential scope: College announcements, Department announcements, Academic announcements, Targeted announcements, Scheduling, Publishing, Archiving. Authorization and scope must be explicitly defined.

### 7. Documents

Potential scope: Student Documents, Faculty Documents, Administrative Documents, Verification, Storage, Access Control. File security is a primary concern.

### 8. Reports

Potential scope: Attendance Reports, Student Reports, Academic Reports, Fee Reports, Administrative Reports, Exports. Reports should preferably read from optimized query paths rather than introducing unnecessary mutations into operational modules.

---

## 54. Future Phase Candidates

These are **not automatically approved** for implementation — they require separate requirements analysis:

Library · Hostel · Transport · Payroll · HR · Examinations · Results · Certificates · Transcripts · Alumni · Placement · Inventory · Asset Management · Helpdesk · Advanced Analytics · AI Assistant · Mobile Applications · Multi-College SaaS

No module should be implemented merely because it appears on this list.

---

## 55. StudentSubjectEnrollment

`StudentSubjectEnrollment` is intentionally deferred. Future implementation may eventually support: Compulsory Subject Enrollment, Elective Selection, Add/Drop, Withdrawal, Backlog, Repeat, Prerequisite, Eligibility, Enrollment Window.

Do not introduce it into Phase 2 unless requirements explicitly activate this domain.

---

## 56. Advanced Attendance

The following are intentionally deferred: QR Attendance, GPS Attendance, Biometric Attendance, Attendance Percentage Engine, Advanced Analytics, Automated Defaulter Detection.

Do not add these while implementing unrelated modules.

---

## 57. AI / Chatbot

AI functionality must remain separated from core transactional domain logic. Do not allow an AI component to directly mutate authoritative ERP records without explicit domain APIs and authorization.

**Preferred:**

```text
AI
 ↓
Domain API
 ↓
Authorization
 ↓
Service
 ↓
Database
```

**Not:**

```text
AI
 ↓
Direct Database Mutation
```

---

## 58. API Documentation

API documentation should be finalized after route contracts stabilize. Document: Endpoint, Method, Authentication, RBAC, Request, Response, Errors, Pagination, Filters, Lifecycle behavior. Do not document endpoints that do not actually exist.

---

## 59. Observability

Production should eventually provide: Structured Logs, Request IDs, Error Tracking, Latency Metrics, Database Metrics, Background Job Metrics, External API Metrics.

Sensitive information must not appear in logs.

---

## 60. Rate Limiting

Evaluate rate limiting for: Authentication, Password operations, OTP, Public endpoints, File uploads, Payment webhooks, Expensive reports, AI endpoints.

Limits should be based on actual threat and workload models. Do not blindly apply identical limits to every endpoint.

---

## 61. Performance

Performance optimization should be evidence-driven:

```text
Identify bottleneck → Measure → Optimize → Measure again
```

Watch for: N+1 queries, missing indexes, large result sets, unbounded queries, expensive joins, unnecessary serialization, Redis misuse, external API latency.

Do not optimize prematurely at the cost of domain correctness.

---

## 62. API Query Performance

Every list endpoint should consider: pagination, indexes, select fields, relation loading, sorting, filter selectivity.

Avoid loading entire relational graphs when only scalar fields are required.

---

## 63. Security Review Checklist

- [ ] Authentication enforced
- [ ] RBAC enforced
- [ ] Object-level authorization evaluated
- [ ] Input validated
- [ ] IDs validated
- [ ] Sensitive fields protected
- [ ] No client-controlled actor identity
- [ ] Audit implemented where required
- [ ] Logs sanitized
- [ ] Rate limiting evaluated
- [ ] Idempotency evaluated
- [ ] Concurrency evaluated
- [ ] External calls secured
- [ ] File access secured where applicable

---

## 64. Database Review Checklist

- [ ] Primary keys
- [ ] Foreign keys
- [ ] Unique constraints
- [ ] Partial unique constraints
- [ ] CHECK constraints
- [ ] Indexes
- [ ] EXCLUDE constraints where required
- [ ] Correct nullability
- [ ] Correct enum states
- [ ] Correct ON DELETE behavior
- [ ] Transaction boundaries
- [ ] Migration tested
- [ ] Fresh database tested

---

## 65. Code Review Checklist

- [ ] No unnecessary files
- [ ] No unrelated modifications
- [ ] No `any`
- [ ] No `ts-ignore`
- [ ] No speculative features
- [ ] No duplicate business logic
- [ ] No direct Prisma access from controller
- [ ] No business logic in validation
- [ ] No business logic in repository
- [ ] Thin controllers
- [ ] Explicit DTOs
- [ ] Correct mapper boundary
- [ ] Transaction correctness
- [ ] Audit correctness
- [ ] Error codes reused
- [ ] RBAC verified

---

## 66. Definition of Done

A future module is considered complete only when all applicable requirements are satisfied.

**Architecture**

- [ ] Correct module boundary
- [ ] Correct dependency direction
- [ ] Public API exported through `index.ts`

**Database**

- [ ] Prisma schema finalized
- [ ] Migration created
- [ ] Constraints verified
- [ ] Indexes verified
- [ ] Delete behavior verified

**Backend**

- [ ] Types
- [ ] Validation
- [ ] Mapper
- [ ] Repository
- [ ] Service
- [ ] Controller
- [ ] Routes

**Security**

- [ ] Authentication
- [ ] RBAC
- [ ] Object-level authorization
- [ ] Input validation
- [ ] Sensitive-data protection

**Reliability**

- [ ] Transactions
- [ ] Audit
- [ ] Concurrency
- [ ] Idempotency where applicable
- [ ] Error handling

**Testing**

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Negative cases
- [ ] Boundary cases
- [ ] Concurrency cases where applicable

**Quality**

- [ ] Typecheck
- [ ] Lint
- [ ] Build
- [ ] Migration verification
- [ ] No unrelated changes

---

## 67. Rules for AI-Assisted Development

Claude, Codex, ChatGPT, or other AI coding agents must follow these rules.

Before modifying code:

1. Inspect the existing implementation.
2. Inspect related modules.
3. Inspect Prisma schema.
4. Inspect RBAC.
5. Inspect validation conventions.
6. Inspect error/response conventions.
7. Inspect tests.
8. Identify existing domain boundaries.

The AI must not assume architecture from generic best practices. It must use the actual repository as the source of truth.

---

## 68. AI Change-Scope Rule

When instructed to implement a specific file or module: modify **only** the requested scope unless an additional change is technically required.

If an additional file is required, explain why. Do not silently refactor unrelated modules.

---

## 69. AI Anti-Speculation Rule

AI agents must not invent: roles, permissions, RBAC actions, business rules, database models, API endpoints, statuses, workflow states, relationships.

If requirements are ambiguous:

1. Inspect existing architecture.
2. Identify the ambiguity.
3. Preserve current behavior.
4. Ask for clarification when necessary.

Do not fill gaps with assumptions.

---

## 70. AI Verification Rule

AI-generated implementation must never claim tests passed, build passed, lint passed, or migration succeeded unless the command was actually executed successfully.

Reports must distinguish: **Verified**, **Not Run**, **Failed**, **Blocked by Environment**.

---

## 71. Production Deployment Principles

Before production deployment:

- [ ] Fresh database tested
- [ ] Migrations tested
- [ ] Environment variables verified
- [ ] Secrets secured
- [ ] Database backups configured
- [ ] Logging configured
- [ ] Error monitoring configured
- [ ] Rate limits configured
- [ ] CORS configured
- [ ] HTTPS enabled
- [ ] Authentication verified
- [ ] RBAC verified
- [ ] Seed/bootstrap verified
- [ ] Rollback strategy defined

---

## 72. Backup and Recovery

Production PostgreSQL must have a documented backup strategy. At minimum define: Backup frequency, Retention, Storage, Encryption, Restore procedure, Recovery Point Objective, Recovery Time Objective.

A backup is not considered reliable until restoration has been tested.

---

## 73. Production Migration Principle

```text
Code
 ↓
Migration
 ↓
CI verification
 ↓
Staging
 ↓
Migration testing
 ↓
Backup
 ↓
Production migration
 ↓
Application deployment
 ↓
Verification
```

Never use `prisma migrate reset` against production.

---

## 74. Staging Environment

Before production, maintain a staging environment that approximates as closely as practical: Node version, PostgreSQL version, Redis version, Environment configuration, Migration state, Infrastructure.

---

## 75. Final Engineering Principle

S.P.A.R.K. should not be optimized for the number of modules implemented. It should be optimized for:

```text
Correctness + Security + Consistency + Auditability + Maintainability + Testability + Operational Reliability
```

A smaller correctly implemented domain is preferable to a large collection of loosely defined CRUD modules.

---

## 76. Current Development Rule

Phase 1 is complete. Do not immediately begin implementing every future module.

The recommended next stage is:

```text
Phase 1
   ↓
Production Readiness Audit
   ↓
Migration Baseline
   ↓
Full Integration/E2E Verification
   ↓
Staging Validation
   ↓
Phase 2
```

Future modules must be implemented one domain at a time. Each module must pass its own Definition of Done before the next major module begins.

---

## 77. Future Module Implementation Template

For every new module, create a dedicated implementation specification containing:

1. Module Purpose
2. Scope
3. Non-Goals
4. Actors
5. Entities
6. Relationships
7. Lifecycle
8. Business Rules
9. Database Design
10. Constraints
11. RBAC Requirements
12. API Contract
13. Validation
14. Service Operations
15. Repository Operations
16. Transaction Boundaries
17. Audit Requirements
18. Concurrency Risks
19. Idempotency Requirements
20. External Dependencies
21. Testing Strategy
22. Integration Points
23. Migration Plan
24. Observability
25. Security Review
26. Definition of Done

This specification must be completed before implementation begins.

---

## 78. Closing Architecture Rule

The existing Phase 1 architecture is the baseline. Future modules must extend the system without weakening its existing guarantees.

When a future requirement conflicts with an existing architectural decision, **do not silently change the architecture**. Instead:

```text
Identify the conflict
        ↓
Explain the affected domain
        ↓
Evaluate the database impact
        ↓
Evaluate security/RBAC impact
        ↓
Evaluate historical-data impact
        ↓
Evaluate migration impact
        ↓
Make an explicit architectural decision
        ↓
Implement
```

This document should therefore be treated as the **engineering contract** for future S.P.A.R.K. development.

---

## Recommended Usage

Keep this file as the **master engineering document**, and for each Phase 2 module create a separate, dedicated spec file (using the template in [Section 77](#77-future-module-implementation-template)):

```text
docs/
├── architecture/
│   └── SPARK_FUTURE_MODULES_DEVELOPMENT_SPEC.md   ← this file
│
├── modules/
│   ├── fees-billing/
│   │   └── FEES_BILLING_SPEC.md
│   ├── payments/
│   │   └── PAYMENT_GATEWAY_SPEC.md
│   ├── assignments/
│   │   └── ASSIGNMENTS_SPEC.md
│   ├── study-materials/
│   │   └── STUDY_MATERIALS_SPEC.md
│   ├── notifications/
│   │   └── NOTIFICATIONS_SPEC.md
│   ├── announcements/
│   │   └── ANNOUNCEMENTS_SPEC.md
│   ├── documents/
│   │   └── DOCUMENTS_SPEC.md
│   └── reports/
│       └── REPORTS_SPEC.md
│
└── production/
    ├── PRODUCTION_READINESS.md
    ├── DATABASE_MIGRATION_POLICY.md
    └── DEPLOYMENT_RUNBOOK.md
```

The important distinction: **this master file defines _how_ future modules must be built**; individual module specs define _what_ each module actually does.
