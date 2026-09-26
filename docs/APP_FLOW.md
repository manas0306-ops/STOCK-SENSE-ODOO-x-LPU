# StockSense — Application Flow & State Machines (APP FLOW)

**Project Name:** StockSense  
**Hackathon:** Odoo x LPU Jalandhar Hackathon 2026  
**Document Version:** 1.0.0  
**Target Release:** Production / Hackathon Final Submission  
**Repository:** [STOCK-SENSE-ODOO-x-LPU](https://github.com/manas0306-ops/STOCK-SENSE-ODOO-x-LPU)  

---

## 1. High-Level User Journey

The StockSense user journey guides warehouse operators and managers through authenticated, transactional workflows:

```mermaid
flowchart TD
    Start([User Opens Application]) --> AuthCheck{Authenticated?}
    AuthCheck -- No --> Login[Login / Register Screen]
    Login --> SubmitAuth[Submit Credentials]
    SubmitAuth -- Valid JWT --> Dash[Dashboard Overview]
    AuthCheck -- Yes --> Dash

    Dash --> Ops{Select Operation}
    Ops --> Products[Catalog & Stock View]
    Ops --> Receipts[Inbound Receipts]
    Ops --> Deliveries[Outbound Deliveries]
    Ops --> Transfers[Internal Transfers]
    Ops --> Adjustments[Physical Adjustments]
    Ops --> Ledger[Stock Ledger & Export]
    Ops --> Settings[Facilities & Partners]

    Receipts --> ValidateRec[Validate & Increase Stock]
    Deliveries --> ValidateDel[Validate & Dispatch Stock]
    Transfers --> ValidateTrans[Execute Atomic Transfer]
    Adjustments --> ApplyAdj[Reconcile Physical Count]

    ValidateRec --> LedgerUpdate[(Append Ledger Record)]
    ValidateDel --> LedgerUpdate
    ValidateTrans --> LedgerUpdate
    ApplyAdj --> LedgerUpdate
    LedgerUpdate --> Dash
```

---

## 2. Document Lifecycle State Machine

All primary operational documents (Receipts, Deliveries, and Transfers) share a rigorous three-state lifecycle with strict idempotency guards:

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Document
    Draft --> Ready : Mark Ready for Processing
    Ready --> Draft : Reset / Re-edit Items

    state Ready {
        [*] --> AwaitingValidation
        AwaitingValidation --> ValidateAction : Operator Clicks Validate
    }

    ValidateAction --> Done : ACID Transaction Committed
    
    state Done {
        [*] --> ImmutableState
        ImmutableState --> AttemptRevalidate : Duplicate Validation Call
        AttemptRevalidate --> Rejected : Error ALREADY_VALIDATED
    }

    Done --> [*]
```

### Lifecycle Invariants:
1. **Draft:** Line items can be added, updated, or removed. No stock quantities or ledger records are modified.
2. **Ready:** Document is verified and staged for fulfillment.
3. **Done (Finalized):**
   * Inventory balances in `stocks` updated.
   * Event logged in `stock_ledger`.
   * Validation timestamp and operator recorded.
   * **Idempotency Guarantee:** Attempting to validate a document in `done` status returns HTTP 400 (`ALREADY_VALIDATED`).

---

## 3. Detailed Operational Workflows

### 3.1 Inbound Receiving Flow (Receipts)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Warehouse Staff
    participant UI as React Frontend
    participant API as Express Server
    participant Engine as Inventory Engine
    participant DB as PostgreSQL 18

    Staff->>UI: Create Receipt (Supplier, Destination Rack, Line Items)
    UI->>API: POST /api/receipts
    API->>DB: INSERT INTO receipts & receipt_items (status = 'draft')
    DB-->>UI: Receipt Draft Created

    Staff->>UI: Inspect & Click "Validate & Increase Stock"
    UI->>API: POST /api/receipts/:id/validate
    API->>DB: BEGIN Transaction
    API->>Engine: increaseStock(productId, locationId, quantity)
    Engine->>DB: SELECT quantity FROM stocks FOR UPDATE
    Engine->>DB: UPDATE stocks SET quantity = quantity + delta
    Engine->>DB: INSERT INTO stock_ledger (RECEIPT, delta)
    API->>DB: UPDATE receipts SET status = 'done', validated_at = NOW()
    API->>DB: COMMIT Transaction
    DB-->>UI: Receipt Validated (+Stock Applied)
    Staff->>UI: Click "Print Receipt Note" (Opens GRN Slip)
```

---

### 3.2 Outbound Delivery Flow (Fulfillment & Over-Stock Prevention)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Warehouse Staff
    participant UI as React Frontend
    participant API as Express Server
    participant Engine as Inventory Engine
    participant DB as PostgreSQL 18

    Staff->>UI: Create Delivery Order (Customer, Source Rack, Requested Qty)
    UI->>API: POST /api/deliveries
    API->>DB: INSERT INTO deliveries & delivery_items (status = 'draft')
    DB-->>UI: Delivery Draft Created

    Staff->>UI: Click "Validate & Dispatch"
    UI->>API: POST /api/deliveries/:id/validate
    API->>DB: BEGIN Transaction
    API->>Engine: decreaseStock(productId, locationId, quantity)
    Engine->>DB: SELECT quantity FROM stocks FOR UPDATE
    
    alt Available Stock < Requested Quantity
        Engine-->>API: Throw InsufficientStockError
        API->>DB: ROLLBACK Transaction
        API-->>UI: HTTP 400 (INSUFFICIENT_STOCK: Available: X, Requested: Y)
        UI-->>Staff: Display Error Banner (Delivery Rejected)
    else Available Stock >= Requested Quantity
        Engine->>DB: UPDATE stocks SET quantity = quantity - delta
        Engine->>DB: INSERT INTO stock_ledger (DELIVERY, -delta)
        API->>DB: UPDATE deliveries SET status = 'done', validated_at = NOW()
        API->>DB: COMMIT Transaction
        DB-->>UI: Delivery Dispatched (Stock Decremented)
        Staff->>UI: Click "Print Delivery Slip" (Opens Shipping Slip)
    end
```

---

### 3.3 Internal Relocation Flow (Transfers)

```mermaid
flowchart TD
    StartTransfer([Operator Creates Transfer]) --> InputLocs[Select Source & Destination Locations]
    InputLocs --> CheckSameLoc{Source == Destination?}
    CheckSameLoc -- Yes --> ErrorSameLoc[Reject: Same-Location Transfer Forbidden]
    CheckSameLoc -- No --> SubmitTransfer[Submit Transfer Items]
    
    SubmitTransfer --> OpenTx[Start DB Transaction]
    OpenTx --> LockRows[Lock Both Location Rows FOR UPDATE]
    LockRows --> CheckAvail{Source Stock >= Transfer Qty?}
    
    CheckAvail -- No --> AbortTx[Rollback & Return INSUFFICIENT_STOCK]
    CheckAvail -- Yes --> MutateStock[Decrement Source & Increment Destination]
    MutateStock --> WriteLedger[Write TRANSFER_OUT & TRANSFER_IN to Ledger]
    WriteLedger --> FinalizeTx[Commit Transaction & Mark Done]
    FinalizeTx --> CompleteTransfer([Atomic Relocation Complete])
```

---

### 3.4 Physical Count Adjustment Flow

```mermaid
flowchart TD
    StartAdj([Physical Stocktaking Audited]) --> SelectLoc[Select Product & Location]
    SelectLoc --> EnterCount[Enter Physical Counted Quantity & Reason]
    EnterCount --> CallAdjApi[POST /api/adjustments]
    CallAdjApi --> OpenTx[Start DB Transaction]
    OpenTx --> LockStock[Lock Stock Row FOR UPDATE]
    LockStock --> CalcDelta[Compute delta = Counted - Current]
    CalcDelta --> SetStock[Update stocks.quantity = Counted]
    SetStock --> RecordLedger[Write ADJUSTMENT to Ledger with Delta & Reason]
    RecordLedger --> CommitTx[Commit Transaction]
    CommitTx --> UpdatedUI([UI Refreshed with Reconciled Stock])
```

---

## 4. Frontend Route Navigation Architecture

```
/ (Redirects to /dashboard or /login)
│
├── /login          [PublicRoute] Fast-fill Judge Demo Credentials
├── /register       [PublicRoute] User registration
│
└── AppLayout       [ProtectedRoute] Requires valid JWT token
    ├── /dashboard    Live KPI cards, low-stock banner, pending operations
    ├── /products     Product catalog, multi-location stock, CSV export
    ├── /receipts     Inbound vendor shipments, GRN generation & print
    ├── /deliveries   Outbound customer shipments, delivery slip & print
    ├── /transfers    Internal atomic stock movements between racks
    ├── /adjustments  Physical count reconciliation & variance auditing
    ├── /ledger       Immutable audit log, multi-filter queries, CSV export
    └── /settings     Warehouse definitions, location hierarchy, partners
```
