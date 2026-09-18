# Performance audit

## Medium — Attendance bulk marking has per-record lookup work

**Current behavior:** `bulkMarkAttendance` iterates records and resolves each semester enrollment/eligibility in its transaction.  
**Why it matters:** work and query count grow with class size; long transactions raise lock/contention exposure.  
**Evidence:** `apps/api/src/modules/attendance/attendance.service.ts`, bulk-mark loop and per-enrollment repository calls.  
**Recommended solution:** fetch candidate enrollments in one bounded query, validate set membership in memory, and write in batches while retaining transaction/audit semantics.

## Low — In-memory rate limiting is process-local

This is primarily security/availability, but a restart or multiple instances loses a stable abuse budget. See SEC-004.

## Informational — Read APIs use list/pagination schemas

Phase-1 list handlers generally validate query inputs and use pagination helpers. No production query plans or database data volume were available, so this audit makes no unverified missing-index/N+1 claims.
