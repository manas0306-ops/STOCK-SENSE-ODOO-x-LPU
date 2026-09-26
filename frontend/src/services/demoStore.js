const STORAGE_KEY = 'stocksense_demo_db_v1';

const defaultSeed = {
  products: [
    {
      id: 1,
      name: 'Steel Sheets (Cold Rolled)',
      sku: 'STL-001',
      category_id: 1,
      category_name: 'Raw Materials',
      unit_of_measure: 'kg',
      reorder_level: 25.0,
      description: 'Standard 2mm cold-rolled industrial steel sheets for fabrication',
      locations: [
        { location_id: 1, location_name: 'Main Store', warehouse_name: 'Main Warehouse', quantity: 0 }
      ]
    },
    {
      id: 2,
      name: 'Copper Rods 10mm',
      sku: 'CPR-002',
      category_id: 1,
      category_name: 'Raw Materials',
      unit_of_measure: 'kg',
      reorder_level: 15.0,
      description: 'High conductivity copper rods for electrical busbars',
      locations: [
        { location_id: 1, location_name: 'Main Store', warehouse_name: 'Main Warehouse', quantity: 10 }
      ]
    },
    {
      id: 3,
      name: 'M8 Hex Bolts Grade 8.8',
      sku: 'BLT-003',
      category_id: 4,
      category_name: 'Hardware',
      unit_of_measure: 'units',
      reorder_level: 200.0,
      description: 'Zinc-plated high tensile metric steel bolts',
      locations: [
        { location_id: 4, location_name: 'Secondary Storage', warehouse_name: 'Secondary Warehouse', quantity: 1000 }
      ]
    },
    {
      id: 4,
      name: 'Electric Relay 24V DC',
      sku: 'ELC-004',
      category_id: 3,
      category_name: 'Electronics',
      unit_of_measure: 'units',
      reorder_level: 30.0,
      description: 'DPDT PCB mount electromechanical miniature relays',
      locations: []
    },
    {
      id: 5,
      name: 'Aluminum Extrusion 4040',
      sku: 'ALU-005',
      category_id: 1,
      category_name: 'Raw Materials',
      unit_of_measure: 'm',
      reorder_level: 20.0,
      description: 'T-slot modular aluminum structural profile for workbenches',
      locations: []
    },
    {
      id: 6,
      name: 'Industrial Controller Box',
      sku: 'FNG-006',
      category_id: 2,
      category_name: 'Finished Goods',
      unit_of_measure: 'units',
      reorder_level: 5.0,
      description: 'Fully assembled automated PLC distribution panel',
      locations: []
    }
  ],
  warehouses: [
    { id: 1, name: 'Main Warehouse', active: true },
    { id: 2, name: 'Secondary Warehouse', active: true }
  ],
  locations: [
    { id: 1, name: 'Main Store', warehouse_id: 1, warehouse_name: 'Main Warehouse', type: 'internal' },
    { id: 2, name: 'Production', warehouse_id: 1, warehouse_name: 'Main Warehouse', type: 'internal' },
    { id: 3, name: 'Quality Inspection', warehouse_id: 1, warehouse_name: 'Main Warehouse', type: 'internal' },
    { id: 4, name: 'Secondary Storage', warehouse_id: 2, warehouse_name: 'Secondary Warehouse', type: 'internal' },
    { id: 5, name: 'Scrap Location', warehouse_id: 1, warehouse_name: 'Main Warehouse', type: 'scrap' }
  ],
  categories: [
    { id: 1, name: 'Raw Materials' },
    { id: 2, name: 'Finished Goods' },
    { id: 3, name: 'Electronics' },
    { id: 4, name: 'Hardware' }
  ],
  suppliers: [
    { id: 1, name: 'ABC Steel Suppliers', contact: 'contact@abcsteel.com | +1-800-STEEL-01' },
    { id: 2, name: 'Apex Components Ltd', contact: 'sales@apexcomp.com | +1-800-APEX-02' },
    { id: 3, name: 'Global Fasteners Inc', contact: 'support@globalfasteners.com | +1-800-FAST-03' }
  ],
  customers: [
    { id: 1, name: 'XYZ Manufacturing', contact: 'orders@xyzmfg.com | +1-888-XYZ-MFG1' },
    { id: 2, name: 'Prime Construction Co', contact: 'procure@primeconst.com | +1-888-PRIME-02' },
    { id: 3, name: 'Metro Tech Solutions', contact: 'hardware@metrotech.com | +1-888-METRO-03' }
  ],
  receipts: [],
  deliveries: [],
  transfers: [],
  adjustments: [],
  ledger: [
    {
      id: 1,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      product_id: 2,
      product_name: 'Copper Rods 10mm',
      sku: 'CPR-002',
      unit_of_measure: 'kg',
      operation_type: 'RECEIPT',
      source_location: null,
      source_location_name: null,
      destination_location: 1,
      destination_location_name: 'Main Store',
      quantity: 10,
      previous_stock: 0,
      new_stock: 10,
      user_id: 1,
      user_name: 'Alex Rivera (Manager)'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      product_id: 3,
      product_name: 'M8 Hex Bolts Grade 8.8',
      sku: 'BLT-003',
      unit_of_measure: 'units',
      operation_type: 'RECEIPT',
      source_location: null,
      source_location_name: null,
      destination_location: 4,
      destination_location_name: 'Secondary Storage',
      quantity: 1000,
      previous_stock: 0,
      new_stock: 1000,
      user_id: 1,
      user_name: 'Alex Rivera (Manager)'
    }
  ]
};

function getDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
  }
  saveDb(defaultSeed);
  return JSON.parse(JSON.stringify(defaultSeed));
}

function saveDb(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
  }
}

export function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(`http://dummy${endpoint}`);
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      body = {};
    }
  }

  const db = getDb();

  if (pathname === '/auth/login' && method === 'POST') {
    const email = body.email || 'manager@stocksense.com';
    const isStaff = email.includes('staff');
    const user = {
      id: isStaff ? 2 : 1,
      name: isStaff ? 'Sam Patel (Staff)' : 'Alex Rivera (Manager)',
      email: email,
      role: isStaff ? 'Warehouse Staff' : 'Inventory Manager'
    };
    return {
      success: true,
      data: {
        token: 'stocksense-demo-token-active-session',
        user
      },
      message: 'Login successful'
    };
  }

  if (pathname === '/auth/register' && method === 'POST') {
    const user = {
      id: Date.now(),
      name: body.name || 'New User',
      email: body.email,
      role: body.role || 'Warehouse Staff'
    };
    return {
      success: true,
      data: {
        token: 'stocksense-demo-token-active-session',
        user
      },
      message: 'Account registered successfully'
    };
  }

  if (pathname === '/auth/me') {
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem('stocksense_user'));
    } catch (e) {
    }
    return {
      success: true,
      data: savedUser || {
        id: 1,
        name: 'Alex Rivera (Manager)',
        email: 'manager@stocksense.com',
        role: 'Inventory Manager'
      }
    };
  }

  if (pathname === '/dashboard') {
    const totalProducts = db.products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProducts = [];

    db.products.forEach(p => {
      const current = (p.locations || []).reduce((acc, loc) => acc + (parseFloat(loc.quantity) || 0), 0);
      p.current_stock = current;
      if (current === 0) {
        outOfStockCount++;
      }
      if (current <= p.reorder_level) {
        lowStockCount++;
        lowStockProducts.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          current_stock: current,
          reorder_level: p.reorder_level,
          unit_of_measure: p.unit_of_measure,
          category_name: p.category_name,
          deficit: Math.max(0, p.reorder_level - current)
        });
      }
    });

    return {
      success: true,
      data: {
        kpis: {
          totalProducts,
          lowStockCount,
          outOfStockCount,
          pendingReceipts: db.receipts.filter(r => r.status !== 'done').length,
          pendingDeliveries: db.deliveries.filter(d => d.status !== 'done').length,
          transfersScheduled: db.transfers.filter(t => t.status !== 'done').length,
          internalTransfers: db.transfers.length
        },
        lowStockProducts,
        recentActivity: db.ledger.slice(0, 10).map(l => ({
          id: l.id,
          operation_type: l.operation_type,
          product_name: l.product_name,
          quantity_change: l.quantity,
          location_name: l.destination_location_name || l.source_location_name || 'Warehouse',
          created_at: l.timestamp,
          reference_type: l.operation_type
        })),
        stockByCategory: [
          { category: 'Raw Materials', total_units: 10, product_count: 3 },
          { category: 'Hardware', total_units: 1000, product_count: 1 }
        ],
        stockByWarehouse: [
          { warehouse_name: 'Main Warehouse', total_units: 10 },
          { warehouse_name: 'Secondary Warehouse', total_units: 1000 }
        ]
      }
    };
  }

  if (pathname === '/products') {
    if (method === 'GET') {
      const search = (searchParams.get('search') || '').toLowerCase();
      const list = db.products.map(p => {
        const total = (p.locations || []).reduce((acc, loc) => acc + (parseFloat(loc.quantity) || 0), 0);
        return {
          ...p,
          current_stock: total
        };
      }).filter(p => {
        if (!search) return true;
        return p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
      });
      return { success: true, data: list };
    }

    if (method === 'POST') {
      const newProd = {
        id: Date.now(),
        name: body.name,
        sku: body.sku,
        category_id: body.category_id,
        category_name: db.categories.find(c => c.id === body.category_id)?.name || 'General',
        unit_of_measure: body.unit_of_measure || 'units',
        reorder_level: parseFloat(body.reorder_level || 0),
        description: body.description || '',
        locations: []
      };
      db.products.push(newProd);
      saveDb(db);
      return { success: true, data: newProd, message: 'Product created successfully' };
    }
  }

  const prodDetailMatch = pathname.match(/^\/products\/(\d+)$/);
  if (prodDetailMatch) {
    const id = parseInt(prodDetailMatch[1], 10);
    const prod = db.products.find(p => p.id === id);
    if (!prod) {
      const err = new Error('Product not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    const current_stock = (prod.locations || []).reduce((acc, loc) => acc + (parseFloat(loc.quantity) || 0), 0);
    return {
      success: true,
      data: {
        ...prod,
        current_stock
      }
    };
  }

  if (pathname === '/receipts') {
    if (method === 'GET') {
      return { success: true, data: db.receipts };
    }
    if (method === 'POST') {
      const destLoc = db.locations.find(l => l.id === parseInt(body.destination_location_id, 10));
      const supp = db.suppliers.find(s => s.id === parseInt(body.supplier_id, 10));
      const items = (body.items || []).map(itm => {
        const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
        return {
          id: Date.now() + Math.random(),
          product_id: itm.product_id,
          product_name: prod ? prod.name : 'Item',
          sku: prod ? prod.sku : 'SKU',
          unit_of_measure: prod ? prod.unit_of_measure : 'units',
          quantity: parseFloat(itm.quantity || 0)
        };
      });

      const newRec = {
        id: Date.now(),
        reference_no: `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        supplier_id: body.supplier_id,
        supplier_name: supp ? supp.name : 'General Supplier',
        destination_location_id: body.destination_location_id,
        destination_location_name: destLoc ? destLoc.name : 'Main Store',
        warehouse_name: destLoc ? destLoc.warehouse_name : 'Main Warehouse',
        status: 'draft',
        created_at: new Date().toISOString(),
        created_by_name: 'Alex Rivera (Manager)',
        notes: body.notes || '',
        items
      };
      db.receipts.unshift(newRec);
      saveDb(db);
      return { success: true, data: newRec, message: 'Receipt created successfully' };
    }
  }

  const recDetailMatch = pathname.match(/^\/receipts\/(\d+)$/);
  if (recDetailMatch) {
    const id = parseInt(recDetailMatch[1], 10);
    const rec = db.receipts.find(r => r.id === id);
    if (!rec) {
      const err = new Error('Receipt not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return { success: true, data: rec };
  }

  const recReadyMatch = pathname.match(/^\/receipts\/(\d+)\/ready$/);
  if (recReadyMatch && method === 'POST') {
    const id = parseInt(recReadyMatch[1], 10);
    const rec = db.receipts.find(r => r.id === id);
    if (rec) {
      rec.status = 'ready';
      saveDb(db);
      return { success: true, data: rec, message: 'Receipt marked ready' };
    }
  }

  const recValMatch = pathname.match(/^\/receipts\/(\d+)\/validate$/);
  if (recValMatch && method === 'POST') {
    const id = parseInt(recValMatch[1], 10);
    const rec = db.receipts.find(r => r.id === id);
    if (!rec) {
      const err = new Error('Receipt not found');
      err.status = 404;
      throw err;
    }
    if (rec.status === 'done') {
      const err = new Error('This receipt has already been validated and cannot be applied again');
      err.status = 400;
      err.code = 'ALREADY_VALIDATED';
      throw err;
    }

    rec.items.forEach(itm => {
      const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
      if (prod) {
        if (!prod.locations) prod.locations = [];
        let locRow = prod.locations.find(l => l.location_id === parseInt(rec.destination_location_id, 10));
        const prev = locRow ? parseFloat(locRow.quantity || 0) : 0;
        const newQty = prev + parseFloat(itm.quantity || 0);
        if (locRow) {
          locRow.quantity = newQty;
        } else {
          prod.locations.push({
            location_id: parseInt(rec.destination_location_id, 10),
            location_name: rec.destination_location_name,
            warehouse_name: rec.warehouse_name,
            quantity: newQty
          });
        }

        db.ledger.unshift({
          id: Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          unit_of_measure: prod.unit_of_measure,
          operation_type: 'RECEIPT',
          source_location: null,
          source_location_name: null,
          destination_location: rec.destination_location_id,
          destination_location_name: rec.destination_location_name,
          quantity: parseFloat(itm.quantity || 0),
          previous_stock: prev,
          new_stock: newQty,
          user_id: 1,
          user_name: 'Alex Rivera (Manager)'
        });
      }
    });

    rec.status = 'done';
    rec.validated_at = new Date().toISOString();
    saveDb(db);
    return { success: true, data: rec, message: 'Receipt validated successfully' };
  }

  if (pathname === '/deliveries') {
    if (method === 'GET') {
      return { success: true, data: db.deliveries };
    }
    if (method === 'POST') {
      const srcLoc = db.locations.find(l => l.id === parseInt(body.source_location_id, 10));
      const cust = db.customers.find(c => c.id === parseInt(body.customer_id, 10));
      const items = (body.items || []).map(itm => {
        const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
        return {
          id: Date.now() + Math.random(),
          product_id: itm.product_id,
          product_name: prod ? prod.name : 'Item',
          sku: prod ? prod.sku : 'SKU',
          unit_of_measure: prod ? prod.unit_of_measure : 'units',
          quantity: parseFloat(itm.quantity || 0)
        };
      });

      const newDel = {
        id: Date.now(),
        reference_no: `DEL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        customer_id: body.customer_id,
        customer_name: cust ? cust.name : 'Direct Customer',
        source_location_id: body.source_location_id,
        source_location_name: srcLoc ? srcLoc.name : 'Main Store',
        warehouse_name: srcLoc ? srcLoc.warehouse_name : 'Main Warehouse',
        status: 'draft',
        created_at: new Date().toISOString(),
        created_by_name: 'Alex Rivera (Manager)',
        notes: body.notes || '',
        items
      };
      db.deliveries.unshift(newDel);
      saveDb(db);
      return { success: true, data: newDel, message: 'Delivery order created successfully' };
    }
  }

  const delDetailMatch = pathname.match(/^\/deliveries\/(\d+)$/);
  if (delDetailMatch) {
    const id = parseInt(delDetailMatch[1], 10);
    const del = db.deliveries.find(d => d.id === id);
    if (!del) {
      const err = new Error('Delivery not found');
      err.status = 404;
      throw err;
    }
    return { success: true, data: del };
  }

  const delReadyMatch = pathname.match(/^\/deliveries\/(\d+)\/ready$/);
  if (delReadyMatch && method === 'POST') {
    const id = parseInt(delReadyMatch[1], 10);
    const del = db.deliveries.find(d => d.id === id);
    if (del) {
      del.status = 'ready';
      saveDb(db);
      return { success: true, data: del, message: 'Delivery marked ready' };
    }
  }

  const delValMatch = pathname.match(/^\/deliveries\/(\d+)\/validate$/);
  if (delValMatch && method === 'POST') {
    const id = parseInt(delValMatch[1], 10);
    const del = db.deliveries.find(d => d.id === id);
    if (!del) {
      const err = new Error('Delivery not found');
      err.status = 404;
      throw err;
    }
    if (del.status === 'done') {
      const err = new Error('This delivery has already been validated and cannot be applied again');
      err.status = 400;
      err.code = 'ALREADY_VALIDATED';
      throw err;
    }

    for (const itm of del.items) {
      const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
      const locRow = (prod?.locations || []).find(l => l.location_id === parseInt(del.source_location_id, 10));
      const avail = locRow ? parseFloat(locRow.quantity || 0) : 0;
      const req = parseFloat(itm.quantity || 0);
      if (avail < req) {
        const err = new Error(`Insufficient stock. Available: ${avail} ${prod?.unit_of_measure || 'units'}, Requested: ${req} ${prod?.unit_of_measure || 'units'}`);
        err.status = 400;
        err.code = 'INSUFFICIENT_STOCK';
        err.available = avail;
        err.requested = req;
        throw err;
      }
    }

    del.items.forEach(itm => {
      const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
      const locRow = prod.locations.find(l => l.location_id === parseInt(del.source_location_id, 10));
      const prev = parseFloat(locRow.quantity || 0);
      const req = parseFloat(itm.quantity || 0);
      const newQty = prev - req;
      locRow.quantity = newQty;

      db.ledger.unshift({
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        unit_of_measure: prod.unit_of_measure,
        operation_type: 'DELIVERY',
        source_location: del.source_location_id,
        source_location_name: del.source_location_name,
        destination_location: null,
        destination_location_name: null,
        quantity: req,
        previous_stock: prev,
        new_stock: newQty,
        user_id: 1,
        user_name: 'Alex Rivera (Manager)'
      });
    });

    del.status = 'done';
    del.validated_at = new Date().toISOString();
    saveDb(db);
    return { success: true, data: del, message: 'Delivery dispatched successfully' };
  }

  if (pathname === '/transfers') {
    if (method === 'GET') {
      return { success: true, data: db.transfers };
    }
    if (method === 'POST') {
      if (body.source_location_id === body.destination_location_id) {
        const err = new Error('Source and destination locations cannot be the same');
        err.status = 400;
        err.code = 'INVALID_TRANSFER';
        throw err;
      }

      const srcLoc = db.locations.find(l => l.id === parseInt(body.source_location_id, 10));
      const dstLoc = db.locations.find(l => l.id === parseInt(body.destination_location_id, 10));

      const items = (body.items || []).map(itm => {
        const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
        return {
          id: Date.now() + Math.random(),
          product_id: itm.product_id,
          product_name: prod ? prod.name : 'Item',
          sku: prod ? prod.sku : 'SKU',
          unit_of_measure: prod ? prod.unit_of_measure : 'units',
          quantity: parseFloat(itm.quantity || 0)
        };
      });

      const newTrans = {
        id: Date.now(),
        reference_no: `TRF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        source_location_id: body.source_location_id,
        source_location_name: srcLoc ? srcLoc.name : 'Main Store',
        destination_location_id: body.destination_location_id,
        destination_location_name: dstLoc ? dstLoc.name : 'Production',
        status: 'draft',
        created_at: new Date().toISOString(),
        created_by_name: 'Alex Rivera (Manager)',
        notes: body.notes || '',
        items
      };
      db.transfers.unshift(newTrans);
      saveDb(db);
      return { success: true, data: newTrans, message: 'Transfer draft created successfully' };
    }
  }

  const transDetailMatch = pathname.match(/^\/transfers\/(\d+)$/);
  if (transDetailMatch) {
    const id = parseInt(transDetailMatch[1], 10);
    const trf = db.transfers.find(t => t.id === id);
    if (!trf) {
      const err = new Error('Transfer not found');
      err.status = 404;
      throw err;
    }
    return { success: true, data: trf };
  }

  const transReadyMatch = pathname.match(/^\/transfers\/(\d+)\/ready$/);
  if (transReadyMatch && method === 'POST') {
    const id = parseInt(transReadyMatch[1], 10);
    const trf = db.transfers.find(t => t.id === id);
    if (trf) {
      trf.status = 'ready';
      saveDb(db);
      return { success: true, data: trf, message: 'Transfer marked ready' };
    }
  }

  const transValMatch = pathname.match(/^\/transfers\/(\d+)\/validate$/);
  if (transValMatch && method === 'POST') {
    const id = parseInt(transValMatch[1], 10);
    const trf = db.transfers.find(t => t.id === id);
    if (!trf) {
      const err = new Error('Transfer not found');
      err.status = 404;
      throw err;
    }
    if (trf.status === 'done') {
      const err = new Error('This transfer has already been validated and cannot be applied again');
      err.status = 400;
      err.code = 'ALREADY_VALIDATED';
      throw err;
    }

    for (const itm of trf.items) {
      const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
      const locRow = (prod?.locations || []).find(l => l.location_id === parseInt(trf.source_location_id, 10));
      const avail = locRow ? parseFloat(locRow.quantity || 0) : 0;
      const req = parseFloat(itm.quantity || 0);
      if (avail < req) {
        const err = new Error(`Insufficient stock. Available: ${avail}, Requested: ${req}`);
        err.status = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }
    }

    trf.items.forEach(itm => {
      const prod = db.products.find(p => p.id === parseInt(itm.product_id, 10));
      const srcRow = prod.locations.find(l => l.location_id === parseInt(trf.source_location_id, 10));
      let dstRow = prod.locations.find(l => l.location_id === parseInt(trf.destination_location_id, 10));
      const req = parseFloat(itm.quantity || 0);

      const srcPrev = parseFloat(srcRow.quantity || 0);
      const srcNew = srcPrev - req;
      srcRow.quantity = srcNew;

      const dstPrev = dstRow ? parseFloat(dstRow.quantity || 0) : 0;
      const dstNew = dstPrev + req;
      if (dstRow) {
        dstRow.quantity = dstNew;
      } else {
        prod.locations.push({
          location_id: parseInt(trf.destination_location_id, 10),
          location_name: trf.destination_location_name,
          warehouse_name: 'Main Warehouse',
          quantity: dstNew
        });
      }

      db.ledger.unshift({
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        unit_of_measure: prod.unit_of_measure,
        operation_type: 'TRANSFER_OUT',
        source_location: trf.source_location_id,
        source_location_name: trf.source_location_name,
        destination_location: trf.destination_location_id,
        destination_location_name: trf.destination_location_name,
        quantity: req,
        previous_stock: srcPrev,
        new_stock: srcNew,
        user_id: 1,
        user_name: 'Alex Rivera (Manager)'
      });

      db.ledger.unshift({
        id: Date.now() + Math.random() + 0.1,
        timestamp: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        unit_of_measure: prod.unit_of_measure,
        operation_type: 'TRANSFER_IN',
        source_location: trf.source_location_id,
        source_location_name: trf.source_location_name,
        destination_location: trf.destination_location_id,
        destination_location_name: trf.destination_location_name,
        quantity: req,
        previous_stock: dstPrev,
        new_stock: dstNew,
        user_id: 1,
        user_name: 'Alex Rivera (Manager)'
      });
    });

    trf.status = 'done';
    trf.validated_at = new Date().toISOString();
    saveDb(db);
    return { success: true, data: trf, message: 'Transfer executed successfully' };
  }

  if (pathname === '/adjustments') {
    if (method === 'GET') {
      return { success: true, data: db.adjustments };
    }
    if (method === 'POST') {
      const prod = db.products.find(p => p.id === parseInt(body.product_id, 10));
      const loc = db.locations.find(l => l.id === parseInt(body.location_id, 10));
      if (!prod || !loc) {
        const err = new Error('Product or Location not found');
        err.status = 404;
        throw err;
      }

      if (!prod.locations) prod.locations = [];
      let locRow = prod.locations.find(l => l.location_id === parseInt(body.location_id, 10));
      const prev = locRow ? parseFloat(locRow.quantity || 0) : 0;
      const counted = parseFloat(body.counted_quantity || 0);
      const delta = counted - prev;

      if (locRow) {
        locRow.quantity = counted;
      } else {
        prod.locations.push({
          location_id: loc.id,
          location_name: loc.name,
          warehouse_name: loc.warehouse_name,
          quantity: counted
        });
      }

      const newAdj = {
        id: Date.now(),
        reference_no: `ADJ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        location_id: loc.id,
        location_name: loc.name,
        previous_quantity: prev,
        counted_quantity: counted,
        difference: delta,
        reason: body.reason || 'Physical count reconciliation',
        created_at: new Date().toISOString(),
        created_by_name: 'Alex Rivera (Manager)'
      };
      db.adjustments.unshift(newAdj);

      db.ledger.unshift({
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        unit_of_measure: prod.unit_of_measure,
        operation_type: 'ADJUSTMENT',
        source_location: loc.id,
        source_location_name: loc.name,
        destination_location: loc.id,
        destination_location_name: loc.name,
        quantity: delta,
        previous_stock: prev,
        new_stock: counted,
        user_id: 1,
        user_name: 'Alex Rivera (Manager)'
      });

      saveDb(db);
      return { success: true, data: newAdj, message: 'Stock adjustment applied' };
    }
  }

  if (pathname === '/ledger') {
    const prodId = searchParams.get('productId');
    const opType = searchParams.get('operationType');
    let list = db.ledger;
    if (prodId) {
      list = list.filter(l => l.product_id === parseInt(prodId, 10));
    }
    if (opType) {
      list = list.filter(l => l.operation_type === opType);
    }
    return { success: true, data: list };
  }

  if (pathname === '/warehouses') return { success: true, data: db.warehouses };
  if (pathname === '/locations') return { success: true, data: db.locations };
  if (pathname === '/categories') return { success: true, data: db.categories };
  if (pathname === '/suppliers') return { success: true, data: db.suppliers };
  if (pathname === '/customers') return { success: true, data: db.customers };

  return { success: true, data: [] };
}
