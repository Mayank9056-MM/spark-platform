# API endpoint catalogue

## Current implementation

All mounted paths begin `/api/v1`. Except public auth paths, routes require a Bearer access token. Protected handlers use Zod validation for parameters/body/query and use the RBAC action listed below. Controllers return the shared success envelope; errors normally use the shared error envelope described in [authentication and errors](authentication-and-errors.md).

| Base path                                                                             | Methods / relative paths                                                                                                                                                    | Authorization                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/auth`                                                                               | `POST /login`, `/refresh`, `/activate`, `/password-reset/request`, `/password-reset/confirm`; `POST /logout`, `/logout-all`; `GET /sessions`; `DELETE /sessions/:sessionId` | Public first five; remaining require auth only                 |
| `/users`                                                                              | `GET/PATCH /me`; `POST/GET /`; `GET/PATCH/DELETE /:id`; `POST /:id/restore`                                                                                                 | self auth for `/me`; `user:create/read/update/archive/restore` |
| `/rbac/roles`                                                                         | `POST/GET /`; `GET/PATCH /:id`; `GET /:id/permissions`; `POST /:id/archive`, `/:id/restore`; `POST/DELETE /:roleId/permissions/:permissionId`                               | `role:*`                                                       |
| `/rbac/permissions`                                                                   | `POST/GET /`; `GET/PATCH /:id`                                                                                                                                              | `permission:create/read/update`                                |
| `/rbac/role-assignments`                                                              | `POST/GET /`; `GET /:id`; `DELETE /:roleAssignmentId`                                                                                                                       | `roleAssignment:create/read/delete`                            |
| `/academic/departments`, `/programs`, `/semester-catalogs`, `/subjects`, `/electives` | CRUD (`POST/GET /`, `GET/PATCH/DELETE /:id`)                                                                                                                                | respective resource CRUD                                       |
| `/academic/curricula`                                                                 | CRUD plus `POST /:id/activate`, `/:id/retire`                                                                                                                               | `curriculumVersion:create/read/update/delete`                  |
| `/academic/academic-years`                                                            | CRUD plus `POST /:id/activate`                                                                                                                                              | `academicYear:create/read/update/delete/activate`              |
| `/admissions`                                                                         | `POST/GET /`; `GET/PATCH /:id`; `POST /:id/cancel`                                                                                                                          | `admission:create/read/update/cancel`                          |
| `/student-enrollments`                                                                | `POST/GET /`; `GET/PATCH /:id`; `POST /:id/cancel`, `/:id/withdraw`                                                                                                         | `student:create/read/update/cancel`                            |
| `/semester-enrollments`                                                               | `POST/GET /`; `GET /:id`                                                                                                                                                    | `student:create/read`                                          |
| `/promotions`                                                                         | batch create/list/get/finalize; decision create/list/get                                                                                                                    | `promotion:create/read/finalize`                               |
| `/subject-offerings`                                                                  | `POST/GET /`; `GET /:id`                                                                                                                                                    | `subject:create/read`                                          |
| `/faculty-assignments`, `/timetables`, `/lectures`                                    | `POST/GET /`; `GET /:id`                                                                                                                                                    | respective `create/read`                                       |
| `/attendances`                                                                        | session create/list/get/lock; attendance bulk mark/correct/read routes                                                                                                      | `attendance:create/read/update/finalize`                       |

The exact controller and schema pairing is encoded in each `*.routes.ts` file; route files are the authoritative detailed contract. There are no routes for rooms, time slots, assignments, study materials, notices, notifications, documents, calendar events, settings, or audit logs.

## Known problems

- The table groups repeated CRUD endpoints for readability; it is not a replacement for source-level Zod field definitions.
- Rate-limit errors do not use the normal error envelope.
- API routes are not described by OpenAPI or contract tests.

## Recommended future improvements

Generate an OpenAPI document from route/validation metadata, test it against handlers, document pagination field semantics from `common/responses/pagination.ts`, and add examples for every lifecycle command.
