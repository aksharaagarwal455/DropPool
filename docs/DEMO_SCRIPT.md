# DropPool — Hackathon Demonstration Script & Verification Guide

This script walks through the end-to-end flow of **DropPool**, an AI-assisted campus demand intelligence and smart order pooling platform built for hostel students at **Banasthali Vidyapeeth** who order quick-commerce essentials from **Blinkit, Zepto, and Instamart**.

---

## 1. Core Product Rule & Architecture

- **The Problem**: Small individual grocery carts (e.g. ₹60–₹120 of milk and bread) pay disproportionate surcharges (small cart fee + handling fee + delivery fee = ₹30–₹50 extra).
- **The Core Decision Engine Rule**: DropPool recommends a pool **ONLY when every single participant has positive net savings** (`savingsPaise > 0`). If even one student pays more or saves nothing, pooling is rejected (`status: 'individual'`).
- **Integer Paise Arithmetic**: All financial values are calculated in integer paise end-to-end to eliminate floating-point drift.
- **Peer-to-Peer Settlement**: DropPool never impersonates quick-commerce platforms or acts as an automated payment gateway. All payments occur peer-to-peer via UPI with host confirmation.
- **Notice**: *"Illustrative fees, not verified current platform pricing."*

---

## 2. Environment Setup & Launching DropPool

### Prerequisites
- Node.js 18+ (tested with React 19 + Express 4)
- Local MongoDB running at `127.0.0.1:27017` (or remote URI in `server/.env`)

### Step 1: Start the Backend Server
```bash
cd server
# Ensure .env has DEMO_MODE=true
npm run seed:demo    # Seeds Aarav, Diya, Kabir, Meera, Rohan, Ishita
npm start            # Runs on http://localhost:5000
```

### Step 2: Start the Frontend Client
```bash
cd client
npm run dev          # Runs on http://localhost:5173
```

---

## 3. The 7-Step Happy Path Walkthrough (Positive Net Savings)

### Step 1: Login via Quick Persona (Aarav Mehta)
1. Navigate to `http://localhost:5173/login`.
2. Under **Quick Demo Personas**, click **Aarav Mehta** (`aarav@banasthali.in`, Gargi A, Host persona).
3. The app authenticates via a real JWT token and loads the **Campus Dashboard**.

### Step 2: Create a Shopping Intent (Solo Cart)
1. Click **+ Create Shopping Intent** (or visit `/intent`).
2. Select Platform: **Zepto**.
3. Notice default hostel is prefilled from profile (**Gargi A**).
4. Select Delivery Window: default is current time + 45 minutes (validated $\le 24$h).
5. Add Cart Items:
   - Item 1: **"Amul Toned Milk"**, Qty: `1`, Price: `₹60`
   - Item 2: **"Whole Wheat Bread"**, Qty: `1`, Price: `₹60`
   - Subtotal: **₹120.00**.
6. Observe the **Estimated Solo Cost** card on the right:
   - Live debounced call to `/api/meta/fees` returns illustrative standalone fees:
     - Delivery Fee: ₹25.00
     - Handling Fee: ₹5.00
     - Small Cart Fee: ₹20.00
     - Total Solo Payable: **₹170.00** (Illustrative fees).
7. Click **Create & Find Matches**.

### Step 3: Match Demand & Decision Engine
1. You are redirected to `/matches`.
2. Click **Find Compatible Matches**. The backend matches Aarav's intent against active intents in the same hostel and platform (Diya and Kabir).
3. Observe the **Optimizer Recommendation Banner**:
   - Status: `pool` (Green banner).
   - Headline: *"Recommended Pool: 3 students"*.
   - Explanations: Positive savings for every single member.
4. Click **Create Shared Pool** to reserve intents and form the pool.

### Step 4: Cost Optimizer Breakdown
1. You can inspect `/optimizer` at any time.
2. Toggle between **Proportional Split** (split fees proportional to cart size) and **Equal Split**.
3. View the per-member breakdown table:
   - Solo cost vs Pooled share.
   - Net savings highlighted in green for each participant.

### Step 5: Form the Pool & Confirm Membership
1. The pool enters `proposed` status with pool code (e.g. `DP-E4F201`).
2. In another browser profile / private window (or by logging in as Diya):
   - Click quick login as **Diya Sharma** (`diya@banasthali.in`).
   - Navigate to `/pools`. Diya sees the pending pool invitation.
   - Click **Confirm Membership**.
