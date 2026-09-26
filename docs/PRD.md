# StockSense — Product Requirements Document (PRD)

**Project Name:** StockSense  
**Hackathon:** Odoo x LPU Jalandhar Hackathon 2026  
**Document Version:** 1.0.0  
**Target Release:** Production / Hackathon Final Submission  
**Repository:** [STOCK-SENSE-ODOO-x-LPU](https://github.com/manas0306-ops/STOCK-SENSE-ODOO-x-LPU)  

---

## 1. Executive Summary
StockSense is an enterprise-grade, transactional Inventory Management System (IMS) engineered to solve the operational chaos of multi-warehouse supply chains. Built specifically to counter the flaws of paper-based logbooks and disconnected spreadsheets, StockSense provides an atomic, PostgreSQL-backed single source of truth for stock quantities, warehouse locations, and inventory movements.

By pairing a transactional **Central Inventory Engine** with strict database-level zero-negative-stock invariants, an immutable double-entry stock ledger, and clean ERP document workflows (printable delivery notes, goods receipt notes, and CSV exports), StockSense delivers true enterprise inventory control.

---

## 2. Problem Statement & Market Context

### 2.1 The Problem
Small-to-medium enterprises (SMEs) and light manufacturing facilities regularly experience:
1. **Spreadsheet Discrepancies:** Multiple floor managers editing spreadsheets concurrently leads to overwritten cell data and phantom stock.
2. **Negative Stock Anomalies:** Orders dispatched against non-existent physical inventory cause shipping delays and customer penalties.
3. **No Multi-Location Visibility:** Enterprise managers may know they have 100 units overall, but cannot ascertain which aisle, rack, or facility holds them.
4. **Zero Auditability:** Shrinkage, damage, and unauthorized relocations go untracked because traditional systems lack an immutable, operator-attributed audit trail.

### 2.2 Target Personas

| Persona | Role | Primary Goal | Pain Points in Legacy Systems |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | Inventory Manager | Maintain optimal inventory levels, prevent stockouts, audit shrinkage, export regulatory data. | Blind spots in multi-location distribution, unexpected stockouts, lack of historical accountability. |
| **Sam Patel** | Warehouse Staff | Quickly receive inbound shipments, execute internal moves to production, ship orders with paperwork. | Slow software, confusing interfaces, manual math errors, paper slip misplacement. |
| **Operations Auditor** | Compliance / Finance | Verify inventory valuations, trace every SKU mutation to an authorized business document. | No tamper-proof logs, inability to prove who modified stock balances. |

---

## 3. Goals & Non-Goals

### 3.1 Product Goals
* **P0 — Transactional Integrity:** Eliminate race conditions and double-dispatching via PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`).
* **P0 — Strict Zero Negative Stock:** Guarantee that no location balance can ever drop below zero at both application and database schema levels.
* **P0 — Multi-Location Tracking:** Seamlessly manage inventory segmented across Warehouses and sub-locations (Main Store, Production Floor, Quarantine/Scrap).
* **P0 — Complete Operational Workflows:** Standardize Inbound Receipts, Internal Transfers, Outbound Deliveries, and Physical Adjustments.
* **P0 — Immutable Audit Trail:** Record every balance mutation in an append-only Stock Ledger capturing timestamp, operator, delta, and reference ID.
* **P1 — ERP Usability:** Provide instantaneous RFC 4180 CSV exports and printable warehouse-ready Delivery Slips and Goods Receiving Notes (GRN).
* **P1 — Low Stock Intelligence:** Real-time visual alerts and dashboard KPIs when stock reaches or breaches configured reorder thresholds.

### 3.2 Non-Goals (Out of Scope for v1.0)
* Multi-currency FOREX accounting (all inventory values are standardized in local currency).
* Automated autonomous vehicle / AGV hardware robot telemetry.
* End-to-end customer e-commerce storefront checkout.
* Multi-tenant enterprise SaaS billing modules.

---

## 4. User Stories & Functional Requirements

### 4.1 Authentication & Role-Based Access Control (RBAC)
* **US-1.1:** As a warehouse operator, I want to securely log in using my email and password so that all my inventory operations are attributed to me.
* **US-1.2:** As an inventory manager, I want role-based access control so that high-risk physical adjustments and facility settings are restricted to managerial staff.
* **US-1.3:** As an evaluator or judge, I want one-click demo credentials on the login screen to rapidly inspect Manager and Staff permissions.

### 4.2 Product Catalog & Facility Management
* **US-2.1:** As an inventory manager, I want to create and manage products with unique SKUs, categories, units of measure (kg, units, meters), and reorder thresholds.
* **US-2.2:** As a manager, I want to view aggregated real-time stock balances across all locations directly on the product list.
* **US-2.3:** As a manager, I want to configure Warehouses and functional sub-locations (e.g., Main Store, Production Floor, Scrap).

### 4.3 Inbound Receipts (Goods Receiving)
* **US-3.1:** As warehouse staff, I want to log incoming vendor shipments with purchase references, vendor details, and destination racks.
* **US-3.2:** As warehouse staff, I want a two-stage lifecycle (`Draft` ➔ `Done`) so shipments can be checked prior to physical stock incrementation.
* **US-3.3:** As warehouse staff, I want to generate a formal Goods Receiving Note (GRN) with sign-off boxes for carrier and receiving officer.

### 4.4 Internal Transfers (Relocation)
* **US-4.1:** As warehouse staff, I want to move stock from storage racks (Main Store) to the factory floor (Production) atomically.
* **US-4.2:** As an inventory manager, I want the system to reject same-location transfers and over-transfers before any record is mutated.

### 4.5 Outbound Deliveries (Fulfillment)
* **US-5.1:** As warehouse staff, I want to fulfill customer orders from designated source locations.
* **US-5.2:** As warehouse staff, I want the system to immediately reject dispatches if requested quantity exceeds physical availability at that location.
* **US-5.3:** As warehouse staff, I want to print an Outbound Delivery Slip for packing and dispatch verification.

### 4.6 Physical Adjustments & Count Reconciliation
* **US-6.1:** As an inventory manager, I want to reconcile physical shelf counts with system records and provide mandatory audit reasons (e.g., "Rain damage in aisle 3").
* **US-6.2:** As an auditor, I want the system to log the computed delta (+ or -) and operator ID directly to the ledger.

### 4.7 Stock Ledger & Export
* **US-7.1:** As an auditor, I want an immutable, chronological ledger displaying timestamp, SKU, movement type, previous stock, new stock, and operator.
* **US-7.2:** As an inventory manager, I want to export filtered ledger data and product catalogs to CSV with a single click.

---

## 5. Functional Requirements Matrix

| ID | Module | Feature Description | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Auth | JWT Authentication | P0 | Valid credentials issue signed JWT with 24h validity; invalid logins return 401. |
| **FR-02** | Catalog | SKU Uniqueness | P0 | Duplicate SKUs are rejected by database unique constraint (`23505`). |
| **FR-03** | Engine | Atomic Receipts | P0 | Validating a receipt increments `stocks.quantity` and writes `RECEIPT` ledger entry in 1 transaction. |
| **FR-04** | Engine | Atomic Deliveries | P0 | Delivery validation decrements `stocks.quantity`. Over-delivery throws `INSUFFICIENT_STOCK`. |
| **FR-05** | Engine | Atomic Transfers | P0 | Decrements source and increments destination simultaneously. Same-location transfers rejected. |
| **FR-06** | Engine | Count Adjustments | P0 | Sets `stocks.quantity` to counted count; logs delta and reason to `stock_ledger`. |
| **FR-07** | Engine | Idempotency | P0 | Validated orders cannot be re-validated (`ALREADY_VALIDATED` 400 error). |
| **FR-08** | Ledger | Append-Only Log | P0 | Every movement logs operator ID, timestamp, before/after balances. |
| **FR-09** | UI | Dashboard KPIs | P0 | Real-time counts for active SKUs, total stock, pending ops, and low-stock alerts. |
| **FR-10** | Usability| CSV Export | P1 | Export Ledger and Catalog to RFC 4180 CSV without external server dependencies. |
| **FR-11** | Usability| Print Documents | P1 | Clean, high-contrast Delivery Slips and Goods Receipt Notes via browser print window. |

---

## 6. Non-Functional Requirements (NFR)

* **Performance:** Standard API endpoints (Dashboard, Catalog, Operations) must respond in under 100ms under standard loads.
* **Concurrency & Safety:** The system must handle simultaneous concurrent deliveries against the same stock record without race conditions, utilizing pessimistic row locks.
* **Data Integrity:** Zero negative stock rows permitted in `stocks`. Zero orphaned records permitted in `stock_ledger`.
* **Browser Compatibility:** Frontend must run seamlessly on modern evergreen browsers (Chrome, Edge, Firefox, Safari) and render cleanly on mobile viewports.
* **Code Quality & Maintainability:** Zero code comments in production code, modular service architecture, and 100% passing automated test suites.

---

## 7. Success Criteria & Evaluation Metrics
1. **Automated Test Pass Rate:** 35 / 35 existing backend unit, integration, and concurrency tests passing (100%).
2. **Database Integrity Audit:** `npm run health` returns 100% operational with 0 negative rows and 0 orphaned rows.
3. **Frontend Build Stability:** `npm run build` generates optimized production chunks with zero build errors.
4. **Live Demonstration:** Flawless execution of the 3-minute hackathon live story: Receive ➔ Transfer ➔ Prevent Over-Delivery ➔ Deliver ➔ Adjust ➔ Ledger Audit.
