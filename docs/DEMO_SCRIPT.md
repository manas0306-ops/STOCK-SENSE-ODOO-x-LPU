# StockSense — Official Hackathon Live Demo Story & Judge Walkthrough

Use this exact 3-minute presentation script during hackathon judging. It proves genuine database persistence, zero-negative-stock validation, atomic transactions, and live audit logging.

---

## ⏱️ Minute 0:00 – 0:30: Login & Problem Statement
1. Open application in browser at `http://localhost:5173`.
2. Click **Manager Demo** button (`manager@stocksense.com` / `admin123`).
3. Click **Sign In to Workspace**.
4. **Key Talking Point to Judges:**
   > *"StockSense replaces paper registers and disjointed Excel sheets with a real-time, PostgreSQL-backed Inventory Engine that guarantees atomic transactions and multi-location audit trails."*

---

## ⏱️ Minute 0:30 – 1:00: Step 1 — Product & Incoming Receipt (+100 kg Steel)
1. Navigate to **Products**.
2. Show **Steel Sheets (STL-001)**. Currently `0 kg` stock.
3. Click **Receipts** → **New Receipt**.
4. Select:
   - **Supplier:** ABC Steel Suppliers
   - **Destination:** Main Warehouse → Main Store
   - **Product:** Steel Sheets (STL-001)
   - **Quantity:** `100` kg
5. Click **Save Draft Receipt** → Open receipt → Click **Validate & Increase Stock**.
6. **Show Judges:**
   - Receipt status updates to **Done**.
   - Navigate to **Products**: Total available stock is now **100 kg**.
   - Click **Locations**: `Main Store = 100 kg`.

---

## ⏱️ Minute 1:00 – 1:45: Step 2 — Internal Transfer (20 kg Main Store → Production)
1. Navigate to **Transfers** → **New Transfer**.
2. Select:
   - **Source:** Main Store
   - **Destination:** Production
   - **Product:** Steel Sheets (STL-001)
   - **Quantity:** `20` kg
3. Click **Save Draft Transfer** → Open detail → Click **Execute Atomic Transfer**.
4. **Show Judges:**
   - Total stock across the company remains **100 kg** (invariant preserved).
   - Location breakdown:
     - `Main Store = 80 kg`
     - `Production = 20 kg`
   - Attempting to transfer more than 80 kg from Main Store is instantly rejected with `INSUFFICIENT_STOCK`.

---

## ⏱️ Minute 1:45 – 2:15: Step 3 — Customer Delivery Order (20 kg Out of Production)
1. Navigate to **Deliveries** → **New Delivery Order**.
2. Select:
   - **Customer:** XYZ Manufacturing
   - **Source Location:** Production
   - **Product:** Steel Sheets (STL-001)
   - **Quantity:** `20` kg
3. Click **Save Draft Delivery** → Open detail → Click **Validate & Dispatch**.
4. **Show Judges:**
   - Production stock drops from `20 kg` to **0 kg**.
   - Total company stock drops to **80 kg**.
   - *Negative Stock Demo:* Try creating another delivery of `5 kg` from Production. The system throws:
     `Insufficient stock. Available: 0 kg, Requested: 5 kg`. Zero negative inventory is guaranteed.

---

## ⏱️ Minute 2:15 – 2:45: Step 4 — Physical Count Adjustment (-3 kg Damage)
1. Navigate to **Adjustments** → **New Stock Adjustment**.
2. Select:
   - **Product:** Steel Sheets (STL-001)
   - **Location:** Main Store (Current system: `80 kg`)
   - **Counted Quantity:** `77` kg
   - **Audit Reason:** `3 kg damaged in storage during heavy rainfall in aisle 3`
3. Click **Apply Count Reconciliation**.
4. **Show Judges:**
   - Delta is calculated as `-3 kg`.
   - New stock in Main Store is updated to **77 kg**.
   - Total inventory is now **77 kg**.

---

## ⏱️ Minute 2:45 – 3:00: Step 5 — Stock Ledger & Persistence Proof
1. Navigate to **Stock Ledger**:
   - Point out the immutable timeline of transactions:
     - `RECEIPT` (+100 kg into Main Store)
     - `TRANSFER_OUT` (-20 kg from Main Store)
     - `TRANSFER_IN` (+20 kg into Production)
     - `DELIVERY` (-20 kg out of Production)
     - `ADJUSTMENT` (-3 kg variance with rainfall reason)
2. Navigate to **Dashboard**:
   - Live KPI cards reflect updated inventory numbers and active transactions.
3. **Hard Refresh the Browser (Ctrl + Shift + R / F5):**
   - All numbers remain 100% intact, fetched live from PostgreSQL.
4. **Concluding Statement:**
   > *"No mock data, no client-side calculations, zero negative stock, and full atomic transaction safety. That is StockSense."*
