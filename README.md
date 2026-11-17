# DropPool

AI-powered campus demand intelligence and smart order pooling.

Predict demand. Match students. Optimize savings.

This repository is the hackathon MVP. Student registration and login are implemented. Shopping intents, matching, cost optimization, payments, and demand insights are not implemented yet.

## Stack

- React, Vite, Tailwind CSS, React Router, Axios
- Node.js, Express, Mongoose
- MongoDB Atlas
- Jest and Supertest

The API uses a single 12-hour JWT. There is no refresh-token flow. Gemini, when added, is called only from the server.

## Prerequisites

- Node.js 20 or newer
- A MongoDB Atlas cluster (free tier is enough)

The API starts without `MONGO_URI`. Health then reports the database as `unconfigured`. Data features in later milestones need Atlas.

## Setup

```bash
cd C:\dev\DropPool
copy .env.example .env
npm install
```

Edit `.env` before you need a database or a production build:

- `MONGO_URI` — Atlas connection string. Use the placeholders in `.env.example` as the shape. Do not commit the real value.
- `MONGO_DB_NAME` — database name. This overrides the name in the URI when it is set.
- `JWT_SECRET` — at least 24 characters in production. If it is missing in development, the server logs that it is using a development-only secret.
- `COLLEGE_EMAIL_DOMAINS` — comma-separated email domains allowed for registration. Values are trimmed and lowercased. `student@college.edu` matches `college.edu`. `student@cs.college.edu` does not.
- `GEMINI_API_KEY` — leave empty until cart extraction exists. Never put this key in a `VITE_` variable.
- `VITE_API_URL` — leave empty for local dev. The Vite dev server proxies `/api` to `http://localhost:4000`. Set the public API origin before `npm run build` if the client is hosted separately.

In Atlas, allow your IP and create a database user. The app does not create the cluster for you.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API on port 4000 and client on port 5173 |
| `npm run dev:server` | API only |
| `npm run dev:client` | Client only |
| `npm test` | Server unit and API tests |
| `npm run build` | Production client build |
| `npm start` | API without the file watcher |

## Health

- `GET /api/health` — process is up. Includes database status. Does not require Atlas.
- `GET /api/health/ready` — `200` only when MongoDB is connected. Otherwise `503`.

Auth scaffolding, not registration:

- `GET /api/auth/session` — requires `Authorization: Bearer <jwt>`
- `GET /api/auth/admin/ping` — requires an admin token

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — process boundaries and the decisions already locked in
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — routes that exist in this build
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — the User collection, and the collections that are not created yet
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) — what this foundation includes and what the next phase must not start early

## Current limits

- Students register and log in with `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me`. Registration always creates a `student`. An admin token is only for the existing admin ping route.
- No email is sent. SMTP is not configured, and the app must not claim otherwise.
- No shopping intents, matching, fee engine, pools, payments, orders, or demo seed.
- Seeded fee profiles and demo students arrive in a later milestone. Demo records will use `isDemo: true`.
- Express 4 is intentional. Express 5 is ESM-only, and this API stays on CommonJS so Jest can run it directly.
