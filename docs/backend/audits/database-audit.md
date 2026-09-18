# Database audit

## Current implementation

The baseline is PostgreSQL with one Prisma migration, strong FK/unique-index coverage, and service transactions for multi-record mutations. Historical academic references mostly use `RESTRICT`; truly owned children use `CASCADE`; actor references commonly use `SET NULL`.

## FINDING-DB-001 — Audit append-only is not enforced by PostgreSQL

**Priority:** High  
**Evidence:** `AuditLog` schema commentary expressly records that runtime-role `REVOKE UPDATE/DELETE` is not configured; no such migration exists.  
**Impact:** runtime DB credentials can modify audit history.  
**Remediation:** split roles and restrict privileges.

## FINDING-DB-002 — Timetable conflicts lack database-native exclusion

**Priority:** Medium  
**Evidence:** migration has normal timetable indexes but no `EXCLUDE` constraint; scheduling checks are service logic.  
**Impact:** concurrent transactions can evade a precheck if they race.  
**Remediation:** model effective interval/conflict keys and use PostgreSQL exclusion or concurrency control appropriate to the confirmed scheduling rule.

## FINDING-DB-003 — Single large baseline migration raises change-management risk

**Priority:** Low  
**Evidence:** only one migration directory exists and contains all schema creation.  
**Impact:** later production evolution has no demonstrated migration history/test discipline.  
**Remediation:** add incremental reviewed migrations and CI migrate-from-empty/migrate-upgrade checks.
