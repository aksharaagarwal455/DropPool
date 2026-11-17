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
4. **Demand Matching Engine**: Pairwise compatibility scoring (platform, hostel, product similarity, overlapping delivery window).
5. **Cost Optimizer**: Dynamic proportional vs. equal split computation, verifying net savings for all participants before allowing pool formation.
6. **Pool Lifecycle Management**: 7-stage state machine tracking `proposed` $\rightarrow$ `confirmed` $\rightarrow$ `awaiting_payments` $\rightarrow$ `payments_confirmed` $\rightarrow$ `order_placed` $\rightarrow$ `ready_for_pickup` $\rightarrow$ `completed` (or `cancelled`).
7. **Host Operations & Peer Settlement**: Host checkout total recording, peer UPI QR code and UTR transaction claim, host verification/rejection, and hostel pickup dispatch.
8. **Live Campus Demand Intelligence**: Real-time order volume, peak hours, and heuristic pooling opportunities across hostels.

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
- `HOSTELS=Gargi Hostel,Maitreyi Hostel,Shri Shanta Nilaya,Kasturba Hostel,Vaidehi Hostel`
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