3. Log in as **Kabir Singh** (`kabir@banasthali.in`) and click **Confirm Membership**.
4. Once all members confirm, the pool moves to `confirmed`.

### Step 6: Coordinate Contributions (Host Checkout & Peer UPI)
1. Switch back to Host (**Aarav Mehta**).
2. Because all members confirmed, the host sees **Record External Checkout Total**:
   - Host places the combined order externally on Zepto.
   - Host enters the actual billed total: `₹330.00`.
   - Host clicks **Lock & Bill Shares**.
3. Pool transitions to `awaiting_payments`.
4. Switch to Member (**Diya Sharma**):
   - Diya visits the pool detail page and sees her **Member Payment Card**.
   - Displays exact share amount, UPI QR code, and `upi://pay` deep link.
   - Reads the server's payment notice verbatim:
     > *"A UPI link or QR code starts a payment. It does not prove that money arrived. The host confirms receipt manually."*
   - Diya enters a transaction reference (UTR): `408129841029` and clicks **Submit Claim**.
5. Switch back to Host (**Aarav Mehta**):
   - Aarav sees Diya's payment claim and UTR in the **Member Contributions** table.
   - Clicks **Confirm Received**.
   - Once all member payments are confirmed, pool status advances to `payments_confirmed`.

### Step 7: Order Delivery & Hostel Pickup
1. Host clicks **Mark Order Placed Externally** $\rightarrow$ status becomes `order_placed`.
2. Host clicks **Mark Ready for Hostel Pickup**:
   - Modal prompts for pickup location: *"Gargi A Common Room"* and optional ETA.
   - Clicks **Notify Members** $\rightarrow$ status becomes `ready_for_pickup`.
   - All members see the highlighted pickup location card.
3. Host marks **Mark Pool Run Completed** $\rightarrow$ status becomes `completed`.
4. Visit `/history`:
   - Completed pool is archived.
   - Cumulative verified savings are added up (e.g. `+₹20.00`).
   - Payment settlements and UTRs are recorded in the payment audit table.

---

## 4. The Negative Path Walkthrough (Decision Engine Rejection)

DropPool's core differentiator is that it **refuses to pool when anyone loses money**.

1. Log in via quick persona as **Rohan Das** (`rohan@banasthali.in`, Tagore C).
2. Rohan has a large cart on **Instamart** (`₹250.00` subtotal), which already qualifies for zero delivery fees on the platform (`observedFeesPaise: 0`).
3. Click **Find Matches**. The only compatible candidate in Tagore C is **Ishita Nair**, who also has a large cart qualifying for free delivery.
4. **Decision Engine Result**:
   - The server optimizer returns `status: 'individual'`.
   - Reason: *"Pooling is not recommended: individual orders already pay zero fees; pooling would add handling or shared fees without reducing delivery costs."*
   - UI Banner displays Amber/Rose alert clearly explaining that ordering individually is cheaper.
   - Pool creation button is disabled.

---

## 5. AI Screenshot Cart Extraction Fallback & Review

1. Navigate to `/intent`.
2. Click the **Screenshot (AI)** tab.
3. If `GEMINI_API_KEY` is not set or network is unreachable:
   - The server cleanly returns `503 Service Unavailable` with `fallback: 'manual'`.
   - The UI surfaces the server warning: *"Gemini API key is not configured on the server. You can enter items manually."*
   - Seamlessly guides the student back to the manual cart input without freezing or failing silently.
4. When `GEMINI_API_KEY` is configured:
   - Uploading a checkout screenshot extracts item names, quantities, and prices.
   - Missing prices are flagged with `needsReview: true`, requiring the student to verify items before submission.

---

## 6. Verification Checklist Results

| Check | Expected | Result |
| :--- | :--- | :--- |
| Brand Identity | Pitch deck dark forest green, lime highlights, light green cards | **PASS** |
| Campus Context | Banasthali Vidyapeeth throughout client, 0 occurrences of IIT Bombay | **PASS** |
| Precision Math | Integer paise end-to-end, zero floating-point currency representation | **PASS** |
| Protected Routing | All app routes protected behind real JWT session checks | **PASS** |
| Server Tests | All unit, fee, password, and matcher suites pass | **PASS (40/40 tests)** |
| Production Build | Vite 8 + React 19 production build succeeds | **PASS** |
