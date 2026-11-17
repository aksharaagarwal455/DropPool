# DropPool architecture

Hackathon MVP. One React client, one Express API, one MongoDB database. Business rules stay on the server. The client displays API results and does not calculate savings, match scores, or payment state.

## Processes

| Piece | Role |
| --- | --- |
| `client` | Vite, React, Tailwind, React Router, Axios. Dev server proxies `/api` to port 4000. |
| `server` | Express, Mongoose, JWT, bcrypt. Owns validation and money once those modules exist. |
| MongoDB Atlas | Source of truth. Connection comes from `MONGO_URI`. Missing URI is a visible `unconfigured` state, not a crash. |

Gemini will be called from a server module behind a strict schema. The client never sees the API key. If Gemini is down, later cart flows fall back to manual entry. OCR or a Python extractor can replace that module without changing pool or payment code. There is no Python service in this MVP.

## Layout

```
client/src          pages, router, Axios client
server/src/config   environment and Mongo connection
server/src/routes   HTTP adapters
server/src/services business logic
server/src/models   Mongoose schemas
server/src/middleware
server/src/utils
server/tests
```

Routes stay thin. Services own rules. Controllers are omitted until a route does more than call one service.

## Authentication

- One access JWT, default lifetime 12 hours. No refresh token.
- Roles are `student` and `admin`. Host is a later pool membership flag, not an account role.
- Passwords are hashed with bcrypt, 12 rounds. `passwordHash` and `upiId` are excluded from default queries.
- `COLLEGE_EMAIL_DOMAINS` is a comma-separated exact-domain list. Values are trimmed and lowercased. They are not hardcoded.
- Email verification is a boolean on the user. There is no verification collection. Until SMTP exists, a later demo flow must say that no email was sent.
- Protected routes use `requireAuth`. Admin routes add `requireRole('admin')`.
- Production refuses to boot when `JWT_SECRET` is missing or shorter than 24 characters. Development logs that it is using a non-production secret.

`POST /api/auth/register` and `POST /api/auth/login` issue the 12-hour access token. Register always stores `role: student` and ignores a role sent by the client. Both routes share a rate limiter. `GET /api/auth/me` uses `requireAuth` and returns the public user. `passwordHash` and `upiId` stay off every auth response. The session and admin ping routes remain for middleware checks.

## Money (not built yet)

When the optimizer lands, it lives in one server service:

- Store money as integer paise.
- Do not use floating-point arithmetic.
- Fee profiles are editable data, labelled illustrative, and snapshotted onto a recommendation.
- Recommend a pool only when every member has positive net savings.
- Leave unknown fees unknown. Do not coerce them to zero.

## Data isolation

Later demo seed data will set `isDemo: true`. Reset will delete only those records. The user schema already has the flag and an index.

## Errors

Operational errors use `AppError` and return `{ success: false, error: { message } }`. Unexpected errors return a generic 500 and log the exception. Responses do not include the Mongo URI, JWT secret, or Gemini key.

## Health

`GET /api/health` is liveness. `GET /api/health/ready` is readiness and returns 503 until Atlas is connected.

## Deferred

Refresh tokens, a separate email-verification collection, a Python service, demand snapshots, notification documents, match-proposal idempotency storage, trained demand models, and third-party grocery ordering. Demand insights, when added, will be live aggregations labelled as observations.

## Express version

The API uses Express 4. Current Express 5 is ESM-only (`"type": "module"`). CommonJS keeps Jest and Supertest on the existing Node test runner without an ESM transform.
