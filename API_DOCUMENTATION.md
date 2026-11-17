# DropPool API

Base URL in local development: `http://localhost:4000`.

The Vite dev server proxies `/api` to that origin. A production client build uses `VITE_API_URL` when it is set.

Every JSON response uses one of these shapes:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "message": "..." } }
```

| Status | Meaning |
| --- | --- |
| 401 | Missing, malformed, or expired token, or login credentials that do not match |
| 403 | Authenticated, but the role is not allowed |
| 404 | No matching route |
| 409 | Registration email already exists |
| 422 | Request failed validation |
| 429 | Too many register or login attempts |
| 503 | Readiness check while MongoDB is not connected |

The process does not return the Mongo URI, JWT secret, or Gemini key.

## Health

### `GET /api/health`

Liveness. Does not require Atlas or a token.

`data` fields:

| Field | Meaning |
| --- | --- |
| `service` | `droppool-api` |
| `status` | `ok` when the process handled the request |
| `database.status` | `unconfigured`, `connecting`, `connected`, or `disconnected` |
| `database.error` | `null`, or `Database connection failed` after a failed connect |
| `demoMode` | `true` only when `DEMO_MODE=true` |
| `geminiConfigured` | `true` when `GEMINI_API_KEY` is non-empty. The key itself is not returned |
| `collegeEmailDomains` | Allowed domains from `COLLEGE_EMAIL_DOMAINS`, already trimmed and lowercased |
| `timestamp` | ISO-8601 time |

### `GET /api/health/ready`

Readiness. `200` only when `database.status` is `connected`. Otherwise `503` with message `Database is not connected`.

## Auth

### `POST /api/auth/register`

Body: `name`, `email`, `password`, `hostel`, `block`, `floor`.

The email domain must be one of `COLLEGE_EMAIL_DOMAINS`. Password length is 8 to 72 characters. The server hashes it with bcrypt, 12 rounds. `role` is always stored as `student`. A role, `isDemo`, or `emailVerified` value in the body is ignored.

`201`:

```json
{ "success": true, "data": { "token": "<jwt>", "user": {} } }
```

`user` never includes `passwordHash` or `upiId`. A duplicate email returns `409` with message `An account with this email already exists`. Validation failures return `422`.

### `POST /api/auth/login`

Body: `email`, `password`. Unknown email and wrong password both return `401` with message `Invalid email or password`. Success returns `200` and the same `token` and `user` shape as registration. The token expires in 12 hours.

### `GET /api/auth/me`

Requires `Authorization: Bearer <jwt>`. Returns the current user. A missing token returns `401`. The body never includes `passwordHash` or `upiId`.

Register and login share a limit of 20 requests per 15 minutes per IP. Over the limit, the response is `429`.

## Auth scaffolding

These routes prove the token middleware.

Send `Authorization: Bearer <jwt>`.

The access token is a JWT. Default lifetime is 12 hours (`JWT_EXPIRES_IN`). The payload is `sub` (user id) and `role` (`student` or `admin`). There is no refresh token.

### `GET /api/auth/session`

Requires a valid student or admin token.

```json
{ "success": true, "data": { "userId": "...", "role": "student" } }
```

### `GET /api/auth/admin/ping`

Requires an admin token. A student token receives `403`.

```json
{ "success": true, "data": { "ok": true } }
```

## Not in this build

Email verification, intents, extraction, matching, optimization, pools, payments, orders, demand, and admin seed or reset are not mounted. Calling them returns `404`.
