-- StockSense Database Schema
-- Initial Migration: 001_initial_schema.sql

-- Drop existing tables if needed (in reverse dependency order)
DROP TABLE IF EXISTS stock_ledger CASCADE;
DROP TABLE IF EXISTS adjustments CASCADE;
DROP TABLE IF EXISTS transfer_items CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS delivery_items CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS receipt_items CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Inventory Manager', 'Warehouse Staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouses Table
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Locations Table (Belongs to Warehouse)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_location_name UNIQUE (warehouse_id, name)
);

-- 5. Suppliers Table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Customers Table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Stocks Table (Single source of truth for current stock per location)
CREATE TABLE stocks (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, location_id)
);

-- 9. Receipts Table (Incoming goods from supplier)
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    destination_location_id INTEGER NOT NULL REFERENCES locations(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'canceled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Receipt Items Table
CREATE TABLE receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- 11. Deliveries Table (Outgoing goods to customer)
CREATE TABLE deliveries (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    source_location_id INTEGER NOT NULL REFERENCES locations(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'canceled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Delivery Items Table
CREATE TABLE delivery_items (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- 13. Transfers Table (Internal movement between locations)
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    source_location_id INTEGER NOT NULL REFERENCES locations(id),
    destination_location_id INTEGER NOT NULL REFERENCES locations(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'canceled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_transfer_locations_different CHECK (source_location_id != destination_location_id)
);

-- 14. Transfer Items Table
CREATE TABLE transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

-- 15. Adjustments Table (Physical inventory reconciliation)
CREATE TABLE adjustments (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    system_quantity NUMERIC(12, 2) NOT NULL CHECK (system_quantity >= 0),
    counted_quantity NUMERIC(12, 2) NOT NULL CHECK (counted_quantity >= 0),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'done' CHECK (status IN ('draft', 'done', 'canceled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Stock Ledger Table (Immutable audit trail of all stock movements)
CREATE TABLE stock_ledger (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER NOT NULL REFERENCES products(id),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('RECEIPT', 'DELIVERY', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT')),
    source_location INTEGER REFERENCES locations(id),
    destination_location INTEGER REFERENCES locations(id),
    quantity NUMERIC(12, 2) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id INTEGER
);

-- Indexes for performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_stocks_product ON stocks(product_id);
CREATE INDEX idx_stocks_location ON stocks(location_id);
CREATE INDEX idx_ledger_product ON stock_ledger(product_id);
CREATE INDEX idx_ledger_timestamp ON stock_ledger(timestamp DESC);
CREATE INDEX idx_ledger_operation ON stock_ledger(operation_type);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_adjustments_status ON adjustments(status);
