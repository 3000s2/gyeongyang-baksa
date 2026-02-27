/**
 * 나만의 경영박사 v4.5 — Test Suite
 * 
 * Usage:
 *   cd project-folder
 *   npm test
 * 
 * Tests core backend logic: DB operations, tax calculations,
 * payment status, GloriaFood order processing, data integrity.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================================
// TEST FRAMEWORK (minimal, no dependencies)
// ============================================================
let _passed = 0, _failed = 0, _errors = [];

function describe(name, fn) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(50));
  fn();
}

function it(name, fn) {
  try {
    fn();
    _passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    _failed++;
    _errors.push({ test: name, error: e.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertClose(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg || 'Not close'}: expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
  }
}

// ============================================================
// DB SETUP (in-memory for testing)
// ============================================================
let db;

function setupTestDB() {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables (copied from main.js initDB)
  db.exec(`CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY CHECK(id=1), name TEXT DEFAULT '', address TEXT DEFAULT '',
    contact TEXT DEFAULT '', notes TEXT DEFAULT '', receipt_folder TEXT DEFAULT '',
    glf_api_key TEXT DEFAULT '', glf_poll_interval INTEGER DEFAULT 60,
    glf_enabled INTEGER DEFAULT 0, glf_menu_key TEXT DEFAULT '',
    tax_gst REAL DEFAULT 0, tax_pst REAL DEFAULT 0, tax_hst REAL DEFAULT 0,
    gmap_api_key TEXT DEFAULT '', store_address TEXT DEFAULT '',
    store_lat REAL DEFAULT 0, store_lng REAL DEFAULT 0
  )`);
  db.exec(`INSERT OR IGNORE INTO company_info (id) VALUES (1)`);

  db.exec(`CREATE TABLE IF NOT EXISTS material_db (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT, material_db_id INTEGER, name TEXT NOT NULL,
    quantity REAL DEFAULT 0, uom TEXT DEFAULT 'Kg', alert_qty REAL DEFAULT 0,
    created_at TEXT DEFAULT (date('now')),
    FOREIGN KEY (material_db_id) REFERENCES material_db(id)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS material_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, material_id INTEGER NOT NULL, type TEXT NOT NULL,
    qty REAL NOT NULL, prev_qty REAL DEFAULT 0, new_qty REAL DEFAULT 0,
    date TEXT NOT NULL, note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cust_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'individual', name TEXT NOT NULL,
    phone TEXT DEFAULT '', address TEXT DEFAULT '', discount_rate REAL DEFAULT 0,
    lat REAL DEFAULT 0, lng REAL DEFAULT 0, created_at TEXT DEFAULT (date('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL DEFAULT 0,
    note TEXT DEFAULT '', created_at TEXT DEFAULT (date('now'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, order_date TEXT NOT NULL,
    delivery_date TEXT DEFAULT '', discount REAL DEFAULT 0, discount_type TEXT DEFAULT '$',
    tax_rate REAL DEFAULT 13, tax_amount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH', payment_status TEXT DEFAULT 'Unpaid',
    paid_amount REAL DEFAULT 0, invoice_date TEXT DEFAULT '',
    subtotal REAL DEFAULT 0, total REAL DEFAULT 0, note TEXT DEFAULT '',
    tax_gst REAL DEFAULT 0, tax_pst REAL DEFAULT 0, tax_hst REAL DEFAULT 0,
    tax_gst_rate REAL DEFAULT 0, tax_pst_rate REAL DEFAULT 0, tax_hst_rate REAL DEFAULT 0,
    order_status TEXT DEFAULT '', delivery_address TEXT DEFAULT '', delivered INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS po_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER NOT NULL, catalog_id INTEGER,
    product_name TEXT DEFAULT '', qty INTEGER DEFAULT 1, price REAL DEFAULT 0, total REAL DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_id) REFERENCES catalog(id)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL DEFAULT 0,
    date TEXT NOT NULL, note TEXT DEFAULT '', receipt_path TEXT DEFAULT '',
    tax_gst REAL DEFAULT 0, tax_pst REAL DEFAULT 0, tax_hst REAL DEFAULT 0,
    tax_gst_rate REAL DEFAULT 0, tax_pst_rate REAL DEFAULT 0, tax_hst_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS payment_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER NOT NULL, amount REAL NOT NULL,
    date TEXT NOT NULL, note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS glf_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, glf_order_id TEXT NOT NULL UNIQUE,
    po_id INTEGER, customer_name TEXT DEFAULT '', total REAL DEFAULT 0,
    order_type TEXT DEFAULT '', payment TEXT DEFAULT '', status TEXT DEFAULT 'imported',
    raw_json TEXT DEFAULT '', received_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_cust ON purchase_orders(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_paylog_po ON payment_log(po_id)');
}

// ============================================================
// HELPER: simulate processGlfOrder (extracted from main.js)
// ============================================================
function processGlfOrder(order) {
  const orderId = String(order.id || order.order_id || '');
  if (!orderId) return null;

  const clientName = [order.client_first_name || '', order.client_last_name || ''].join(' ').trim() || 'GloriaFood Customer';
  const clientPhone = order.client_phone || '';
  
  let clientAddr = '';
  const parts = order.client_address_parts;
  if (parts && typeof parts === 'object') {
    const addrParts = [];
    if (parts.street) addrParts.push(parts.street);
    if (parts.city) addrParts.push(parts.city);
    if (parts.zipcode) addrParts.push(parts.zipcode);
    if (parts.more_address) addrParts.push(parts.more_address);
    clientAddr = addrParts.join(', ');
  }
  if (!clientAddr) clientAddr = order.client_address || '';
  
  const orderType = order.type || 'pickup';
  const payment = order.payment || 'CASH';
  const totalPrice = parseFloat(order.total_price) || 0;
  const items = order.items || [];
  const orderDate = '2026-02-27';
  const deliveryDate = '';
  const orderStatus = order.status || 'accepted';
  const isCancelled = (orderStatus === 'canceled' || orderStatus === 'cancelled');

  const existing = db.prepare("SELECT id,po_id,status FROM glf_orders WHERE glf_order_id=?").get(orderId);

  if (existing) {
    if (isCancelled) {
      const txn = db.transaction(() => {
        db.prepare("UPDATE purchase_orders SET order_status='canceled',total=0,subtotal=0 WHERE id=?").run(existing.po_id);
        db.prepare("DELETE FROM po_items WHERE po_id=?").run(existing.po_id);
        db.prepare("UPDATE glf_orders SET status='cancelled' WHERE id=?").run(existing.id);
      });
      txn();
      return 'cancelled';
    }
    return null;
  }

  if (isCancelled) return null;

  // Find or create customer
  let customer = db.prepare("SELECT id,cust_id FROM customers WHERE name=? AND phone=?").get(clientName, clientPhone);
  if (!customer) {
    const maxC = db.prepare("SELECT cust_id FROM customers WHERE type='individual' ORDER BY id DESC LIMIT 1").get();
    let nextNum = 1;
    if (maxC && maxC.cust_id) { const m = maxC.cust_id.match(/C-(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
    const custId = 'C-' + String(nextNum).padStart(2, '0');
    const r = db.prepare("INSERT INTO customers (cust_id,type,name,phone,address) VALUES (?,?,?,?,?)").run(custId, 'individual', clientName, clientPhone, clientAddr);
    customer = { id: r.lastInsertRowid, cust_id: custId };
  }

  const payMethod = (payment === 'ONLINE' || payment === 'CARD') ? 'E-transfer' : 'CASH';
  let subtotal = 0;
  const validItems = items.filter(it => it.type === 'item' || !it.type);
  for (const it of validItems) { subtotal += parseFloat(it.total_item_price || it.price || 0); }
  const discount = subtotal - totalPrice > 0 ? subtotal - totalPrice : 0;
  const total = totalPrice || subtotal;

  const txnNew = db.transaction(() => {
    const poResult = db.prepare(
      "INSERT INTO purchase_orders (customer_id,order_date,delivery_date,discount,discount_type,payment_method,payment_status,subtotal,total,note,order_status,delivery_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).run(customer.id, orderDate, deliveryDate, discount, '$', payMethod, payMethod === 'CASH' ? 'Unpaid' : 'Paid', subtotal, total, `[GloriaFood ${orderType}]`, orderStatus, clientAddr);
    const poId = poResult.lastInsertRowid;

    for (const it of validItems) {
      const itemName = it.name || 'Unknown Item';
      const qty = parseInt(it.quantity) || 1;
      const price = parseFloat(it.price) || 0;
      const itemTotal = parseFloat(it.total_item_price || (price * qty)) || 0;
      let catItem = db.prepare("SELECT id FROM catalog WHERE name=?").get(itemName);
      if (!catItem) {
        const cr = db.prepare("INSERT INTO catalog (name,price,note) VALUES (?,?,?)").run(itemName, price, 'Auto-created from GloriaFood');
        catItem = { id: cr.lastInsertRowid };
      }
      db.prepare("INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,?,?,?,?,?)").run(poId, catItem.id, itemName, qty, price, itemTotal);
    }

    db.prepare("INSERT INTO glf_orders (glf_order_id,po_id,customer_name,total,order_type,payment,status,raw_json) VALUES (?,?,?,?,?,?,?,?)").run(
      orderId, poId, clientName, total, orderType, payment, orderStatus, JSON.stringify(order)
    );
  });
  txnNew();
  return 'new';
}

// ============================================================
// TESTS
// ============================================================

describe('DB Schema & Initialization', () => {
  setupTestDB();

  it('All tables created', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(t => t.name);
    const required = ['company_info', 'customers', 'catalog', 'purchase_orders', 'po_items', 'expenses', 'payment_log', 'materials', 'material_db', 'material_log', 'glf_orders'];
    for (const t of required) {
      assert(tables.includes(t), `Missing table: ${t}`);
    }
  });

  it('company_info has exactly 1 row', () => {
    const count = db.prepare("SELECT COUNT(*) as c FROM company_info").get().c;
    assertEqual(count, 1, 'company_info row count');
  });

  it('company_info has all required columns', () => {
    const cols = db.prepare("PRAGMA table_info(company_info)").all().map(c => c.name);
    const required = ['name', 'address', 'tax_gst', 'tax_pst', 'tax_hst', 'gmap_api_key', 'store_lat', 'store_lng', 'glf_api_key', 'glf_enabled'];
    for (const col of required) {
      assert(cols.includes(col), `Missing column: company_info.${col}`);
    }
  });

  it('purchase_orders has delivery columns', () => {
    const cols = db.prepare("PRAGMA table_info(purchase_orders)").all().map(c => c.name);
    assert(cols.includes('delivered'), 'Missing: delivered');
    assert(cols.includes('delivery_address'), 'Missing: delivery_address');
    assert(cols.includes('order_status'), 'Missing: order_status');
  });

  it('Foreign keys are enforced', () => {
    const fk = db.prepare("PRAGMA foreign_keys").get();
    assertEqual(fk.foreign_keys, 1, 'Foreign keys');
  });
});

describe('Customer CRUD', () => {
  setupTestDB();

  it('Create individual customer', () => {
    const r = db.prepare("INSERT INTO customers (cust_id,type,name,phone,address) VALUES (?,?,?,?,?)").run('C-01', 'individual', '김민수', '416-555-1001', '120 Bloor St W');
    assertEqual(r.changes, 1, 'Insert changes');
    const c = db.prepare("SELECT * FROM customers WHERE cust_id='C-01'").get();
    assertEqual(c.name, '김민수', 'Name');
    assertEqual(c.type, 'individual', 'Type');
  });

  it('Create business customer with discount', () => {
    db.prepare("INSERT INTO customers (cust_id,type,name,phone,address,discount_rate) VALUES (?,?,?,?,?,?)").run('I-01', 'business', 'Korean Culture Centre', '416-555-2001', '1133 Leslie St', 10);
    const c = db.prepare("SELECT * FROM customers WHERE cust_id='I-01'").get();
    assertEqual(c.type, 'business', 'Type');
    assertEqual(c.discount_rate, 10, 'Discount rate');
  });

  it('Duplicate cust_id rejected', () => {
    let threw = false;
    try {
      db.prepare("INSERT INTO customers (cust_id,type,name,phone) VALUES (?,?,?,?)").run('C-01', 'individual', 'Duplicate', '000');
    } catch (e) { threw = true; }
    assert(threw, 'Should reject duplicate cust_id');
  });

  it('Update customer', () => {
    db.prepare("UPDATE customers SET phone='416-999-9999' WHERE cust_id='C-01'").run();
    const c = db.prepare("SELECT phone FROM customers WHERE cust_id='C-01'").get();
    assertEqual(c.phone, '416-999-9999', 'Updated phone');
  });

  it('Customer with special characters in address', () => {
    db.prepare("INSERT INTO customers (cust_id,type,name,phone,address) VALUES (?,?,?,?,?)").run('C-02', 'individual', 'Test "User"', '000', '123 "Main" St & <Suite> 4');
    const c = db.prepare("SELECT address FROM customers WHERE cust_id='C-02'").get();
    assertEqual(c.address, '123 "Main" St & <Suite> 4', 'Special chars preserved');
  });

  it('Store GPS coordinates', () => {
    db.prepare("UPDATE customers SET lat=43.6706, lng=-79.3929 WHERE cust_id='C-01'").run();
    const c = db.prepare("SELECT lat,lng FROM customers WHERE cust_id='C-01'").get();
    assertClose(c.lat, 43.6706, 0.0001, 'Latitude');
    assertClose(c.lng, -79.3929, 0.0001, 'Longitude');
  });
});

describe('Catalog', () => {
  setupTestDB();

  it('Create product', () => {
    db.prepare("INSERT INTO catalog (name,price,note) VALUES (?,?,?)").run('불고기 정식', 18.99, 'Best seller');
    const p = db.prepare("SELECT * FROM catalog WHERE name='불고기 정식'").get();
    assertEqual(p.price, 18.99, 'Price');
  });

  it('Update price', () => {
    db.prepare("UPDATE catalog SET price=19.99 WHERE name='불고기 정식'").run();
    const p = db.prepare("SELECT price FROM catalog WHERE name='불고기 정식'").get();
    assertEqual(p.price, 19.99, 'Updated price');
  });
});

describe('Purchase Order — Tax Calculations', () => {
  setupTestDB();
  
  // Setup data
  db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-01','individual','김민수')").run();
  db.prepare("INSERT INTO catalog (name,price) VALUES ('불고기',18.99)").run();
  db.prepare("INSERT INTO catalog (name,price) VALUES ('비빔밥',15.99)").run();

  it('HST 13% on simple order', () => {
    const sub = 18.99 + 15.99; // 34.98
    const hst = sub * 0.13;     // 4.5474
    const total = sub + hst;    // 39.5274
    
    db.prepare(`INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,tax_hst,tax_hst_rate) VALUES (1,'2026-01-08',?,?,?,13)`)
      .run(sub, total, hst);
    
    const po = db.prepare("SELECT * FROM purchase_orders WHERE id=1").get();
    assertClose(po.subtotal, 34.98, 0.01, 'Subtotal');
    assertClose(po.tax_hst, 4.55, 0.01, 'HST amount');
    assertClose(po.total, 39.53, 0.01, 'Total');
  });

  it('Discount $ (flat amount)', () => {
    const sub = 50.00;
    const discount = 5.00;
    const net = sub - discount;   // 45.00
    const hst = net * 0.13;      // 5.85
    const total = net + hst;     // 50.85

    db.prepare(`INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,discount,discount_type,tax_hst,tax_hst_rate) VALUES (1,'2026-01-10',?,?,?,?,?,13)`)
      .run(sub, total, discount, '$', hst);
    
    const po = db.prepare("SELECT * FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    assertClose(po.total, 50.85, 0.01, 'Total after $ discount');
  });

  it('Discount % (percentage)', () => {
    const sub = 100.00;
    const discRate = 10; // 10%
    const discAmt = sub * discRate / 100; // 10.00
    const net = sub - discAmt;  // 90.00
    const hst = net * 0.13;    // 11.70
    const total = net + hst;   // 101.70

    db.prepare(`INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,discount,discount_type,tax_hst,tax_hst_rate) VALUES (1,'2026-01-12',?,?,?,?,?,13)`)
      .run(sub, total, discRate, '%', hst);
    
    const po = db.prepare("SELECT * FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    assertClose(po.total, 101.70, 0.01, 'Total after % discount');
  });

  it('Zero tax order', () => {
    const sub = 25.00;
    db.prepare(`INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,tax_hst,tax_hst_rate) VALUES (1,'2026-01-15',?,?,0,0)`)
      .run(sub, sub);
    
    const po = db.prepare("SELECT * FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    assertEqual(po.total, 25.00, 'Total = subtotal when no tax');
  });
});

describe('PO Items & Cascading Delete', () => {
  setupTestDB();
  
  db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-01','individual','Test')").run();
  db.prepare("INSERT INTO catalog (name,price) VALUES ('Item A',10.00)").run();
  db.prepare("INSERT INTO catalog (name,price) VALUES ('Item B',20.00)").run();

  it('Insert PO with multiple items', () => {
    const r = db.prepare("INSERT INTO purchase_orders (customer_id,order_date,subtotal,total) VALUES (1,'2026-01-01',50,56.50)").run();
    const poId = r.lastInsertRowid;
    db.prepare("INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,1,'Item A',2,10,20)").run(poId);
    db.prepare("INSERT INTO po_items (po_id,catalog_id,product_name,qty,price,total) VALUES (?,2,'Item B',1,20,20)").run(poId);
    db.prepare("INSERT INTO payment_log (po_id,amount,date,note) VALUES (?,56.50,'2026-01-01','Cash')").run(poId);
    
    const items = db.prepare("SELECT COUNT(*) as c FROM po_items WHERE po_id=?").get(poId);
    assertEqual(items.c, 2, 'Item count');
  });

  it('Cascade delete PO removes items and payments', () => {
    const poId = db.prepare("SELECT id FROM purchase_orders LIMIT 1").get().id;
    db.prepare("DELETE FROM purchase_orders WHERE id=?").run(poId);
    
    const items = db.prepare("SELECT COUNT(*) as c FROM po_items WHERE po_id=?").get(poId);
    const pays = db.prepare("SELECT COUNT(*) as c FROM payment_log WHERE po_id=?").get(poId);
    assertEqual(items.c, 0, 'Items deleted');
    assertEqual(pays.c, 0, 'Payments deleted');
  });
});

describe('Payment Status Logic', () => {
  setupTestDB();
  
  db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-01','individual','Test')").run();

  it('Unpaid → Partial → Paid', () => {
    const r = db.prepare("INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,payment_status,paid_amount) VALUES (1,'2026-01-01',100,113,'Unpaid',0)").run();
    const poId = r.lastInsertRowid;

    // First payment: partial
    db.prepare("INSERT INTO payment_log (po_id,amount,date) VALUES (?,50,'2026-01-01')").run(poId);
    let sum = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payment_log WHERE po_id=?").get(poId).s;
    let status = sum <= 0 ? 'Unpaid' : sum >= 113 ? 'Paid' : 'Partial';
    db.prepare("UPDATE purchase_orders SET paid_amount=?,payment_status=? WHERE id=?").run(sum, status, poId);
    
    let po = db.prepare("SELECT payment_status,paid_amount FROM purchase_orders WHERE id=?").get(poId);
    assertEqual(po.payment_status, 'Partial', 'After first payment');
    assertEqual(po.paid_amount, 50, 'Paid amount');

    // Second payment: full
    db.prepare("INSERT INTO payment_log (po_id,amount,date) VALUES (?,63,'2026-01-05')").run(poId);
    sum = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payment_log WHERE po_id=?").get(poId).s;
    status = sum <= 0 ? 'Unpaid' : sum >= 113 ? 'Paid' : 'Partial';
    db.prepare("UPDATE purchase_orders SET paid_amount=?,payment_status=? WHERE id=?").run(sum, status, poId);
    
    po = db.prepare("SELECT payment_status,paid_amount FROM purchase_orders WHERE id=?").get(poId);
    assertEqual(po.payment_status, 'Paid', 'After full payment');
    assertEqual(po.paid_amount, 113, 'Total paid');
  });

  it('Delete payment reverts status', () => {
    const poId = db.prepare("SELECT id FROM purchase_orders LIMIT 1").get().id;
    
    // Delete second payment
    const lastPay = db.prepare("SELECT id FROM payment_log WHERE po_id=? ORDER BY id DESC LIMIT 1").get(poId);
    db.prepare("DELETE FROM payment_log WHERE id=?").run(lastPay.id);
    
    const sum = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payment_log WHERE po_id=?").get(poId).s;
    const po = db.prepare("SELECT total FROM purchase_orders WHERE id=?").get(poId);
    const status = sum <= 0 ? 'Unpaid' : sum >= po.total ? 'Paid' : 'Partial';
    db.prepare("UPDATE purchase_orders SET paid_amount=?,payment_status=? WHERE id=?").run(sum, status, poId);
    
    const updated = db.prepare("SELECT payment_status FROM purchase_orders WHERE id=?").get(poId);
    assertEqual(updated.payment_status, 'Partial', 'Reverted to Partial');
  });
});

describe('Material Inventory Tracking', () => {
  setupTestDB();

  db.prepare("INSERT INTO material_db (name) VALUES ('쌀 (Rice)')").run();
  db.prepare("INSERT INTO materials (material_db_id,name,quantity,uom,alert_qty) VALUES (1,'쌀 (Rice)',0,'Kg',10)").run();

  it('Add stock', () => {
    const prev = db.prepare("SELECT quantity FROM materials WHERE id=1").get().quantity;
    const addQty = 50;
    db.prepare("UPDATE materials SET quantity=quantity+? WHERE id=1").run(addQty);
    db.prepare("INSERT INTO material_log (material_id,type,qty,prev_qty,new_qty,date,note) VALUES (1,'add',?,?,?,?,'Initial stock')")
      .run(addQty, prev, prev + addQty, '2026-01-05');
    
    const mat = db.prepare("SELECT quantity FROM materials WHERE id=1").get();
    assertEqual(mat.quantity, 50, 'Stock after add');
  });

  it('Use stock', () => {
    const prev = db.prepare("SELECT quantity FROM materials WHERE id=1").get().quantity;
    const useQty = 8;
    db.prepare("UPDATE materials SET quantity=quantity-? WHERE id=1").run(useQty);
    db.prepare("INSERT INTO material_log (material_id,type,qty,prev_qty,new_qty,date,note) VALUES (1,'use',?,?,?,?,'Weekly usage')")
      .run(useQty, prev, prev - useQty, '2026-01-10');
    
    const mat = db.prepare("SELECT quantity FROM materials WHERE id=1").get();
    assertEqual(mat.quantity, 42, 'Stock after use');
  });

  it('Low stock alert detection', () => {
    db.prepare("UPDATE materials SET quantity=5 WHERE id=1").run();
    const alerts = db.prepare("SELECT * FROM materials WHERE quantity <= alert_qty").all();
    assertEqual(alerts.length, 1, 'Should have 1 alert');
    assertEqual(alerts[0].name, '쌀 (Rice)', 'Alert item');
  });

  it('Log history is correct', () => {
    const logs = db.prepare("SELECT * FROM material_log WHERE material_id=1 ORDER BY id").all();
    assertEqual(logs.length, 2, 'Log count');
    assertEqual(logs[0].type, 'add', 'First log type');
    assertEqual(logs[1].type, 'use', 'Second log type');
    assertEqual(logs[0].new_qty, 50, 'First log new_qty');
    assertEqual(logs[1].new_qty, 42, 'Second log new_qty');
  });
});

describe('Expense & Tax Report', () => {
  setupTestDB();

  it('Create expense with HST', () => {
    const amount = 850;
    const hstRate = 13;
    const hstAmt = amount * hstRate / 100; // 110.50
    
    db.prepare("INSERT INTO expenses (name,amount,date,note,tax_hst,tax_hst_rate) VALUES (?,?,?,?,?,?)")
      .run('H-Mart 식자재', amount, '2026-01-05', '쌀, 고추장', hstAmt, hstRate);
    
    const exp = db.prepare("SELECT * FROM expenses WHERE name='H-Mart 식자재'").get();
    assertEqual(exp.amount, 850, 'Amount (before tax)');
    assertClose(exp.tax_hst, 110.50, 0.01, 'HST amount');
  });

  it('Create tax-exempt expense', () => {
    db.prepare("INSERT INTO expenses (name,amount,date,tax_hst,tax_hst_rate) VALUES ('Rent',3500,'2026-01-01',0,0)").run();
    const exp = db.prepare("SELECT * FROM expenses WHERE name='Rent'").get();
    assertEqual(exp.tax_hst, 0, 'No HST on rent');
  });

  it('Tax report aggregation', () => {
    // Add a PO for revenue
    db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-01','individual','Test')").run();
    db.prepare("INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,tax_hst,tax_hst_rate,payment_method) VALUES (1,'2026-01-08',100,113,13,13,'CASH')").run();
    db.prepare("INSERT INTO purchase_orders (customer_id,order_date,subtotal,total,tax_hst,tax_hst_rate,payment_method) VALUES (1,'2026-01-10',200,226,26,13,'E-transfer')").run();

    const rev = db.prepare("SELECT COALESCE(SUM(subtotal),0) as sub, COALESCE(SUM(tax_hst),0) as hst, COALESCE(SUM(total),0) as tot FROM purchase_orders WHERE order_date >= '2026-01-01' AND order_date <= '2026-12-31'").get();
    const exp = db.prepare("SELECT COALESCE(SUM(amount),0) as sub, COALESCE(SUM(tax_hst),0) as hst FROM expenses WHERE date >= '2026-01-01' AND date <= '2026-12-31'").get();

    assertEqual(rev.sub, 300, 'Revenue subtotal');
    assertEqual(rev.hst, 39, 'Revenue HST');
    assertEqual(rev.tot, 339, 'Revenue total');
    assertEqual(exp.sub, 4350, 'Expense subtotal');
    assertClose(exp.hst, 110.50, 0.01, 'Expense HST');

    // Tax balance = collected HST - paid HST
    const taxBalance = rev.hst - exp.hst;
    assertClose(taxBalance, -71.50, 0.01, 'Tax balance (refund expected)');
  });

  it('Monthly breakdown query', () => {
    const monthly = db.prepare("SELECT strftime('%m',order_date) as m, SUM(total) as t FROM purchase_orders WHERE order_date >= '2026-01-01' GROUP BY m").all();
    assertEqual(monthly.length, 1, 'One month of data');
    assertEqual(monthly[0].m, '01', 'January');
    assertEqual(monthly[0].t, 339, 'January total');
  });
});

describe('GloriaFood Order Processing', () => {
  setupTestDB();

  it('New delivery order creates customer + PO + items', () => {
    const result = processGlfOrder({
      id: 'GLF-001',
      client_first_name: 'John',
      client_last_name: 'Kim',
      client_phone: '416-555-9999',
      client_address: '100 Queen St W, Toronto',
      type: 'delivery',
      payment: 'ONLINE',
      total_price: 33.98,
      status: 'accepted',
      items: [
        { name: '불고기 정식', price: 18.99, quantity: 1, total_item_price: 18.99 },
        { name: '비빔밥', price: 14.99, quantity: 1, total_item_price: 14.99 }
      ]
    });

    assertEqual(result, 'new', 'Result');
    
    // Check customer created
    const cust = db.prepare("SELECT * FROM customers WHERE name='John Kim'").get();
    assert(cust, 'Customer should exist');
    assertEqual(cust.phone, '416-555-9999', 'Phone');
    
    // Check PO
    const po = db.prepare("SELECT * FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    assertClose(po.total, 33.98, 0.01, 'PO total');
    assertEqual(po.payment_method, 'E-transfer', 'ONLINE → E-transfer');
    assertEqual(po.payment_status, 'Paid', 'Online payment = Paid');
    
    // Check items
    const items = db.prepare("SELECT * FROM po_items WHERE po_id=?").all(po.id);
    assertEqual(items.length, 2, 'Item count');

    // Check glf_orders dedup
    const glf = db.prepare("SELECT * FROM glf_orders WHERE glf_order_id='GLF-001'").get();
    assert(glf, 'GloriaFood order tracked');
  });

  it('Duplicate order is rejected', () => {
    const result = processGlfOrder({
      id: 'GLF-001',
      client_first_name: 'John',
      client_last_name: 'Kim',
      total_price: 33.98,
      status: 'accepted',
      items: []
    });
    assertEqual(result, null, 'Duplicate should return null');
  });

  it('CASH payment = Unpaid', () => {
    processGlfOrder({
      id: 'GLF-002',
      client_first_name: 'Test',
      client_last_name: 'User',
      payment: 'CASH',
      total_price: 20.00,
      status: 'accepted',
      items: [{ name: 'Test Item', price: 20, quantity: 1, total_item_price: 20 }]
    });
    const po = db.prepare("SELECT payment_status,payment_method FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    assertEqual(po.payment_method, 'CASH', 'Cash method');
    assertEqual(po.payment_status, 'Unpaid', 'Cash = Unpaid');
  });

  it('Cancelled order on first sight is ignored', () => {
    const result = processGlfOrder({
      id: 'GLF-003',
      client_first_name: 'Cancel',
      client_last_name: 'Test',
      total_price: 0,
      status: 'canceled',
      items: []
    });
    assertEqual(result, null, 'Cancelled new order ignored');
    const glf = db.prepare("SELECT * FROM glf_orders WHERE glf_order_id='GLF-003'").get();
    assert(!glf, 'Not tracked in glf_orders');
  });

  it('Cancel existing order', () => {
    const result = processGlfOrder({
      id: 'GLF-001',
      status: 'canceled',
      items: []
    });
    assertEqual(result, 'cancelled', 'Cancellation processed');
    
    const glf = db.prepare("SELECT status FROM glf_orders WHERE glf_order_id='GLF-001'").get();
    assertEqual(glf.status, 'cancelled', 'GloriaFood status updated');
    
    const po = db.prepare("SELECT order_status,total FROM purchase_orders WHERE id=?").get(
      db.prepare("SELECT po_id FROM glf_orders WHERE glf_order_id='GLF-001'").get().po_id
    );
    assertEqual(po.order_status, 'canceled', 'PO status canceled');
    assertEqual(po.total, 0, 'PO total zeroed');
  });

  it('Auto-creates catalog items', () => {
    const cat = db.prepare("SELECT * FROM catalog WHERE name='불고기 정식'").get();
    assert(cat, 'Catalog item auto-created');
    assertEqual(cat.price, 18.99, 'Price from order');
  });

  it('Reuses existing customer on repeat order', () => {
    const beforeCount = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    processGlfOrder({
      id: 'GLF-004',
      client_first_name: 'John',
      client_last_name: 'Kim',
      client_phone: '416-555-9999',
      total_price: 18.99,
      status: 'accepted',
      items: [{ name: '불고기 정식', price: 18.99, quantity: 1, total_item_price: 18.99 }]
    });
    const afterCount = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    assertEqual(afterCount, beforeCount, 'No new customer created');
  });
});

describe('Delivery Route Data', () => {
  setupTestDB();

  db.prepare("INSERT INTO customers (cust_id,type,name,address,lat,lng) VALUES ('C-01','individual','김민수','120 Bloor St W',43.6706,-79.3929)").run();
  db.prepare("INSERT INTO customers (cust_id,type,name,address,lat,lng) VALUES ('C-02','individual','박지영','88 Queens Quay W',43.6389,-79.3815)").run();
  
  db.prepare("INSERT INTO purchase_orders (customer_id,order_date,delivery_date,delivery_address,delivered,total,order_status) VALUES (1,'2026-02-27','2026-02-27','120 Bloor St W',0,50,'')").run();
  db.prepare("INSERT INTO purchase_orders (customer_id,order_date,delivery_date,delivery_address,delivered,total,order_status) VALUES (2,'2026-02-27','2026-02-27','88 Queens Quay W',0,30,'')").run();
  db.prepare("INSERT INTO purchase_orders (customer_id,order_date,delivery_date,delivery_address,delivered,total,order_status) VALUES (1,'2026-02-26','2026-02-26','120 Bloor St W',1,40,'')").run();

  it('Filter undelivered orders', () => {
    const orders = db.prepare(`SELECT po.*, c.lat, c.lng FROM purchase_orders po 
      LEFT JOIN customers c ON po.customer_id=c.id 
      WHERE po.delivered=0 AND (po.order_status NOT IN ('canceled','cancelled') OR po.order_status='')`).all();
    assertEqual(orders.length, 2, 'Two undelivered');
  });

  it('Delivered orders excluded', () => {
    const delivered = db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE delivered=1").get();
    assertEqual(delivered.c, 1, 'One delivered');
  });

  it('Customer coordinates available', () => {
    const orders = db.prepare(`SELECT c.lat, c.lng FROM purchase_orders po 
      JOIN customers c ON po.customer_id=c.id WHERE po.delivered=0`).all();
    for (const o of orders) {
      assert(o.lat !== 0, 'Latitude should not be 0');
      assert(o.lng !== 0, 'Longitude should not be 0');
    }
  });

  it('Toggle delivered status', () => {
    db.prepare("UPDATE purchase_orders SET delivered=1 WHERE id=1").run();
    const po = db.prepare("SELECT delivered FROM purchase_orders WHERE id=1").get();
    assertEqual(po.delivered, 1, 'Marked delivered');
    
    // Undeliver
    db.prepare("UPDATE purchase_orders SET delivered=0 WHERE id=1").run();
    const po2 = db.prepare("SELECT delivered FROM purchase_orders WHERE id=1").get();
    assertEqual(po2.delivered, 0, 'Unmarked');
  });
});

describe('Edge Cases & Data Integrity', () => {
  setupTestDB();

  it('Empty string defaults work', () => {
    db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-99','individual','Empty Test')").run();
    const c = db.prepare("SELECT phone,address FROM customers WHERE cust_id='C-99'").get();
    assertEqual(c.phone, '', 'Empty phone');
    assertEqual(c.address, '', 'Empty address');
  });

  it('Large quantity numbers', () => {
    db.prepare("INSERT INTO material_db (name) VALUES ('Bulk Item')").run();
    db.prepare("INSERT INTO materials (material_db_id,name,quantity,uom) VALUES (1,'Bulk Item',999999.99,'Kg')").run();
    const m = db.prepare("SELECT quantity FROM materials WHERE name='Bulk Item'").get();
    assertClose(m.quantity, 999999.99, 0.01, 'Large quantity');
  });

  it('Unicode in all fields', () => {
    db.prepare("INSERT INTO customers (cust_id,type,name,phone,address) VALUES ('C-88','individual','한국어テスト','☎️ 123','🏠 서울시 강남구')").run();
    const c = db.prepare("SELECT * FROM customers WHERE cust_id='C-88'").get();
    assertEqual(c.name, '한국어テスト', 'Korean + Japanese');
    assert(c.address.includes('🏠'), 'Emoji preserved');
  });

  it('Concurrent-safe: transaction rollback on error', () => {
    const custBefore = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    try {
      const txn = db.transaction(() => {
        db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-77','individual','Will Fail')").run();
        db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-77','individual','Duplicate')").run(); // should fail
      });
      txn();
    } catch (e) { /* expected */ }
    const custAfter = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    assertEqual(custAfter, custBefore, 'Transaction rolled back');
  });

  it('PO with zero items', () => {
    db.prepare("INSERT INTO customers (cust_id,type,name) VALUES ('C-66','individual','Zero')").run();
    const cid = db.prepare("SELECT id FROM customers WHERE cust_id='C-66'").get().id;
    db.prepare("INSERT INTO purchase_orders (customer_id,order_date,subtotal,total) VALUES (?,'2026-01-01',0,0)").run(cid);
    const po = db.prepare("SELECT * FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
    const items = db.prepare("SELECT COUNT(*) as c FROM po_items WHERE po_id=?").get(po.id);
    assertEqual(items.c, 0, 'Zero items allowed');
  });
});

// ============================================================
// RESULTS
// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`  RESULTS: ${_passed} passed, ${_failed} failed`);
console.log('='.repeat(50));

if (_errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of _errors) {
    console.log(`  ❌ ${e.test}: ${e.error}`);
  }
}

if (db) db.close();
process.exit(_failed > 0 ? 1 : 0);
