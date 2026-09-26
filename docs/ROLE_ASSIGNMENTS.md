# StockSense — Team Role Assignments & File Ownership Breakdown

This document outlines the file breakdown, ownership boundaries, and dependency contracts for each team member in the **Odoo x LPU Jalandhar Hackathon 2026**.

---

## 👥 Overview Matrix

| Person | Team Role | Primary Ownership | Depends On | Key Output Files |
| :--- | :--- | :--- | :--- | :--- |
| **You (Leader)** | **Inventory Engine + Backend Core** | Database Schema, Auth API, Centralized Inventory Engine, Operations APIs (Receipts, Deliveries, Transfers, Adjustments, Ledger), Backend Test Suite | *None* (Foundational layer) | `database/migrations/*`<br>`backend/src/services/inventoryEngine.js`<br>`backend/src/controllers/*`<br>`backend/src/routes/*`<br>`backend/test/*` |
| **Member B** | **Frontend Shell + Dashboard** | App Layout Shell, Authentication UI, Live Dashboard KPIs, Low-Stock Alert Banner, Analytical Distributions | Leader's Auth + Dashboard APIs | `frontend/src/layouts/AppLayout.jsx`<br>`frontend/src/components/Sidebar.jsx`<br>`frontend/src/components/Navbar.jsx`<br>`frontend/src/pages/Login.jsx`<br>`frontend/src/pages/Register.jsx`<br>`frontend/src/pages/Dashboard.jsx` |
| **Member C** | **Operations UI** | Product Management UI, Receipt Workflow UI, Delivery Workflow UI, Internal Transfers UI, Adjustments Reconciliation UI, Stock Ledger UI | Leader's Products & Operations APIs | `frontend/src/pages/Products.jsx`<br>`frontend/src/pages/Receipts.jsx`<br>`frontend/src/pages/Deliveries.jsx`<br>`frontend/src/pages/Transfers.jsx`<br>`frontend/src/pages/Adjustments.jsx`<br>`frontend/src/pages/StockLedger.jsx` |
| **Member D** | **Settings, Data & Docs** | Multi-Warehouse & Location Setup UI, Categories & Partners UI, Database Seed Script, Official Documentation & Demo Rehearsal Scripts | Leader's Warehouse/Location APIs | `frontend/src/pages/Settings.jsx`<br>`database/seed/seed.sql`<br>`backend/src/scripts/seed.js`<br>`docs/*`<br>`README.md` |

---

## 🛠️ Detailed File Breakdown By Person

### 1. Person A: You (Leader) — Inventory Engine & Backend Core
**Mission:** Ensure 100% correct inventory math, zero-negative-stock enforcement, pessimistic locking, atomic transactions, and reliable REST endpoints.

* **Database Engine & Schema:**
  - `database/migrations/001_initial_schema.sql` — PostgreSQL 18 table definitions, constraints, check validations, indexes.
  - `backend/src/config/db.js` — Connection pool (`pg.Pool`) with transactional client checkout.
* **Central Inventory Engine:**
  - `backend/src/services/inventoryEngine.js` — Core methods: `increaseStock()`, `decreaseStock()`, `transferStock()`, `setStock()`, `getStockByLocation()`, `getAvailableStock()`, `getLowStockProducts()`.
* **API Controllers & Business Logic:**
  - `backend/src/controllers/authController.js` — Password hashing (bcrypt) and JWT signing.
  - `backend/src/controllers/productController.js` — Product catalog management and stock rollups.
  - `backend/src/controllers/receiptController.js` — Inbound stock validation and draft management.
  - `backend/src/controllers/deliveryController.js` — Outbound fulfillment with over-delivery blocking.
  - `backend/src/controllers/transferController.js` — Atomic intra/inter-warehouse relocations.
  - `backend/src/controllers/adjustmentController.js` — Count reconciliation and variance audit logs.
  - `backend/src/controllers/ledgerController.js` — Filterable audit trail queries.
  - `backend/src/controllers/dashboardController.js` — Real-time KPI aggregation.
