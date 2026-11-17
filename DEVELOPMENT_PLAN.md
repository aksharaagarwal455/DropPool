# DropPool development plan

Hackathon MVP. This file records what the foundation includes and what stays out until a later phase is explicitly started.

## Done in this foundation

- npm workspaces: `client` and `server`
- Vite, React, Tailwind, React Router, Axios
- Home screen that calls `GET /api/health`
- Express 4 API on port 4000, CommonJS, helmet, CORS from `CLIENT_ORIGIN`
- Environment loading from the repository-root `.env`
- Mongo connection that reports `unconfigured` or a failed connect without crashing the process
- 12-hour access JWT, bcrypt (12 rounds), comma-separated college domains, `student` and `admin` role guard
- `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me`, with rate limits on register and login
- User schema with `isDemo`, hidden `passwordHash` and `upiId`
- Jest tests for env rules, health, token middleware, password hashing, email domain, and the User schema paths
- `.env.example`, `README.md`, `ARCHITECTURE.md`, `API_DOCUMENTATION.md`, `DATABASE_SCHEMA.md`

## Explicitly not started

- Email verification
- Intents, fee profiles, optimizer, matching, pools
- Payments, orders, demand aggregations
- Gemini extraction
- Demo seed and demo reset
- Production deploy to Vercel, Render, or Atlas beyond the connection string

## Rules for the next phase

- Money is integer paise, in one server module. The client only displays server results.
- Fee profiles are data. A recommendation snapshots the profile it used.
- A pool recommendation requires every member's share to be strictly below that member's individual total. Unknown fees stay unknown.
- Gemini is called only from the server. A missing key or a failed call must leave the student on manual cart entry.
- Demo documents use `isDemo: true`. A reset deletes only those documents.
- Do not add a refresh token or a Python service unless the architecture is changed on purpose.

## Checks before calling the foundation done

1. `npm test` passes.
2. `npm run build` produces the client bundle.
3. `GET /api/health` returns `200` with `database.status` of `unconfigured` when `MONGO_URI` is unset.
4. `GET /api/health/ready` returns `503` in that same configuration.
