# StockSense — REST API Contracts & Specification

All API endpoints follow standard REST conventions. Protected endpoints require the header:
```http
Authorization: Bearer <JWT_TOKEN>
```

All responses return standard JSON:
```json
{
  "success": true,
  "message": "Human readable status",
  "data": { ... }
}
```
In case of error:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
* **Access:** Public
* **Body:**
  ```json
  {
    "name": "Alex Rivera",
    "email": "manager@stocksense.com",
    "password": "securepassword",
    "role": "Inventory Manager" // or "Warehouse Staff"
  }
  ```
* **Response (201):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": 1, "name": "Alex Rivera", "email": "manager@stocksense.com", "role": "Inventory Manager" },
      "token": "eyJhbG..."
    }
  }
  ```

### `POST /api/auth/login`
* **Access:** Public
* **Body:**
  ```json
  {
    "email": "manager@stocksense.com",
    "password": "admin123"
  }
  ```
* **Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": 1, "name": "Alex Rivera", "email": "manager@stocksense.com", "role": "Inventory Manager" },
      "token": "eyJhbG..."
    }
  }
  ```

### `GET /api/auth/me`
* **Access:** Protected
* **Response (200):** Returns current user session object.

---

## 2. Products (`/api/products`)

### `GET /api/products`
* **Access:** Protected
* **Query Parameters:**
  - `search`: string (matches Name or SKU)
  - `categoryId`: integer
  - `lowStock`: boolean ('true' returns items with stock <= reorder_level)
* **Response (200):** Array of products with dynamic aggregate `current_stock`.

### `POST /api/products`
* **Access:** Protected
* **Body:**
  ```json
  {
    "name": "Steel Sheets Grade A",
    "sku": "STL-001",
    "category_id": 1,
    "unit_of_measure": "kg",
    "reorder_level": 25.0
  }
  ```
* **Response (201):** Created product record.

### `GET /api/products/:id`
* **Access:** Protected
* **Response (200):** Product metadata + `total_stock` + `stock_by_location` (array of locations with quantities).

---

## 3. Operations

### Receipts (`/api/receipts`)
* **`GET /api/receipts?status=draft|ready|done`** — List receipts.
* **`POST /api/receipts`** — Create draft receipt:
  ```json
  {
    "supplier_id": 1,
    "destination_location_id": 1,
    "items": [{ "product_id": 1, "quantity": 100 }],
    "status": "draft"
  }
  ```
* **`POST /api/receipts/:id/ready`** — Transition status to `ready`.
* **`POST /api/receipts/:id/validate`** — Execute stock increase atomically. Increases stock and writes to `stock_ledger`. Idempotent (cannot validate twice).

### Deliveries (`/api/deliveries`)
* **`GET /api/deliveries?status=draft|ready|done`** — List deliveries.
* **`POST /api/deliveries`** — Create delivery draft:
  ```json
  {
    "customer_id": 1,
    "source_location_id": 2,
    "items": [{ "product_id": 1, "quantity": 20 }]
  }
  ```
* **`POST /api/deliveries/:id/validate`** — Validates available stock. Rejects with `INSUFFICIENT_STOCK` (400) if requested > available. On success, deducts stock and logs ledger event.

### Internal Transfers (`/api/transfers`)
* **`GET /api/transfers`** — List transfers.
* **`POST /api/transfers`** — Create transfer draft:
  ```json
  {
    "source_location_id": 1,
    "destination_location_id": 2,
    "items": [{ "product_id": 1, "quantity": 20 }]
  }
  ```
  *(Source and Destination cannot be the same).*
* **`POST /api/transfers/:id/validate`** — Atomically moves stock from source to destination. Generates `TRANSFER_OUT` and `TRANSFER_IN` ledger records.

### Adjustments (`/api/adjustments`)
* **`GET /api/adjustments`** — List adjustments history.
* **`POST /api/adjustments`** — Reconcile physical count:
  ```json
  {
    "product_id": 1,
    "location_id": 1,
    "counted_quantity": 77.0,
    "reason": "3 kg damaged in storage during heavy rainfall",
    "auto_validate": true
  }
  ```
  *Calculates variance `delta = counted_quantity - system_quantity`, updates stock, logs `ADJUSTMENT` in ledger.*

---

## 4. Stock Ledger (`/api/ledger`)

### `GET /api/ledger`
* **Access:** Protected
* **Query Parameters:** `productId`, `operationType`, `locationId`, `userId`, `startDate`, `endDate`, `limit`, `offset`.
* **Response (200):** Immutable audit log sorted by timestamp DESC.

---

## 5. Dashboard (`/api/dashboard`)

### `GET /api/dashboard`
* **Access:** Protected
* **Response (200):**
  ```json
  {
    "kpis": {
      "totalProducts": 6,
      "lowStockCount": 2,
      "outOfStockCount": 1,
      "pendingReceipts": 0,
      "pendingDeliveries": 0,
      "internalTransfers": 1,
      "pendingTransfers": 0
    },
    "lowStockProducts": [ ... ],
    "recentActivity": [ ... ],
    "stockByCategory": [ ... ],
    "stockByWarehouse": [ ... ]
  }
  ```
