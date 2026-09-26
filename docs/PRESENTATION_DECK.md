# StockSense — Hackathon Presentation Deck & Evaluation Guide

**Odoo x LPU Jalandhar Hackathon 2026**  
**Repository:** [STOCK-SENSE-ODOO-x-LPU](https://github.com/manas0306-ops/STOCK-SENSE-ODOO-x-LPU)  
**Live Backend:** Port 5000 (`http://localhost:5000/api`)  
**Live Frontend:** Port 5173 (`http://localhost:5173`)  
**Database:** PostgreSQL 18 on Port 5433  

---

## 1. Problem
Modern multi-warehouse facilities and growing manufacturers face severe operational challenges when managing inventory:
* **Inventory Discrepancies & Stockouts:** Unsynchronized updates lead to sales teams selling inventory that physical operations cannot fulfill.
* **Paper Registers & Manual Slips:** High latency, transcription errors, lost receipts, and unrecorded shrinkage.
* **Phantom Stock:** System reports stock is on hand, but workers find racks empty because prior dispatches were never decremented.
* **Lack of Auditability:** When quantities do not match physical counts, managers cannot determine who authorized the change, when it occurred, or what business document caused the movement.

---

## 2. StockSense Solution
StockSense is an enterprise-grade Inventory Management System engineered for transactional reliability, real-time auditability, and multi-location tracking:
* **Single Source of Truth:** Centralized database layer tracking stock levels by SKU and physical location.
* **Zero Negative Stock Guarantee:** All dispatches and transfers validate physical inventory availability at the database transaction level before approval.
* **Immutable Double-Entry Ledger:** Every stock alteration records before-and-after quantities, timestamp, operator ID, operation type, and reference numbers.
* **Streamlined Warehouse Operations:** Complete lifecycle tracking for Inbound Receipts, Internal Transfers, Outbound Deliveries, and Inventory Count Adjustments.

---

## 3. Why Traditional Spreadsheets Fail for Multi-Location Inventory
Spreadsheets (Excel, Google Sheets) fail in multi-warehouse environments because:
1. **No Concurrency Control:** When two warehouse operators simultaneously edit a sheet or fulfill orders, simultaneous writes overwrite each other (lost updates).
2. **No Location-Aware Atomicity:** Moving 20 kg from Warehouse A to Warehouse B requires two separate manual cell edits. If the second edit fails or is forgotten, 20 kg vanishes or duplicates.
3. **No Invariant Enforcement:** Spreadsheets lack hard database-level constraints (`CHECK (quantity >= 0)`). A formula typo can produce negative inventory without warning.
4. **No True Audit Trail:** Cell version history in spreadsheets does not provide structured, queryable ledger records tied to purchase orders, delivery notes, or physical count audits.

---

## 4. Core Architecture
StockSense follows a layered, resilient client-server ERP architecture:

```
[ React 18 + Vite Frontend ]  (Port 5173)
            │  HTTPS / REST JSON
            ▼
[ Express.js REST API Layer ] (Port 5000)
    ├── JWT Authentication & Role-Based Access Control
    ├── Validation & Error Interceptor
    └── Centralized Inventory Engine
            │  node-postgres (pg.Pool)
            ▼
[ PostgreSQL 18 ACID Database ] (Port 5433)
    ├── Pessimistic Locking: SELECT ... FOR UPDATE
    ├── Single Source of Truth: `stocks` table
    ├── Immutable Audit Trail: `stock_ledger` table
    └── Relational Schema: 16 normalized tables
```

---

## 5. React Frontend
* Built with **React 18**, **Vite**, **TailwindCSS**, and **Lucide React** icons.
* Fast client-side routing via **React Router DOM v6** with dedicated authentication guards (`AppLayout` protected routes vs. public login/register routes).
* **Live Database Status Indicator:** Sticky top bar shows active PostgreSQL engine connection and port.
* **Responsive App Shell:** Collapsible sidebar for desktop and mobile layouts.
* **Zero External Heavy Dependencies:** Pure web standards used for features like CSV generation and browser print preview.

---

## 6. Express Backend
* Built on **Node.js** and **Express.js (v4)**.
* **Stateless RESTful Endpoints:** Standardized JSON responses via `sendSuccess` and unified `errorHandler` middleware.
* **Security & Auth:** Password hashing using `bcryptjs` (salt rounds: 10) and secure signed JSON Web Tokens (`jsonwebtoken`) with 24-hour expiration.
* **Database Connection Pool:** Configured with `pg.Pool` enabling transactional checkout (`client.query('BEGIN')`, `'COMMIT'`, `'ROLLBACK'`).

---

## 7. PostgreSQL Database Layer
* **PostgreSQL 18** engine running locally on port 5433.
* 16 relational tables with strict foreign keys, cascade safety, and unique indices:
  `users`, `categories`, `warehouses`, `locations`, `suppliers`, `customers`, `products`, `stocks`, `receipts`, `receipt_items`, `deliveries`, `delivery_items`, `transfers`, `transfer_items`, `adjustments`, `stock_ledger`.
* Database-level integrity:
  ```sql
  CONSTRAINT positive_quantity CHECK (quantity >= 0)
  ```

---

## 8. Central Inventory Engine
All stock modifications across the entire application are strictly routed through the singleton `InventoryEngine` (`backend/src/services/inventoryEngine.js`). Direct ad-hoc updates to the `stocks` table are prohibited.

Four core primitives govern all stock mutations:
* `increaseStock(client, productId, locationId, quantity, userId, referenceType, referenceId, reason)`
* `decreaseStock(client, productId, locationId, quantity, userId, referenceType, referenceId, reason)`
* `transferStock(client, productId, fromLocationId, toLocationId, quantity, userId, referenceType, referenceId, reason)`
* `setStock(client, productId, locationId, newQuantity, userId, referenceType, referenceId, reason)`

---

## 9. ACID Transaction Handling
Every operational workflow (Receipt, Delivery, Transfer, Adjustment) runs inside an isolated ACID database transaction block:
1. `BEGIN`: Starts transaction.
2. Row-level locks acquired for all impacted product-location pairs.
3. Availability and validation logic evaluated against locked rows.
4. Target balance updated.
5. Corresponding audit entry written to `stock_ledger`.
6. Document status updated from `ready` to `done`.
7. `COMMIT`: Finalizes changes atomically.
8. `ROLLBACK`: Reverts entire sequence on any constraint violation or unexpected error.

---

## 10. Concurrency & SELECT ... FOR UPDATE
To eliminate race conditions when multiple warehouse staff dispatch stock concurrently:
* `InventoryEngine` executes:
  ```sql
  SELECT id, quantity 
  FROM stocks 
  WHERE product_id = $1 AND location_id = $2 
  FOR UPDATE;
  ```
* This places a pessimistic row-level lock on the specific stock record.
* Parallel transactions attempting to read or decrement that stock record must wait until the active transaction commits or rolls back, preventing double-allocation and overselling.

---

## 11. Negative-Stock Prevention
StockSense enforces negative-stock prevention at two distinct layers:
1. **Application Layer (`InventoryEngine.decreaseStock`):**
   ```javascript
   if (currentStock < requestedQuantity) {
     throw new InsufficientStockError(available, requested);
   }
   ```
2. **Database Schema Layer:**
   `stocks.quantity` contains a hard `CHECK (quantity >= 0)` constraint. Even if an unhandled edge case bypassed the application layer, the PostgreSQL engine aborts the transaction with error code `23514` (`check_violation`).

---

## 12. Multi-Location Inventory Hierarchy
StockSense models the physical reality of enterprise warehouses through a two-tiered hierarchy:
* **Warehouses:** High-level logistics facilities (e.g., *Main Warehouse*, *Secondary Facility*).
* **Locations:** Physical, functional partitions within a warehouse:
  * *Main Store* (Primary storage rack)
  * *Production* (Factory assembly floor)
  * *Quality Inspection* (Inbound quarantine area)
  * *Scrap / Quarantine* (Damaged stock holding)

Total enterprise stock is computed dynamically by summing inventory across all locations.

---

## 13. Receipts (Inbound Operations)
* **Lifecycle:** `draft` ➔ `ready` ➔ `done`.
* Records incoming shipments from registered Suppliers into a specified destination location.
* Validating a receipt invokes `InventoryEngine.increaseStock()`, incrementing physical inventory and logging a `RECEIPT` ledger event.
* **Idempotency:** Once marked `done`, duplicate validation requests are strictly rejected (`ALREADY_VALIDATED`).

---

## 14. Deliveries (Outbound Operations)
* **Lifecycle:** `draft` ➔ `ready` ➔ `done`.
* Fulfills customer sales shipments from a specified source location.
* Validating a delivery invokes `InventoryEngine.decreaseStock()`.
* If requested quantity exceeds available physical stock at that location, the transaction aborts with `INSUFFICIENT_STOCK` (HTTP 400).

---

## 15. Transfers (Internal Movements)
* Moves inventory between two physical locations (either intra-warehouse or inter-warehouse).
* **Validation Guards:**
  * Same-location transfers rejected (`source_location !== destination_location`).
  * Source location balance checked under lock before initiating movement.
* Executes atomically: decrements source location (`TRANSFER_OUT`) and increments destination location (`TRANSFER_IN`) within the exact same database transaction.

---

## 16. Adjustments (Physical Inventory Reconciliation)
* Reconciles physical count variances caused by periodic stocktaking, shrinkage, or damaged goods.
* Operator inputs: Product, Location, Physical Counted Quantity, and Reason.
* Invokes `InventoryEngine.setStock()`: computes variance (`counted - current`), adjusts balance to match physical count, and writes an `ADJUSTMENT` audit record with the operator's rationale.

---

## 17. Stock Ledger
* An append-only, immutable audit log of every movement in the system.
* Captures: `timestamp`, `product_id`, `sku`, `operation_type`, `source_location`, `destination_location`, `quantity`, `previous_stock`, `new_stock`, `user_id`, `reference_type`, and `reference_id`.
* Filterable in real-time by Product, Operation Type, Location, Operator, and Date Range.

---

## 18. Dashboard & Real-Time KPIs
* **Top Metric Cards:** Total Active Products, Total Available Stock, Low Stock Alert Count, Total Completed Movements.
* **Low Stock Warning Banner:** Dynamically queries products where `current_stock <= reorder_level` and displays quick-action links.
* **Operational Overview:** Live counts of pending Receipts, Deliveries, and Transfers awaiting fulfillment.

---

## 19. CSV Export Functionality
* Available on both **Product Catalog** and **Stock Ledger**.
* Uses standard RFC 4180 CSV formatting with quotation escaping.
* Implemented client-side with native Blob API: zero third-party dependencies, instant execution, and automatic sanitized filename generation (`stocksense_ledger_export_*.csv`).

---

## 20. Printable Operational Documents
* Professional, high-contrast warehouse documents formatted for physical thermal/laser printers and PDF generation:
  * **Outbound Goods Delivery Note:** Order reference, customer details, source rack, itemized SKU breakdown, dispatcher signature line, carrier signature line.
  * **Inbound Goods Receiving Note (GRN):** Order reference, vendor information, destination location, quantity received, receiving officer sign-off, driver sign-off.
* Accessible via one-click printer icons on list tables and inside inspection modals.

---

## 21. Automated Testing & Verification
StockSense includes 35 comprehensive automated tests running on Node's native test runner (`node:test`):
* **API Integration Suite (`backend/test/api.test.js`):** Tests authentication, protected routes, product CRUD, receipt/transfer/delivery lifecycles, and dashboard APIs.
* **Concurrency Suite (`backend/test/concurrency.test.js`):** Simulates simultaneous delivery dispatches against a single stock row to verify pessimistic lock serialization.
* **Acceptance Suite (`backend/test/inventory.test.js`):** Verifies the full business story (100 kg receive ➔ 20 kg transfer ➔ over-delivery rejection ➔ delivery ➔ adjustment).

**Baseline Status: 35 / 35 PASS (100% Pass Rate).**

---

## 22. Database Health Verification
The built-in health utility (`npm --prefix backend run health`) audits database integrity:
* Verifies live PostgreSQL connection and version.
* Audits record counts across all 16 tables.
* Executes zero-negative-stock validation query (verifies 0 negative rows).
* Executes referential integrity audit (verifies 0 orphaned ledger records).

---

## 23. 3-Minute Live Demonstration Script

| Time | Action | Screen / Endpoint | What to Say / Demonstrate |
| :--- | :--- | :--- | :--- |
| **0:00–0:30** | **Problem & Solution** | Login Screen / Dashboard | Introduce StockSense. Explain why spreadsheets fail (lack of atomic locking, negative stock anomalies, untracked locations). StockSense solves this with PostgreSQL ACID safety and a centralized inventory engine. |
| **0:30–1:00** | **Architecture & Safety** | Navbar & Architecture | Point out the live PostgreSQL connection indicator (Port 5433). Explain how `SELECT ... FOR UPDATE` row locks guarantee zero race conditions and zero negative stock. |
| **1:00–1:30** | **Receive 100 kg Steel** | Receipts (`/receipts`) | Create receipt for `100 kg` Steel Sheets (`STL-001`) into `Main Store`. Validate the receipt. Show status changing to `Done`. Click printer icon to show the printable Goods Receiving Note. |
| **1:30–2:00** | **Transfer 20 kg to Production** | Transfers (`/transfers`) | Create internal transfer moving `20 kg` from `Main Store` to `Production Floor`. Validate. Show that `Main Store` became `80 kg` and `Production` became `20 kg` atomically. |
| **2:00–2:25** | **Attempt Over-Delivery (Rejection)** | Deliveries (`/deliveries`) | Create delivery attempting to ship `25 kg` from `Production Floor`. Click Validate. Point out the instant rejection: `"Insufficient stock. Available: 20 kg, Requested: 25 kg"`. Demonstrates negative-stock prevention. |
| **2:25–2:45** | **Deliver 20 kg Successfully** | Deliveries (`/deliveries`) | Update delivery to `20 kg` and validate. Stock at `Production Floor` becomes `0 kg`. Click Print Delivery Slip to display formal warehouse shipping slip with signature boxes. |
| **2:45–2:55** | **Adjust Damaged Stock** | Adjustments (`/adjustments`) | Perform stock adjustment for `Main Store`: physical count = `77 kg` (down from 80 kg). Enter reason: *"Rain damage in aisle 3"*. Apply adjustment. Show updated balance. |
| **2:55–3:00** | **Ledger & Audit Proof** | Stock Ledger (`/ledger`) | Open Stock Ledger. Show every single transaction in chronological order with before/after stock and operator stamps. Click CSV Export to prove data portability. Conclude demo. |

---

## 24. Team Information & Work Breakdown

| Team Member | Project Role | Core Contributions | GitHub Profile |
| :--- | :--- | :--- | :--- |
| **Maanas Pandey (Leader)** | **Inventory Engine & Backend Core** | PostgreSQL 18 schema, connection pooling, Central Inventory Engine (`increaseStock`, `decreaseStock`, `transferStock`, `setStock`), concurrency locking, REST APIs, test suites (`35/35 passing`). | [@manas0306-ops](https://github.com/manas0306-ops) |
| **Uj1710glitch** | **Full-Stack QA & Usability Engineer** | Print document generator (`printDocument.js`), warehouse receipt & delivery slips, final integration QA pass, end-to-end regression validation, presentation deck. | [@Uj1710glitch](https://github.com/Uj1710glitch) |
| **27vedantkumar** | **Frontend Shell & Analytical Views** | SaaS layout shell, navigation, authentication pages, live dashboard KPI aggregations, CSV export utility (`csvExport.js`). | [@27vedantkumar](https://github.com/27vedantkumar) |
| **Ujjwal Prakash** | **Operations UI & Integration** | Operations interfaces (Receipts, Deliveries, Transfers, Adjustments, Ledger tables), modal inspectors, and status filtering workflows. | [@ujjwalprakash07](https://github.com/ujjwalprakash07) |

---
*Built with precision for the Odoo x LPU Jalandhar Hackathon 2026.*
