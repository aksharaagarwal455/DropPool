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

## Intents & Cart Extraction

### `POST /api/intents`
Create shopping intent.
Body: `platform` (`blinkit`, `zepto`, `instamart`), `items` (`[{ name, qty, unitPricePaise }]`), `windowStart`, `windowEnd`, `hostel`, `block`, `floor`, `observedFeesPaise`, `source`.

### `GET /api/intents/mine`
Get active and reserved intents for current user.

### `GET /api/intents/board`
Live campus demand board ordered nearest-first (annotated with `proximityTier`, `walkMinutes`, and `distanceLabel`). Excludes item unit prices and total amounts for student privacy.

### `POST /api/ai/extract`
Gemini-powered cart extraction from screenshot.
Body: `imageBase64`, `mimeType`.
Returns: `extraction: { platform, items: [{ name, qty, unitPricePaise }], observedFeesPaise, warnings }`.

## Matching & Cost Optimization

### `POST /api/matching/run`
Runs the goal-driven matching engine for an intent.
Body: `intentId`.
Returns: `proposal` containing `status` (`pool`, `individual`, `none`, `needs_prices`, `insufficient_data`), `intentIds`, `targetReached`, `gapPaise`, `milestone`, `membersNeeded`, `explanation`, and `optimization` (`pooled`, `individual`, `members`, `recommendation`).

### `POST /api/optimization/preview`
Direct cost optimization preview for an array of intent IDs.
Body: `intentIds`.

## Pools & Peer Payments

### `POST /api/pools`
Create a pool proposal with compatible intent IDs. User becomes the host.
Body: `intentIds`.

### `GET /api/pools/mine`
List pools where current user is a member or host.

### `GET /api/pools/:id`
Get full pool state, status, member confirmations, host details, and user's specific payment share (`myPayment`).

### `POST /api/pools/:id/confirm`
Member confirms commitment to the pool.

### `POST /api/pools/:id/actual-total`
Host inputs actual platform checkout total (`actualTotalPaise`) after placing order. Splits shares and transitions pool to `awaiting_payments`.

### `POST /api/pools/:id/status`
Host advances pool status: `order_placed`, `ready_for_pickup` (with `pickupLocation`), `completed`, or `cancelled`.

### `POST /api/payments/:id/claim`
Member claims UPI payment with optional `utr` reference.

### `POST /api/payments/:id/confirm`
Host confirms receipt of member's share.

## Meta & Demand Intelligence

### `GET /api/meta`
Returns campus hostels, platforms, and server capabilities (`geminiConfigured`, `demoMode`).

### `GET /api/meta/fees?platform=&subtotalPaise=`
Calculates illustrative solo platform fees (`feesPaise`, `deliveryFeePaise`, `smallCartFeePaise`, `handlingFeePaise`).

### `GET /api/demand/summary`
Campus demand insights and heuristics (volume by hour, active hostels, top products).

## Admin

### `POST /api/admin/demo/seed`
Seeds demo personas (Aarav, Diya, Kabir, Meera, Rohan, Ishita, Vihaan, Sara).

### `POST /api/admin/demo/reset`
Resets demo data without altering real student accounts.
