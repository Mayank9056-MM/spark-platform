# Architecture audit

## Strengths (verified)

- Modular route/controller/service/repository/mapper arrangement is consistently present across mounted Phase-1 modules.
- Zod validation, centralized `ApiError` response handling, request context, RBAC middleware, and transactional audit APIs are reusable cross-cutting infrastructure.
- Promotion and attendance explicitly use transaction clients and guarded state transitions for selected lifecycle operations.

## FINDING-001 — Persistence prerequisites have no management API

**Severity:** HIGH  
**Category:** Architecture / functional completeness  
**Location:** `apps/api/src/app.ts`; `apps/api/src/modules/rooms/room.repository.ts`; `apps/api/src/modules/time-slots/timeSlot.repository.ts`.  
**Evidence:** Timetable service resolves `roomId` and `timeSlotId`, while neither module has route/controller/service files or a mount in `app.ts`.  
**Observed behavior:** Timetable creation requires records that this API cannot create/list/manage.  
**Impact:** A deployment needs undocumented direct database/seed provisioning to use scheduling, increasing drift and operational risk.  
**Recommended remediation:** Implement deliberately authorized catalog APIs or an audited bootstrap/provisioning mechanism and document it.  
**Confidence:** High.

## FINDING-002 — Schema advertises unimplemented future domains

**Severity:** MEDIUM  
**Category:** Architecture / maintainability  
**Location:** `packages/database/prisma/schema.prisma`; `apps/api/src/modules`.  
**Evidence:** Assignment, material, notice, notification, calendar, document, and settings models exist, but matching route/module files and `app.ts` mounts do not.  
**Observed behavior:** The schema is broader than the executable backend.  
**Impact:** Maintainers and consumers can mistake persistence intent for delivered functionality; polymorphic tables have no enforcing service.  
**Recommended remediation:** Clearly mark schema-only domains and only expose them with validation, authorization, and tests.  
**Confidence:** High.

## FINDING-003 — API error envelope is inconsistent for rate limits

**Severity:** LOW  
**Category:** API contract  
**Location:** `middlewares/rate-limit.middleware.ts`; `middlewares/error-handler.middleware.ts`.  
**Evidence:** limiter sends `{success:false,message}` whereas centralized responder nests `error`.  
**Impact:** clients need special-case error parsing.  
**Recommended remediation:** delegate rate-limit failures to the central error responder or return the same shape.  
**Confidence:** High.
