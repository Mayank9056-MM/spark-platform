# Transaction strategy and concurrency

## Current implementation

Phase-1 mutation services consistently use interactive `prisma.$transaction(async tx => ...)`, repository `*Tx` methods, and `recordAuditTx(tx, ...)`. This couples business mutation and critical audit row rollback. Admission, enrollments, promotion, offerings, faculty assignments, timetable, lecture, attendance, RBAC mutations, academic structure, and user lifecycle follow this pattern.

### Important guarded updates

- Promotion finalization rechecks DRAFT state and performs a guarded status transition to detect concurrent finalization.
- Attendance lock rechecks `OPEN` and uses a guarded transition to detect a concurrent lock.
- Database unique constraints provide final duplicate protection for several read-then-create paths.

## Known problems

- Auth session/refresh workflows are not transactional. In particular refresh token rotation has a check–revoke–issue race (SEC-001).
- Unique constraints convert some concurrent service precheck races into generic database conflicts rather than deterministic domain outcomes (e.g., next semester attempt number).
- No tests prove rollback/audit atomicity or concurrency behavior.

## Recommended future improvements

Use atomic guarded token consumption (`updateMany` conditioned on `revokedAt: null`), decide a retry policy for serialization/unique races, and create transaction integration tests using concurrent clients.
