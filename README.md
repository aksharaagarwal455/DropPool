# DropPool

AI-powered campus demand intelligence and smart order pooling for hostel students at **Banasthali Vidyapeeth** who order quick-commerce essentials from **Blinkit, Zepto, and Instamart**.

> **Core Decision Engine Rule**: DropPool recommends a pool **ONLY when every single participant has positive net savings** (`savingsPaise > 0`). If even one student pays more or saves nothing, pooling is rejected (`status: 'individual'`). If fee data is incomplete, pooling is not assumed (`status: 'insufficient_data'`).

---

## Architecture & Technology Stack

- **Client Workspace (`droppool-client`)**: React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios, `qrcode`.
- **Server Workspace (`droppool-server`)**: Node.js, Express 4 (CommonJS), Mongoose, JWT, Jest, Supertest.
- **Design System**: Pitch deck brand identity featuring Deep Forest Green (`#0F3D1E`), Lime Green accents (`#84CC16`/`#A3E635` and `.highlight-lime`), and Soft Mint cards on clean off-white (`#F8FAF6`).
- **Precision Currency**: Integer paise end-to-end (`100 paise = 1 INR`) to prevent floating-point calculation errors.
- **Peer-to-Peer UPI Settlement**: Direct peer transfers via dynamic QR generation and deep links (`upi://pay`), verified manually by the host.

---

## Key Features

1. **Campus Authentication & Profile**: College email domain validation (`banasthali.in`), hostel and room configuration, encrypted/masked UPI ID storage, and real peer trust metrics.
2. **Intent Creation & AI Cart Extraction**: Create shopping intents with flexible delivery windows; optional AI screenshot cart extraction via Gemini with fallback to manual input.
3. **Solo Fee Estimation**: Live debounced solo fee estimation via `/api/meta/fees`.
4. **Campus Proximity & Goal-Driven Matching Engine**: Goal-driven pool formation searching in expanding proximity rings (same floor $\rightarrow$ block $\rightarrow$ hostel $\rightarrow$ nearby walking hostel $\le 7$ min). Stops once platform free delivery threshold is reached with minimum members needed; rejects additional members if marginal savings are below ₹5 (500 paise).
5. **Cost Optimizer**: Dynamic proportional vs. equal split computation, verifying net savings for all participants before allowing pool formation.
6. **Pool Lifecycle Management**: 7-stage state machine tracking `proposed` $\rightarrow$ `confirmed` $\rightarrow$ `awaiting_payments` $\rightarrow$ `payments_confirmed` $\rightarrow$ `order_placed` $\rightarrow$ `ready_for_pickup` $\rightarrow$ `completed` (or `cancelled`).
7. **Host Operations & Peer Settlement**: Host checkout total recording, peer UPI QR code and UTR transaction claim, host verification/rejection, and hostel pickup dispatch.
8. **Live Campus Demand Intelligence**: Real-time order volume, peak hours, and heuristic pooling opportunities across hostels sorted nearest-first.

---

## Campus Proximity Model & Coordinates

DropPool uses Haversine distance and walking time across Banasthali Vidyapeeth hostels:
- Model configuration: `server/src/config/campusMap.json`
- Verification script: `npm run check:campus`
- Proximity tiers:
  - **Tier 0**: Same floor
  - **Tier 1**: Same block
  - **Tier 2**: Same hostel
  - **Tier 3**: Nearby hostel ($\le 7$ min walk)
  - **Tier 4**: Campus-wide (optional)

> [!NOTE]
> `campusMap.json` contains placeholder coordinates (`lat: 0.0, lng: 0.0`). Fill with actual Banasthali coordinates before campus launch and verify with `npm run check:campus`.

---

## Deployment (Render + Vercel + MongoDB Atlas)

Complete click-by-click instructions are provided in [DEPLOY.md](DEPLOY.md):
- **Backend API**: Render (`render.yaml` blueprint with health check at `/api/health`).
- **Frontend SPA**: Vercel (`vercel.json` with SPA routing).
- **Database**: MongoDB Atlas M0 Free Cluster.

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```
Ensure configuration keys are present:
- `COLLEGE_EMAIL_DOMAINS=banasthali.in,demo.droppool.test`
- `HOSTELS=Shri Shanta Teertham Hostel,Shri Shanta Nikay,Shri Shanta Sthaaniyam,Shri Shanta Neri,Shri Shanta Lok,Shri Shanta Sharanam`
- `DEMO_MODE=true`

### 3. Seed Demo Data & Start Services
```bash
# Seed quick personas (Aarav, Diya, Kabir, Meera, Rohan, Ishita)
npm run seed:demo -w droppool-server

# Start server (port 5000) and client (port 5173) concurrently
npm run dev
```

---

## Testing & Build

```bash
# Production client build
npm run build -w droppool-client

# Server unit & integration test suite
npm test -w droppool-server
```

---

## Detailed Demonstration Script

For a step-by-step walkthrough of both the positive net savings scenario and the decision engine rejection scenario, see [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

---

## Disclaimer

All quick-commerce fee calculations and platform charges displayed in the app are **illustrative estimates** based on sample platform tier profiles and are never claimed as verified real-time platform pricing quotes.