* **Routes & Middleware:**
  - `backend/src/routes/*.js` — REST endpoint routes.
  - `backend/src/middleware/auth.js` — JWT validation and role-based access control.
  - `backend/src/middleware/errorHandler.js` — Centralized error interceptor and SQL constraint translator.
* **Server & Test Suites:**
  - `backend/src/server.js` — Express bootstrap and route mounting.
  - `backend/test/inventory.test.js` — Atomic transaction and edge case unit tests.
  - `backend/test/api.test.js` — End-to-end HTTP integration test suite.

---

### 2. Person B: Member B — Frontend Shell + Dashboard
**Mission:** Build the SaaS-style responsive layout, authentication workflow, and real-time dashboard visualization.

* **Frontend Shell:**
  - `frontend/src/App.jsx` — Route configurations and navigation guards.
  - `frontend/src/layouts/AppLayout.jsx` — Standard authenticated application wrapper.
  - `frontend/src/components/Sidebar.jsx` — Dark-themed navigation sidebar with operation badges.
  - `frontend/src/components/Navbar.jsx` — Live database connection indicator, user profile, role badge, and logout.
* **Authentication Screens:**
  - `frontend/src/context/AuthContext.jsx` — Global user state and persistent token management.
  - `frontend/src/pages/Login.jsx` — Sign in page with one-click Judge Demo fast-fill credentials.
  - `frontend/src/pages/Register.jsx` — Account registration with role selection.
* **Dashboard Page:**
  - `frontend/src/pages/Dashboard.jsx` — 6 real-time KPI cards (Total Products, Low Stock, Out of Stock, Pending Receipts, Pending Deliveries, Transfers), active low-stock replenishment alert banner, and recent ledger feed.
  - `frontend/src/services/dashboardService.js` — API integration for dashboard metrics.

---

### 3. Person C: Member C — Operations UI
**Mission:** Provide clean, intuitive forms and tables for daily warehouse operations with zero client-side stock duplication.

* **Catalog Management:**
  - `frontend/src/pages/Products.jsx` — Product catalog with search, category filtering, low-stock toggle, and multi-warehouse location breakdown modal.
* **Inbound & Outbound Operations:**
  - `frontend/src/pages/Receipts.jsx` — Incoming goods receipts workflow (Create Draft, Mark Ready, Validate stock increment).
  - `frontend/src/pages/Deliveries.jsx` — Outbound customer orders with location stock availability checks and over-delivery warnings.
* **Relocations & Reconciliation:**
  - `frontend/src/pages/Transfers.jsx` — Internal transfer workflow with automatic validation preventing identical source/destination.
  - `frontend/src/pages/Adjustments.jsx` — Physical count discrepancy reconciliation with live delta calculation and mandatory audit reason.
* **Audit Trail:**
  - `frontend/src/pages/StockLedger.jsx` — Full-featured historical audit trail with product and operation type filters.
* **Shared UI Helpers:**
  - `frontend/src/components/Modal.jsx` — Accessible modal dialog wrapper.
  - `frontend/src/components/StatusBadge.jsx` — Operation-specific and document status badges.

---

### 4. Person D: Member D — Settings, Data & Docs
**Mission:** Manage physical facilities, seed datasets, and hackathon presentation documentation.

* **Configuration & Facilities UI:**
  - `frontend/src/pages/Settings.jsx` — Multi-tab configuration interface:
    - Warehouses (Create & list physical warehouses).
    - Sub-Locations (Create & list racks/aisles/stores linked to parent warehouses).
    - Product Categories.
    - Suppliers and Customers directory.
* **Seed & Database Scripts:**
  - `database/seed/seed.sql` — Raw SQL demo dataset.
  - `backend/src/scripts/seed.js` — Node.js seed runner with bcrypt hashed accounts.
  - `backend/src/scripts/migrate.js` — Database migration runner.
* **Documentation & Submission Assets:**
  - `README.md` — Comprehensive project overview, architecture diagrams, installation guide, and test steps.
  - `docs/API_CONTRACTS.md` — Complete REST API specifications.
  - `docs/ARCHITECTURE.md` — Technical design and database constraints.
  - `docs/DEMO_SCRIPT.md` — Step-by-step judge live walkthrough guide.
