# Authentication, validation, and errors

## Current implementation

### Authentication

- The access token is a signed JWT with `sub` user ID and `sid` session ID. `requireAuth` accepts only `Authorization: Bearer <token>`, differentiating expired and invalid tokens.
- Refresh tokens are random opaque secrets, hashed before persistence. The refresh endpoint takes the token from the HTTP-only cookie; controllers clear/set this cookie during auth flows.
- Login uses Argon2 verification and a dummy verification for unknown emails. User status gates login; failed attempts increment a counter and may set `LOCKED` with a cooldown.
- CORS allows one configured origin with credentials; cookie security attributes are configured by the auth controller/constants and must be checked against deployment HTTPS settings.

### Validation and response conventions

`validate()` calls `safeParse`, joins Zod issues into a 400 `VALIDATION_ERROR`, and stores parsed data in `req.valid`. Success controllers use `ApiResponse` and pagination helpers. Error responder returns:

```json
{ "success": false, "error": { "message": "…", "code": "…", "requestId": "…" } }
```

`ApiError` represents exposed operational 4xx and hidden 5xx errors. `mapPrismaError` maps P2002/P2003/P2025 and generic Prisma failures when a caller invokes it.

## Known problems

- `mapPrismaError` is not a global error-handler step, so raw Prisma errors must be caught/mapped at service/controller call sites to preserve intended status codes.
- The rate limiter emits `{success:false,message}` rather than the shared error contract.
- The public refresh endpoint is not protected by `authRateLimiter`.

## Recommended future improvements

Route all Prisma known errors through one verified mapping point, standardize rate-limit response shape, and use a dedicated refresh rate limiter with a shared production store.
