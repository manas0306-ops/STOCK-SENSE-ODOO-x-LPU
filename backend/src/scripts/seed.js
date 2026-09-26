const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Starting database seeding...');
    await client.query('BEGIN');

    // 1. Users
    const managerPassword = await bcrypt.hash('admin123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Alex Rivera (Manager)', 'manager@stocksense.com', $1, 'Inventory Manager'),
        ('Sam Patel (Staff)', 'staff@stocksense.com', $2, 'Warehouse Staff')
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
    `, [managerPassword, staffPassword]);

    // 2. Categories
    const categories = ['Raw Materials', 'Finished Goods', 'Electronics', 'Hardware'];
    for (const cat of categories) {
      await client.query(`
        INSERT INTO categories (name) VALUES ($1)
        ON CONFLICT (name) DO NOTHING;
      `, [cat]);
    }

    // 3. Warehouses
    await client.query(`
      INSERT INTO warehouses (name, active) VALUES 
        ('Main Warehouse', true),
        ('Secondary Warehouse', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Fetch warehouse IDs
    const whRes = await client.query('SELECT id, name FROM warehouses');
    const whMap = {};
    whRes.rows.forEach(r => whMap[r.name] = r.id);

    // 4. Locations
    const locations = [
      { warehouse: 'Main Warehouse', name: 'Main Store' },
      { warehouse: 'Main Warehouse', name: 'Production' },
      { warehouse: 'Main Warehouse', name: 'Quality Check' },
      { warehouse: 'Secondary Warehouse', name: 'Rack A' },
      { warehouse: 'Secondary Warehouse', name: 'Rack B' }
    ];

    for (const loc of locations) {
      const whId = whMap[loc.warehouse];
      if (whId) {
        await client.query(`
          INSERT INTO locations (warehouse_id, name, active)
          VALUES ($1, $2, true)
          ON CONFLICT (warehouse_id, name) DO NOTHING;
        `, [whId, loc.name]);
      }
    }

    // 5. Suppliers
    await client.query(`
      INSERT INTO suppliers (name, contact) VALUES 
        ('ABC Steel Suppliers', 'contact@abcsteel.com | +1-800-STEEL-01'),
        ('Apex Components Ltd', 'sales@apexcomp.com | +1-800-APEX-02'),
        ('Global Fasteners Inc', 'support@globalfasteners.com | +1-800-FAST-03')
      ON CONFLICT DO NOTHING;
    `);

    // 6. Customers
    await client.query(`
      INSERT INTO customers (name, contact) VALUES 
        ('XYZ Manufacturing', 'orders@xyzmfg.com | +1-888-XYZ-MFG'),
        ('Metro Builds Corp', 'procure@metrobuilds.com | +1-888-METRO-02'),
        ('Titan Heavy Industries', 'titan@industries.com | +1-888-TITAN-03')
      ON CONFLICT DO NOTHING;
    `);

    // Fetch Category IDs
    const catRes = await client.query('SELECT id, name FROM categories');
    const catMap = {};
    catRes.rows.forEach(r => catMap[r.name] = r.id);

    // 7. Products
    const products = [
      { name: 'Steel Sheets', sku: 'STL-001', category: 'Raw Materials', unit: 'kg', reorder_level: 25.00 },
      { name: 'Copper Rods', sku: 'CPR-002', category: 'Raw Materials', unit: 'kg', reorder_level: 15.00 },
      { name: 'Industrial Screws M8', sku: 'SCR-101', category: 'Hardware', unit: 'pcs', reorder_level: 500.00 },
      { name: 'Lithium Control Board', sku: 'PCB-505', category: 'Electronics', unit: 'pcs', reorder_level: 10.00 },
      { name: 'Aluminum Ingots', sku: 'ALU-303', category: 'Raw Materials', unit: 'kg', reorder_level: 50.00 },
      { name: 'Hydraulic Valve Pack', sku: 'HVP-702', category: 'Finished Goods', unit: 'units', reorder_level: 5.00 }
    ];

    for (const p of products) {
      await client.query(`
        INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (sku) DO UPDATE
        SET name = EXCLUDED.name,
            category_id = EXCLUDED.category_id,
            unit_of_measure = EXCLUDED.unit_of_measure,
            reorder_level = EXCLUDED.reorder_level;
      `, [p.name, p.sku, catMap[p.category], p.unit, p.reorder_level]);
    }

    // 8. Seed some initial inventory and ledger for a couple background products (Copper & Screws)
    // Keep Steel Sheets (STL-001) at 0 stock so the official Demo Story flow can be executed live:
    // (Receive 100 kg -> Stock 100, Transfer 20 kg -> 80/20, Deliver 20 kg -> 0, Adjust 3 kg -> 77 kg)
    const prodRes = await client.query('SELECT id, sku FROM products');
    const prodMap = {};
    prodRes.rows.forEach(r => prodMap[r.sku] = r.id);

    const locRes = await client.query('SELECT id, name FROM locations');
    const locMap = {};
    locRes.rows.forEach(r => locMap[r.name] = r.id);

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', ['manager@stocksense.com']);
    const managerId = userRes.rows[0]?.id;

    // Seed Copper Rods (10 kg in Main Store - triggers LOW STOCK because reorder is 15!)
    if (prodMap['CPR-002'] && locMap['Main Store']) {
      await client.query(`
        INSERT INTO stocks (product_id, location_id, quantity)
        VALUES ($1, $2, 10.00)
        ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = 10.00;
      `, [prodMap['CPR-002'], locMap['Main Store']]);

      await client.query(`
        INSERT INTO stock_ledger (product_id, operation_type, destination_location, quantity, user_id, previous_stock, new_stock, reference_type, reference_id)
        VALUES ($1, 'RECEIPT', $2, 10.00, $3, 0.00, 10.00, 'INITIAL_SEED', NULL);
      `, [prodMap['CPR-002'], locMap['Main Store'], managerId]);
    }

    // Seed Screws (1000 pcs in Rack A)
    if (prodMap['SCR-101'] && locMap['Rack A']) {
      await client.query(`
        INSERT INTO stocks (product_id, location_id, quantity)
        VALUES ($1, $2, 1000.00)
        ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = 1000.00;
      `, [prodMap['SCR-101'], locMap['Rack A']]);

      await client.query(`
        INSERT INTO stock_ledger (product_id, operation_type, destination_location, quantity, user_id, previous_stock, new_stock, reference_type, reference_id)
        VALUES ($1, 'RECEIPT', $2, 1000.00, $3, 0.00, 1000.00, 'INITIAL_SEED', NULL);
      `, [prodMap['SCR-101'], locMap['Rack A'], managerId]);
    }

    // Seed Hydraulic Valve Pack (0 units - triggers OUT OF STOCK!)
    // Leave stocks empty for HVP-702, which naturally has 0 stock!

    await client.query('COMMIT');
    console.log('[Seed] Database seeded successfully with demo data!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
