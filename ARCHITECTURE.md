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

## Money & Cost Optimization

The optimizer lives on the server in `src/services/optimization/optimizer.js` and `src/services/fees/feeRules.js`:
- All currency calculations use integer paise (`100 paise = ₹1.00`). No floating-point math.
- Fee targets (`feeTargets`) calculate platform free delivery and small-cart fee thresholds.
- Recommends a pool ONLY if every member has positive net savings (`savingsPaise > 0`).
- Unknown fees remain unknown (`insufficient_data`).

## Campus Distance Model & Goal-Driven Matching

Located in `src/utils/distance.js` and `src/services/matching/matcher.js`:
- Campus map: `src/config/campusMap.json` defining hostel coordinates, walk speed (80 m/min), and detour factor (1.3).
- Proximity tiers: 0 (same floor), 1 (same block), 2 (same hostel), 3 (nearby hostel $\le$ `NEAR_MIN` minutes), 4 (campus-wide).
- Expanding rings: Searches for compatible carts starting at tier 0 through `MAX_PROXIMITY_TIER` (default 3).
- Goal-driven stopping: Stops adding members as soon as the platform's free delivery threshold is crossed with fewest members needed.
- Marginal savings threshold: Refuses to add a student if their marginal contribution saves peers $< ₹5.00$ (`MIN_MARGINAL_SAVING_PAISE = 500`).
- Board nearest-first: Active demand board orders other students by walking distance and proximity tier.

## Deployment Architecture

- **Backend**: Hosted on Render free tier (`render.yaml`) binding to `0.0.0.0` with `/api/health` liveness probe and multi-origin CORS support.
- **Frontend**: Hosted on Vercel (`vercel.json`) with SPA fallback and cold-start wake detection banner for sleeping Render instances.
- **Database**: MongoDB Atlas M0 cluster connected via `MONGO_URI`.

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
