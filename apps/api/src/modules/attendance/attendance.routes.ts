// apps/api/src/modules/attendance/attendance.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as attendanceController from './attendance.controller.js';
import {
  attendanceRecordIdParamsSchema,
  attendanceSessionIdParamsSchema,
  bulkMarkAttendanceBodySchema,
  correctAttendanceRecordBodySchema,
  createAttendanceSessionBodySchema,
  listAttendanceRecordsQuerySchema,
  listAttendanceSessionsQuerySchema,
} from './attendance.validation.js';

/**
 * HTTP route composition for the Attendance module (AttendanceSession +
 * AttendanceRecord) — mirrors lecture.routes.ts / promotion.routes.ts:
 * requireAuth is applied once via `router.use(...)`, then every route is
 * exactly authorize(resource, action) -> validate(schema, source) -> the
 * corresponding attendanceController handler. No business logic, no
 * Prisma, no service/repository calls, and no manual validation live here.
 *
 * Intended mount point: `/api/v1/attendance` (see "NOT YET MOUNTED" below).
 * Every path in this file is relative to that mount, matching every
 * sibling router in app.ts — this router never repeats its own prefix.
 *
 * ── RBAC RESOURCE: 'attendance' ──────────────────────────────────────────
 * 'attendance' is already a first-class entry in AUTHORIZATION_RESOURCES
 * (rbac.constants.ts) — no resource is invented here. There is no separate
 * 'attendanceSession'/'attendanceRecord' resource, matching the task's own
 * explicit instruction: both AttendanceSession and AttendanceRecord
 * mutations below authorize against the one 'attendance' resource.
 *
 * ── RBAC ACTION MAPPING ───────────────────────────────────────────────────
 * 'create' / 'read' / 'update' are already first-class entries in
 * AUTHORIZATION_ACTIONS and need no justification. The one genuinely
 * interpretive choice is locking a session:
 *
 *   POST /:id/lock -> authorize('attendance', 'finalize')
 *
 * AUTHORIZATION_ACTIONS has no literal 'lock'. Of the actions that DO
 * exist (create, read, update, delete, archive, restore, activate,
 * cancel, finalize), 'finalize' is the one already defined, elsewhere in
 * this exact codebase, for precisely this shape of operation:
 * PROMOTION_FINALIZE (permission.constants.ts) describes "finalizing a
 * promotion batch ... irreversible." AttendanceSession's OPEN -> LOCKED
 * transition is the same shape — a one-way, no-reopen closing of a
 * resource to further mutation (see attendance.service.ts's own
 * lockAttendanceSession doc comment: "No reopen path exists"). 'update' is
 * deliberately NOT used here even though it would also compile: 'update'
 * already means "correct an existing AttendanceRecord's status" on the
 * `PATCH /records/:id` route below, and reusing it for "irreversibly close
 * this session" would let one action key cover two semantically different
 * operations. 'activate' is not used either — it already carries a
 * different, specifically reversible meaning elsewhere
 * (academic-year.routes.ts: "make this the currently active year"),
 * exactly the reasoning promotion.routes.ts gives for the same rejection.
 * This is the interpretive mapping requested by the task, not a settled
 * platform decision — see the accompanying report's "Remaining Decisions".
 *
 * Bulk-marking attendance records maps to 'create' (new AttendanceRecord
 * rows), matching promotion.routes.ts's identical reuse of 'create' for
 * both creating a PromotionBatch and creating a PromotionDecision under
 * it — one action per resource, not one per endpoint.
 *
 * ── ROUTE ORDERING (Express matches in registration order) ──────────────
 * `GET /:id` and `GET /records` both match a single path segment under
 * this router — if `GET /:id` were registered first, a request to
 * `GET /records` would be captured by it (with `id="records"`) and never
 * reach the records-list handler. `GET /records` is therefore registered
 * BEFORE `GET /:id` below. The equivalent risk does not exist for POST
 * (`POST /:id/lock` requires a literal second segment "lock", which
 * "/records/bulk"'s second segment "bulk" can never match) or for PATCH
 * (there is only one PATCH route), but for readability every static
 * `/records...` route is still grouped and registered before the dynamic
 * session `/:id...` routes.
 *
 * ── attendanceSessionId CONTRACT: BODY, not a route param ────────────────
 * See the accompanying report's "Route Contract Decision" for the full
 * reasoning — summary: bulkMarkAttendanceBodySchema (attendance.validation.ts)
 * already validates `attendanceSessionId` as a required body field, and
 * BulkMarkAttendanceInput (attendance.types.ts) carries it the same way.
 * Neither file is modified by this task, so `POST /records/bulk` takes
 * `attendanceSessionId` in the body — it is NOT nested under
 * `/:sessionId/records/bulk` — matching the existing, unmodified contract
 * rather than a nested-resource REST style this task's own instructions
 * explicitly forbid introducing by editing validation/types.
 *
 * ── NOT YET MOUNTED ────────────────────────────────────────────────────
 * app.ts does not yet import or mount an attendanceRouter (confirmed by
 * inspection — no `attendanceRouter` appears in app.ts's route-mounting
 * block). Wiring it in
 * (`app.use('/api/v1/attendance', attendanceRouter);`) is a one-line
 * change to app.ts, which is outside this task's scope (only
 * attendance.controller.ts / attendance.routes.ts were requested) and is
 * therefore NOT made here — flagged explicitly in the accompanying report
 * instead of being done silently, matching promotion.routes.ts's identical
 * precedent for its own router.
 */
export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

// ── Attendance sessions — static paths ───────────────────────────────────

attendanceRouter.post(
  '/',
  authorize('attendance', 'create'),
  validate(createAttendanceSessionBodySchema),
  attendanceController.createAttendanceSession,
);

attendanceRouter.get(
  '/',
  authorize('attendance', 'read'),
  validate(listAttendanceSessionsQuerySchema, 'query'),
  attendanceController.listAttendanceSessions,
);

// ── Attendance records — all static paths (see ROUTE ORDERING above) ────

attendanceRouter.get(
  '/records',
  authorize('attendance', 'read'),
  validate(listAttendanceRecordsQuerySchema, 'query'),
  attendanceController.listAttendanceRecords,
);

attendanceRouter.post(
  '/records/bulk',
  authorize('attendance', 'create'),
  validate(bulkMarkAttendanceBodySchema),
  attendanceController.bulkMarkAttendance,
);

attendanceRouter.patch(
  '/records/:id',
  authorize('attendance', 'update'),
  validate(attendanceRecordIdParamsSchema, 'params'),
  validate(correctAttendanceRecordBodySchema),
  attendanceController.correctAttendanceRecord,
);

// ── Attendance sessions — dynamic ':id' paths (registered LAST; see
//    ROUTE ORDERING above) ────────────────────────────────────────────────

attendanceRouter.get(
  '/:id',
  authorize('attendance', 'read'),
  validate(attendanceSessionIdParamsSchema, 'params'),
  attendanceController.getAttendanceSessionById,
);

attendanceRouter.post(
  '/:id/lock',
  authorize('attendance', 'finalize'),
  validate(attendanceSessionIdParamsSchema, 'params'),
  attendanceController.lockAttendanceSession,
);
