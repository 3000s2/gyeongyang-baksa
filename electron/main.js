const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const { autoUpdater } = require('electron-updater');

let db, win;
let glfAutoTimer = null;
const dbPath = path.join(app.getPath('userData'), 'inventory.sqlite');
const backupDir = path.join(app.getPath('userData'), 'auto-backups');

function initDB() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');

  // Company Info
  db.exec(`CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY CHECK(id=1),
    name TEXT DEFAULT '',
    address TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    receipt_folder TEXT DEFAULT ''
  )`);
  db.exec(`INSERT OR IGNORE INTO company_info (id) VALUES (1)`);

  // Migrations: company_info
  const ciCols = db.prepare("PRAGMA table_info(company_info)").all().map(c=>c.name);
  if(!ciCols.includes('glf_api_key')) db.exec("ALTER TABLE company_info ADD COLUMN glf_api_key TEXT DEFAULT ''");
  if(!ciCols.includes('glf_poll_interval')) db.exec("ALTER TABLE company_info ADD COLUMN glf_poll_interval INTEGER DEFAULT 60");
  if(!ciCols.includes('glf_enabled')) db.exec("ALTER TABLE company_info ADD COLUMN glf_enabled INTEGER DEFAULT 0");
  if(!ciCols.includes('glf_menu_key')) db.exec("ALTER TABLE company_info ADD COLUMN glf_menu_key TEXT DEFAULT ''");
  if(!ciCols.includes('tax_gst')) db.exec("ALTER TABLE company_info ADD COLUMN tax_gst REAL DEFAULT 0");
  if(!ciCols.includes('tax_pst')) db.exec("ALTER TABLE company_info ADD COLUMN tax_pst REAL DEFAULT 0");
  if(!ciCols.includes('tax_hst')) db.exec("ALTER TABLE company_info ADD COLUMN tax_hst REAL DEFAULT 0");
  if(!ciCols.includes('gmap_api_key')) db.exec("ALTER TABLE company_info ADD COLUMN gmap_api_key TEXT DEFAULT ''");
  if(!ciCols.includes('store_address')) db.exec("ALTER TABLE company_info ADD COLUMN store_address TEXT DEFAULT ''");
  if(!ciCols.includes('store_lat')) db.exec("ALTER TABLE company_info ADD COLUMN store_lat REAL DEFAULT 0");
  if(!ciCols.includes('store_lng')) db.exec("ALTER TABLE company_info ADD COLUMN store_lng REAL DEFAULT 0");

  // GloriaFood orders dedup table
  db.exec(`CREATE TABLE IF NOT EXISTS glf_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    glf_order_id TEXT NOT NULL UNIQUE,
    po_id INTEGER,
    customer_name TEXT DEFAULT '',
    total REAL DEFAULT 0,
    order_type TEXT DEFAULT '',
    payment TEXT DEFAULT '',
    status TEXT DEFAULT 'imported',
    raw_json TEXT DEFAULT '',
    received_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Raw material DB (names list for dropdown)
  db.exec(`CREATE TABLE IF NOT EXISTS material_db (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  // Materials (raw materials inventory)
  db.exec(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_db_id INTEGER,
    name TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    uom TEXT DEFAULT 'Kg',
    alert_qty REAL DEFAULT 0,
    created_at TEXT DEFAULT (date('now')),
    FOREIGN KEY (material_db_id) REFERENCES material_db(id)
  )`);

  // Material log (add/use tracking)
  db.exec(`CREATE TABLE IF NOT EXISTS material_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    qty REAL NOT NULL,
    prev_qty REAL DEFAULT 0,
    new_qty REAL DEFAULT 0,
    date TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )`);

  // Customers (with type: individual C-XX / business I-XX)
  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cust_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'individual',
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    discount_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (date('now'))
  )`);

  // Migrations: customers
  const custCols = db.prepare("PRAGMA table_info(customers)").all().map(c=>c.name);
  if(!custCols.includes('discount_rate')) db.exec("ALTER TABLE customers ADD COLUMN discount_rate REAL DEFAULT 0");
  if(!custCols.includes('lat')) db.exec("ALTER TABLE customers ADD COLUMN lat REAL DEFAULT 0");
  if(!custCols.includes('lng')) db.exec("ALTER TABLE customers ADD COLUMN lng REAL DEFAULT 0");

  // Product catalog (finished products for PO)
  db.exec(`CREATE TABLE IF NOT EXISTS catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (date('now'))
  )`);

  // Purchase Orders (sales orders from customers)
  db.exec(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    order_date TEXT NOT NULL,
    delivery_date TEXT DEFAULT '',
    discount REAL DEFAULT 0,
    discount_type TEXT DEFAULT '$',
    tax_rate REAL DEFAULT 13,
    tax_amount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH',
    payment_status TEXT DEFAULT 'Unpaid',
    paid_amount REAL DEFAULT 0,
    invoice_date TEXT DEFAULT '',
    subtotal REAL DEFAULT 0,
    total REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  // Migrations: purchase_orders
  const poCols = db.prepare("PRAGMA table_info(purchase_orders)").all().map(c=>c.name);
  if(!poCols.includes('discount_type')) db.exec("ALTER TABLE purchase_orders ADD COLUMN discount_type TEXT DEFAULT '$'");
  if(!poCols.includes('payment_status')) db.exec("ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'Unpaid'");
  if(!poCols.includes('paid_amount')) db.exec("ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL DEFAULT 0");
  if(!poCols.includes('invoice_date')) db.exec("ALTER TABLE purchase_orders ADD COLUMN invoice_date TEXT DEFAULT ''");
  if(!poCols.includes('tax_gst')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_gst REAL DEFAULT 0");
  if(!poCols.includes('tax_pst')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_pst REAL DEFAULT 0");
  if(!poCols.includes('tax_hst')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_hst REAL DEFAULT 0");
  if(!poCols.includes('tax_gst_rate')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_gst_rate REAL DEFAULT 0");
  if(!poCols.includes('tax_pst_rate')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_pst_rate REAL DEFAULT 0");
  if(!poCols.includes('tax_hst_rate')) db.exec("ALTER TABLE purchase_orders ADD COLUMN tax_hst_rate REAL DEFAULT 0");
  if(!poCols.includes('order_status')) db.exec("ALTER TABLE purchase_orders ADD COLUMN order_status TEXT DEFAULT ''");
  if(!poCols.includes('delivery_address')) db.exec("ALTER TABLE purchase_orders ADD COLUMN delivery_address TEXT DEFAULT ''");
  if(!poCols.includes('delivered')) db.exec("ALTER TABLE purchase_orders ADD COLUMN delivered INTEGER DEFAULT 0");

  // PO line items
  db.exec(`CREATE TABLE IF NOT EXISTS po_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    catalog_id INTEGER,
    product_name TEXT DEFAULT '',
    qty INTEGER DEFAULT 1,
    price REAL DEFAULT 0,
    total REAL DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_id) REFERENCES catalog(id)
  )`);

  // Expenses
  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL DEFAULT 0,
    date TEXT NOT NULL,
    note TEXT DEFAULT '',
    receipt_path TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // Migrations: expenses
  const expCols = db.prepare("PRAGMA table_info(expenses)").all().map(c=>c.name);
  if(!expCols.includes('tax_gst')) db.exec("ALTER TABLE expenses ADD COLUMN tax_gst REAL DEFAULT 0");
  if(!expCols.includes('tax_pst')) db.exec("ALTER TABLE expenses ADD COLUMN tax_pst REAL DEFAULT 0");
  if(!expCols.includes('tax_hst')) db.exec("ALTER TABLE expenses ADD COLUMN tax_hst REAL DEFAULT 0");
  if(!expCols.includes('tax_gst_rate')) db.exec("ALTER TABLE expenses ADD COLUMN tax_gst_rate REAL DEFAULT 0");
  if(!expCols.includes('tax_pst_rate')) db.exec("ALTER TABLE expenses ADD COLUMN tax_pst_rate REAL DEFAULT 0");
  if(!expCols.includes('tax_hst_rate')) db.exec("ALTER TABLE expenses ADD COLUMN tax_hst_rate REAL DEFAULT 0");
  // Payment log (tracks each payment for a PO)
  db.exec(`CREATE TABLE IF NOT EXISTS payment_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
  )`);

  // Indexes for performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_cust ON purchase_orders(customer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(order_status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_po_pay ON purchase_orders(payment_status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_exp_date ON expenses(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_exp_name ON expenses(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cust_cid ON customers(cust_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cust_type ON customers(type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cust_name ON customers(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mat_alert ON materials(quantity, alert_qty)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mat_name ON materials(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_matlog_mid ON material_log(material_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_paylog_po ON payment_log(po_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_glf_orderid ON glf_orders(glf_order_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cat_name ON catalog(name)');

  // ---- Legacy table support (keep old tables if they exist for migration) ----
  // We don't drop old tables, just create new ones alongside
}

// Auto-backup: keep last 5 backups
function autoBackup() {
  try {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `auto_${ts}.sqlite`);
    db.backup(dest).then(() => {
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_')).sort().reverse();
      files.slice(5).forEach(f => { try { fs.unlinkSync(path.join(backupDir, f)); } catch (e) { } });
    }).catch(() => {
      try { fs.copyFileSync(dbPath, dest); } catch (e) { }
    });
  } catch (e) { console.error('Auto-backup failed:', e); }
}

function isV4Schema() {
  // Check if DB has v4 schema by looking for v4-specific tables/columns
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    if (!tables.includes('catalog') || !tables.includes('material_db') || !tables.includes('po_items')) return false;
    const custCols = db.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
    if (!custCols.includes('cust_id') || !custCols.includes('type')) return false;
    return true;
  } catch (e) { return false; }
}

app.whenReady().then(() => {
  let needsFresh = false;

  try {
    if (fs.existsSync(dbPath)) {
      // Open existing DB and check if it's v4 schema
      db = new Database(dbPath);
      db.prepare("SELECT count(*) FROM sqlite_master").get();
      if (!isV4Schema()) {
        console.log('Legacy v3 DB detected. Backing up and creating fresh v4 DB...');
        db.close(); db = null;
        // Backup old DB
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(dbPath, path.join(backupDir, `v3_backup_${ts}.sqlite`));
        // Remove old DB + WAL/SHM
        fs.unlinkSync(dbPath);
        try { if(fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch(_){}
        try { if(fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch(_){}
        needsFresh = true;
      } else {
        db.close(); db = null;
      }
    }
    initDB();
    db.prepare("SELECT count(*) FROM sqlite_master").get();
    if (needsFresh) console.log('Fresh v4 DB created successfully.');
  } catch (e) {
    console.error('DB init error:', e.message);
    try { if(db) db.close(); } catch(_){}
    db = null;

    // Try removing WAL/SHM files
    try {
      if(fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if(fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      initDB();
      db.prepare("SELECT count(*) FROM sqlite_master").get();
      console.log('DB recovered by removing WAL/SHM files');
    } catch(e2) {
      console.error('DB corrupted, attempting recovery from backup...');
      try { if(db) db.close(); } catch(_){}
      db = null;
      if (fs.existsSync(backupDir)) {
        const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_') && !f.startsWith('v3_')).sort().reverse();
        for (const bf of backups) {
          try {
            const testDb = new Database(path.join(backupDir, bf), { readonly: true });
            testDb.prepare("SELECT count(*) FROM sqlite_master").get();
            testDb.close();
            fs.copyFileSync(path.join(backupDir, bf), dbPath);
            try { if(fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch(_){}
            try { if(fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch(_){}
            initDB();
            console.log('DB recovered from backup:', bf);
            break;
          } catch (e3) { continue; }
        }
      }
      // If still no db, create fresh
      if(!db) {
        console.log('Creating fresh database...');
        try { fs.unlinkSync(dbPath); } catch(_){}
        try { if(fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch(_){}
        try { if(fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch(_){}
        initDB();
      }
    }
  }

  win = new BrowserWindow({
    width: 1400, height: 900,
    title: '나만의 경영박사',
    icon: path.join(__dirname, '../src/icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, '../src/index.html'));

  autoBackup();
  setInterval(autoBackup, 30 * 60 * 1000);

  // Start GloriaFood auto-polling if enabled
  glfStartAutoPoll();

  // ---- Auto-Updater ----
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-available', { version: info.version, releaseNotes: info.releaseNotes || '' });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-progress', { percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    console.log('Auto-updater error:', err.message);
  });

  // Check for updates 5 seconds after launch
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 5000);
});

// DB query/run
ipcMain.handle('db-query', (e, sql, p = []) => {
  try { return { ok: true, data: db.prepare(sql).all(...p) }; }
  catch (err) { return { ok: false, error: err.message, data: [] }; }
});

ipcMain.handle('db-run', (e, sql, p = []) => {
  try {
    const info = db.prepare(sql).run(...p);
    return { ok: true, changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Backup/Restore
ipcMain.handle('backup-db', async () => {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const r = await dialog.showSaveDialog({ defaultPath: `경영박사_백업_${ts}.sqlite`, filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }] });
  if (!r.canceled && r.filePath) {
    try { await db.backup(r.filePath); return { ok: true, path: r.filePath }; }
    catch (e) { try { fs.copyFileSync(dbPath, r.filePath); return { ok: true, path: r.filePath }; } catch (e2) { return { ok: false, error: e2.message }; } }
  }
  return { ok: false };
});

ipcMain.handle('restore-db', async () => {
  const r = await dialog.showOpenDialog({ filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }], properties: ['openFile'] });
  if (!r.canceled && r.filePaths.length > 0) {
    try {
      const t = new Database(r.filePaths[0], { readonly: true }); t.prepare("SELECT count(*) FROM sqlite_master").get(); t.close();
      autoBackup();
      db.close(); fs.copyFileSync(r.filePaths[0], dbPath); initDB();
      return { ok: true };
    } catch (err) { try { initDB(); } catch (e) { } return { ok: false, error: 'Invalid file: ' + err.message }; }
  }
  return { ok: false };
});

// DB Info
ipcMain.handle('db-info', () => {
  try {
    const s = fs.statSync(dbPath);
    const cats = db.prepare("SELECT COUNT(*) as c FROM catalog").get().c;
    const custs = db.prepare("SELECT COUNT(*) as c FROM customers").get().c;
    const pos = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c;
    const mats = db.prepare("SELECT COUNT(*) as c FROM materials").get().c;
    const exps = db.prepare("SELECT COUNT(*) as c FROM expenses").get().c;
    let bkCount = 0, bkLatest = '-';
    if (fs.existsSync(backupDir)) {
      const bks = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_')).sort().reverse();
      bkCount = bks.length;
      if (bks.length > 0) bkLatest = bks[0].replace('auto_', '').replace('.sqlite', '').replace(/-/g, ':').slice(0, 16).replace('T', ' ');
    }
    return { ok: true, fileSize: s.size, path: dbPath, counts: { catalog: cats, customers: custs, orders: pos, materials: mats, expenses: exps }, backup: { count: bkCount, latest: bkLatest, dir: backupDir } };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Select folder for receipts
ipcMain.handle('select-folder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!r.canceled && r.filePaths.length > 0) return { ok: true, path: r.filePaths[0] };
  return { ok: false };
});

// Copy receipt file to receipt folder
ipcMain.handle('upload-receipt', async (e, destFolder, expName, expDate) => {
  const r = await dialog.showOpenDialog({ filters: [{ name: 'Images/PDF', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf'] }], properties: ['openFile', 'multiSelections'] });
  if (!r.canceled && r.filePaths.length > 0) {
    try {
      if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
      const safeName = (expName || 'receipt').replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_-]/g, '').replace(/\s+/g, '_').slice(0, 50);
      const dateStr = (expDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
      const results = [];
      for (const src of r.filePaths) {
        const ext = path.extname(src);
        let base = `${dateStr}_${safeName}`;
        let dest = path.join(destFolder, base + ext);
        let num = 1;
        while (fs.existsSync(dest)) {
          num++;
          dest = path.join(destFolder, `${base}(${num})${ext}`);
        }
        fs.copyFileSync(src, dest);
        results.push({ path: dest, filename: path.basename(dest) });
      }
      return { ok: true, files: results };
    } catch (err) { return { ok: false, error: err.message }; }
  }
  return { ok: false };
});

// Open file with default app
ipcMain.handle('open-file', async (e, filePath) => {
  try { await shell.openPath(filePath); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// Open folder
ipcMain.handle('open-folder', async (e, folderPath) => {
  try { await shell.openPath(folderPath); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// Generate Invoice PDF
ipcMain.handle('generate-invoice-pdf', async (e, htmlContent) => {
  // Create hidden window to render HTML then print to PDF
  const pdfWin = new BrowserWindow({ show: false, width: 800, height: 1100 });
  const tmpHtml = path.join(app.getPath('temp'), `invoice_${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, htmlContent, 'utf8');
  await pdfWin.loadFile(tmpHtml);
  // Wait for rendering
  await new Promise(r => setTimeout(r, 500));
  const pdfData = await pdfWin.webContents.printToPDF({
    printBackground: true,
    marginsType: 0,
    pageSize: 'Letter',
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
  });
  pdfWin.close();
  try { fs.unlinkSync(tmpHtml); } catch (e) { }

  const ts = new Date().toISOString().slice(0, 10);
  const r = await dialog.showSaveDialog({
    defaultPath: `Invoice_${ts}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!r.canceled && r.filePath) {
    fs.writeFileSync(r.filePath, pdfData);
    shell.openPath(r.filePath);
    return { ok: true, path: r.filePath };
  }
  return { ok: false };
});

// ============================================================
// GLORIAFOOD POLLING SYSTEM
// ============================================================
const { net } = require('electron');
let glfPolling = false;
let glfFailCount = 0;

function glfPoll() {
  return new Promise((resolve) => {
    if (glfPolling || !db) { resolve({ ok: false, error: 'Busy or no DB' }); return; }
    const ci = db.prepare("SELECT glf_api_key, glf_enabled FROM company_info WHERE id=1").get();
    if (!ci || !ci.glf_enabled || !ci.glf_api_key) { resolve({ ok: false, error: 'Not enabled or no API key' }); return; }
    glfPolling = true;

    const request = net.request({
      method: 'POST',
      url: 'https://pos.globalfoodsoft.com/pos/order/pop'
    });
    request.setHeader('Authorization', ci.glf_api_key);
    request.setHeader('Accept', 'application/json');
    request.setHeader('Glf-Api-Version', '2');

    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        glfPolling = false;
        if (response.statusCode !== 200) {
          glfFailCount++;
          resolve({ ok: false, error: `HTTP ${response.statusCode}: ${body.slice(0, 300)}` });
          return;
        }
        glfFailCount = 0; // reset on success
        try {
          if (!body.trim() || body.trim() === '[]') { resolve({ ok: true, newOrders: 0, updated: 0, cancelled: 0 }); return; }
          const data = JSON.parse(body);
          // API returns {count, orders:[]} OR direct array []
          const orderList = Array.isArray(data) ? data : (data.orders || []);
          if (!orderList || orderList.length === 0) { resolve({ ok: true, newOrders: 0, updated: 0, cancelled: 0 }); return; }
          let newCnt = 0, updCnt = 0, canCnt = 0;
          for (const order of orderList) {
            const result = processGlfOrder(order);
            if (result === 'new') newCnt++;
            else if (result === 'updated') updCnt++;
            else if (result === 'cancelled') canCnt++;
          }
          resolve({ ok: true, newOrders: newCnt, updated: updCnt, cancelled: canCnt });
        } catch (err) {
          console.error('GloriaFood parse error:', err.message, 'body:', body.slice(0, 200));
          resolve({ ok: false, error: 'Parse error: ' + err.message });
        }
      });
    });
    request.on('error', (err) => {
      glfPolling = false;
      glfFailCount++;
      console.error('GloriaFood poll error:', err.message);
      resolve({ ok: false, error: err.message });
    });
    request.end();
  });
}

// Auto-poll system with backoff
function glfStartAutoPoll() {
  glfStopAutoPoll();
  if (!db) return;
  const ci = db.prepare("SELECT glf_enabled, glf_poll_interval FROM company_info WHERE id=1").get();
  if (!ci || !ci.glf_enabled) return;
  const baseInterval = (ci.glf_poll_interval || 60) * 1000;
  glfFailCount = 0;
  console.log(`GloriaFood auto-poll started (every ${ci.glf_poll_interval || 60}s)`);

  async function doPoll() {
    const result = await glfPoll();
    if (result.ok && (result.newOrders > 0 || result.updated > 0 || result.cancelled > 0)) {
      // Desktop notification
      const parts = [];
      if (result.newOrders > 0) parts.push(`새 주문 ${result.newOrders}건`);
      if (result.updated > 0) parts.push(`업데이트 ${result.updated}건`);
      if (result.cancelled > 0) parts.push(`취소 ${result.cancelled}건`);
      const notif = new Notification({
        title: '🍕 GloriaFood 주문',
        body: parts.join(' / '),
        silent: false
      });
      notif.show();
      // Notify renderer to refresh
      if (win && !win.isDestroyed()) {
        win.webContents.send('glf-auto-poll-result', result);
      }
    }
    // Schedule next poll with backoff if failing
    const delay = glfFailCount === 0 ? baseInterval
      : Math.min(baseInterval * Math.pow(2, glfFailCount), 5 * 60 * 1000); // max 5min backoff
    if (glfFailCount > 0) console.log(`GloriaFood: ${glfFailCount} consecutive failures, next poll in ${Math.round(delay/1000)}s`);
    glfAutoTimer = setTimeout(doPoll, delay);
  }

  // First poll after base interval
  glfAutoTimer = setTimeout(doPoll, baseInterval);
}

function glfStopAutoPoll() {
  if (glfAutoTimer) { clearTimeout(glfAutoTimer); glfAutoTimer = null; glfFailCount = 0; console.log('GloriaFood auto-poll stopped'); }
}

function processGlfOrder(order) {
  const orderId = String(order.id || order.order_id || '');
  if (!orderId) return null;

  const clientName = [order.client_first_name || '', order.client_last_name || ''].join(' ').trim() || 'GloriaFood Customer';
  const clientPhone = order.client_phone || '';
  
  // Build address from client_address_parts if available, otherwise use client_address
  let clientAddr = '';
  const parts = order.client_address_parts;
  if (parts && typeof parts === 'object') {
    const addrParts = [];
    if (parts.street) addrParts.push(parts.street);
    if (parts.bloc) addrParts.push(`Bloc ${parts.bloc}`);
    if (parts.floor) addrParts.push(`Floor ${parts.floor}`);
    if (parts.apartment) addrParts.push(`Apt ${parts.apartment}`);
    if (parts.city) addrParts.push(parts.city);
    if (parts.zipcode) addrParts.push(parts.zipcode);
    // more_address often contains postal code or extra info — put at end
    if (parts.more_address) addrParts.push(parts.more_address);
    clientAddr = addrParts.join(', ');
  }
  if (!clientAddr) clientAddr = order.client_address || '';
  
  const orderType = order.type || 'pickup';
  const payment = order.payment || 'CASH';
  const totalPrice = parseFloat(order.total_price) || 0;
  const items = order.items || [];
  // Convert UTC timestamps to local date (YYYY-MM-DD)
  const toLocalDate = (utcStr) => {
    if (!utcStr) return '';
    try { return new Date(utcStr).toLocaleDateString('en-CA'); } catch(e) { return utcStr.slice(0,10); }
  };
  const orderDate = toLocalDate(order.accepted_at) || toLocalDate(order.updated_at) || new Date().toLocaleDateString('en-CA');
  const deliveryDate = toLocalDate(order.fulfill_at) || '';
  const orderStatus = order.status || 'accepted';
  const isCancelled = (orderStatus === 'canceled' || orderStatus === 'cancelled' || orderStatus === 'missed' || orderStatus === 'rejected'
    || order.rejected_reason || order.cancellation_status === 'cancelled');

  // Check if this order was already imported
  const existing = db.prepare("SELECT id,po_id,status FROM glf_orders WHERE glf_order_id=?").get(orderId);

  if (existing) {
    // === UPDATE existing order ===
    const poId = existing.po_id;
    
    // Skip if status hasn't changed
    if (existing.status === orderStatus || (existing.status === 'imported' && orderStatus === 'accepted')) {
      if (existing.status === orderStatus) return null;
    }

    if (isCancelled) {
      // Mark as cancelled — update PO order_status, note and glf_orders
      const po = db.prepare("SELECT note FROM purchase_orders WHERE id=?").get(poId);
      const cancelNote = (po?.note || '') + ' | ⛔ CANCELLED (' + new Date().toLocaleDateString('en-CA') + ' ' + new Date().toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'}) + ')';
      const txn = db.transaction(() => {
        db.prepare("UPDATE purchase_orders SET note=?,order_status='canceled',total=0,subtotal=0,discount=0 WHERE id=?").run(cancelNote, poId);
        db.prepare("DELETE FROM po_items WHERE po_id=?").run(poId);
        db.prepare("UPDATE glf_orders SET status='cancelled',raw_json=? WHERE id=?").run(JSON.stringify(order), existing.id);
      });
      txn();
      return 'cancelled';
    } else {
      // Update PO with new data
      const payMethod = (payment === 'ONLINE' || payment === 'CARD') ? 'E-transfer' : 'CASH';
      const noteArr = [];
      if (orderType) noteArr.push(`[GloriaFood ${orderType}]`);
      if (order.fulfill_at) noteArr.push(`Fulfill: ${order.fulfill_at.replace('T',' ').slice(0,16)}`);
      if (order.client_email) noteArr.push(`Email: ${order.client_email}`);
      if (order.instructions) noteArr.push(`Instructions: ${order.instructions}`);
      const note = noteArr.join(' | ');

      let subtotal = 0;
      const validItems = items.filter(it => it.type === 'item' || !it.type);
      for (const it of validItems) { subtotal += parseFloat(it.total_item_price || it.price || 0); }
      const discount = subtotal - totalPrice > 0 ? subtotal - totalPrice : 0;
      const total = totalPrice || subtotal;

      const txn = db.transaction(() => {
        db.prepare("UPDATE purchase_orders SET order_date=?,delivery_date=?,discount=?,payment_method=?,subtotal=?,total=?,note=?,order_status=?,delivery_address=? WHERE id=?")
          .run(orderDate, deliveryDate, discount, payMethod, subtotal, total, note, orderStatus, clientAddr, poId);

        // Replace PO items
        db.prepare("DELETE FROM po_items WHERE po_id=?").run(poId);
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

        db.prepare("UPDATE glf_orders SET status=?,total=?,raw_json=? WHERE id=?").run(orderStatus, total, JSON.stringify(order), existing.id);
      });
      txn();
      return 'updated';
    }
  }

  // === NEW order ===
  if (isCancelled) return null; // skip if first time seeing it and already cancelled

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
  const noteArr = [];
  if (orderType) noteArr.push(`[GloriaFood ${orderType}]`);
  if (order.fulfill_at) noteArr.push(`Fulfill: ${order.fulfill_at.replace('T',' ').slice(0,16)}`);
  if (order.client_email) noteArr.push(`Email: ${order.client_email}`);
  if (order.instructions) noteArr.push(`Instructions: ${order.instructions}`);
  const note = noteArr.join(' | ');

  let subtotal = 0;
  const validItems = items.filter(it => it.type === 'item' || !it.type);
  for (const it of validItems) { subtotal += parseFloat(it.total_item_price || it.price || 0); }
  const discount = subtotal - totalPrice > 0 ? subtotal - totalPrice : 0;
  const total = totalPrice || subtotal;

  const txnNew = db.transaction(() => {
    const poResult = db.prepare(
      "INSERT INTO purchase_orders (customer_id,order_date,delivery_date,discount,discount_type,payment_method,payment_status,subtotal,total,note,order_status,delivery_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).run(customer.id, orderDate, deliveryDate, discount, '$', payMethod, payMethod === 'CASH' ? 'Unpaid' : 'Paid', subtotal, total, note, orderStatus, clientAddr);
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

// IPC: Export Tax Report to XLSX
ipcMain.handle('export-tax-xlsx', async (e, data) => {
  const r = await dialog.showSaveDialog({ title: 'Export Tax Report', defaultPath: `Tax_Report_${data.year}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
  if (r.canceled) return { ok: false };
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Annual Summary
    const sumRows = [
      ['Tax Report — ' + data.year, '', '', ''],
      ['', '', '', ''],
      ['REVENUE (Before Tax)', '', '', ''],
      ['', 'CASH', 'E-Transfer', 'Total'],
      ['Subtotal', data.rev.cashSub, data.rev.etSub, data.rev.totalSub],
      ['GST', data.rev.cashGST, data.rev.etGST, data.rev.totalGST],
      ['PST', data.rev.cashPST, data.rev.etPST, data.rev.totalPST],
      ['HST', data.rev.cashHST, data.rev.etHST, data.rev.totalHST],
      ['Total Tax', data.rev.cashTax, data.rev.etTax, data.rev.totalTax],
      ['Revenue (After Tax)', data.rev.cashTotal, data.rev.etTotal, data.rev.grandTotal],
      ['', '', '', ''],
      ['EXPENSES (Before Tax)', '', '', ''],
      ['', '', '', 'Total'],
      ['Subtotal', '', '', data.exp.totalSub],
      ['GST', '', '', data.exp.totalGST],
      ['PST', '', '', data.exp.totalPST],
      ['HST', '', '', data.exp.totalHST],
      ['Total Tax', '', '', data.exp.totalTax],
      ['Expenses (After Tax)', '', '', data.exp.grandTotal],
      ['', '', '', ''],
      ['NET INCOME', '', '', ''],
      ['Revenue (After Tax) − Expenses (After Tax)', '', '', data.netIncome],
      ['', '', '', ''],
      ['TAX BALANCE', '', '', ''],
      ['HST Collected − HST Paid', '', '', data.taxBalance || (data.rev.totalHST - data.exp.totalHST)],
      ['', '', '', data.taxBalance >= 0 ? 'CRA에 납부' : 'CRA에서 환급'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(sumRows);
    ws1['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Annual Summary');

    // Sheet 2: HST Breakdown
    const hstRows = [['HST Breakdown — ' + data.year], [''], ['Rate', 'GST %', 'PST %', 'HST %', 'Revenue Tax', 'Expense Tax']];
    for (const r of data.hstBreakdown) hstRows.push([r.label, r.gstRate, r.pstRate, r.hstRate, r.revTax, r.expTax]);
    const ws2 = XLSX.utils.aoa_to_sheet(hstRows);
    ws2['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'HST Breakdown');

    // Sheet 3: Monthly Summary
    const moHead = ['Month', 'Rev (CASH)', 'Rev (E-Transfer)', 'Rev Subtotal', 'Rev GST', 'Rev PST', 'Rev HST', 'Rev Total', 'Orders', 'Exp Subtotal', 'Exp GST', 'Exp PST', 'Exp HST', 'Exp Total', 'Exp Count', 'Net Income'];
    const moRows = [['Monthly Summary — ' + data.year], [''], moHead];
    for (const m of data.monthly) moRows.push([m.month, m.revCash, m.revET, m.revSub, m.revGST, m.revPST, m.revHST, m.revTotal, m.orders, m.expSub, m.expGST, m.expPST, m.expHST, m.expTotal, m.expCnt, m.net]);
    moRows.push(['TOTAL', data.moTotal.revCash, data.moTotal.revET, data.moTotal.revSub, data.moTotal.revGST, data.moTotal.revPST, data.moTotal.revHST, data.moTotal.revTotal, data.moTotal.orders, data.moTotal.expSub, data.moTotal.expGST, data.moTotal.expPST, data.moTotal.expHST, data.moTotal.expTotal, data.moTotal.expCnt, data.moTotal.net]);
    const ws3 = XLSX.utils.aoa_to_sheet(moRows);
    ws3['!cols'] = moHead.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Detail');

    // Sheet 4: Expense by Category
    const catRows = [['Expense by Category (T2125) — ' + data.year], [''], ['Category', 'Subtotal', 'GST', 'PST', 'HST', 'Total (incl. Tax)', 'Count']];
    for (const c of data.expCats) catRows.push([c.cat, c.sub, c.gst, c.pst, c.hst, c.total, c.cnt]);
    catRows.push(['TOTAL', data.exp.totalSub, data.exp.totalGST, data.exp.totalPST, data.exp.totalHST, data.exp.grandTotal, data.exp.totalCnt]);
    const ws4 = XLSX.utils.aoa_to_sheet(catRows);
    ws4['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Expense by Category');

    XLSX.writeFile(wb, r.filePath);
    await shell.openPath(r.filePath);
    return { ok: true, path: r.filePath };
  } catch (err) { return { ok: false, error: err.message }; }
});

// IPC: manual poll trigger
ipcMain.handle('glf-poll-now', async () => {
  try {
    const result = await glfPoll();
    return result;
  } catch (e) { return { ok: false, error: e.message }; }
});

// IPC: restart auto-poll (called after Enable/Disable)
ipcMain.handle('glf-restart-autopoll', () => {
  glfStartAutoPoll();
  return { ok: true, running: !!glfAutoTimer };
});

ipcMain.handle('glf-stop-autopoll', () => {
  glfStopAutoPoll();
  return { ok: true };
});

// IPC: test connection — also saves any orders consumed by pop
ipcMain.handle('glf-test-connection', async (e, apiKey) => {
  return new Promise((resolve) => {
    const request = net.request({ method: 'POST', url: 'https://pos.globalfoodsoft.com/pos/order/pop' });
    request.setHeader('Authorization', apiKey);
    request.setHeader('Accept', 'application/json');
    request.setHeader('Glf-Api-Version', '2');
    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          resolve({ ok: false, status: response.statusCode, body: body.slice(0, 500) });
          return;
        }
        let savedCount = 0;
        try {
          const data = JSON.parse(body);
          const orderList = Array.isArray(data) ? data : (data.orders || []);
          if (orderList.length > 0) {
            for (const o of orderList) {
              const r = processGlfOrder(o);
              if (r) savedCount++;
            }
          }
        } catch (ex) { /* parse error — still connection OK */ }
        resolve({ ok: true, status: response.statusCode, body: body.slice(0, 500), savedOrders: savedCount });
      });
    });
    request.on('error', (err) => { resolve({ ok: false, error: err.message }); });
    request.end();
  });
});

// Fetch Menu from GloriaFood
ipcMain.handle('glf-fetch-menu', async (e, menuKey) => {
  return new Promise((resolve) => {
    const request = net.request({ method: 'GET', url: 'https://pos.globalfoodsoft.com/pos/menu' });
    request.setHeader('Authorization', menuKey);
    request.setHeader('Accept', 'application/json');
    request.setHeader('Glf-Api-Version', '2');
    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          resolve({ ok: false, error: 'HTTP ' + response.statusCode });
          return;
        }
        try {
          const menu = JSON.parse(body);
          // Extract all items from categories
          const items = [];
          const categories = menu.categories || (Array.isArray(menu) ? menu : []);
          for (const cat of categories) {
            const catName = cat.name || '';
            for (const item of (cat.items || [])) {
              items.push({
                glf_id: item.id,
                name: item.name || '',
                description: item.description || '',
                price: parseFloat(item.price) || 0,
                category: catName,
                tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
              });
            }
          }
          resolve({ ok: true, items, currency: menu.currency || '' });
        } catch (err) {
          resolve({ ok: false, error: 'Parse error: ' + err.message });
        }
      });
    });
    request.on('error', (err) => { resolve({ ok: false, error: err.message }); });
    request.end();
  });
});

// Sync menu items to catalog
ipcMain.handle('glf-sync-catalog', async (e, items) => {
  try {
    let added = 0, updated = 0, skipped = 0;
    for (const item of items) {
      const existing = db.prepare("SELECT id,price,note FROM catalog WHERE name=?").get(item.name);
      const note = [item.category, item.tags, item.description].filter(Boolean).join(' | ');
      if (existing) {
        // Update price and note
        if (existing.price !== item.price || (existing.note || '') !== note) {
          db.prepare("UPDATE catalog SET price=?,note=? WHERE id=?").run(item.price, note, existing.id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        db.prepare("INSERT INTO catalog (name,price,note) VALUES (?,?,?)").run(item.name, item.price, note);
        added++;
      }
    }
    return { ok: true, added, updated, skipped };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ============================================================
// GOOGLE MAPS API (Geocoding + Directions)
// ============================================================
ipcMain.handle('gmap-geocode', async (e, address) => {
  const ci = db.prepare("SELECT gmap_api_key FROM company_info WHERE id=1").get();
  if (!ci || !ci.gmap_api_key) return { ok: false, error: 'No Google Maps API key' };
  return new Promise((resolve) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${ci.gmap_api_key}`;
    const request = net.request(url);
    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.status === 'OK' && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            resolve({ ok: true, lat: loc.lat, lng: loc.lng, formatted: data.results[0].formatted_address });
          } else {
            resolve({ ok: false, error: data.status + ': ' + (data.error_message || 'No results') });
          }
        } catch (err) { resolve({ ok: false, error: err.message }); }
      });
    });
    request.on('error', (err) => { resolve({ ok: false, error: err.message }); });
    request.end();
  });
});

ipcMain.handle('gmap-directions', async (e, origin, destination, waypoints) => {
  const ci = db.prepare("SELECT gmap_api_key FROM company_info WHERE id=1").get();
  if (!ci || !ci.gmap_api_key) return { ok: false, error: 'No Google Maps API key' };
  return new Promise((resolve) => {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${ci.gmap_api_key}`;
    if (waypoints && waypoints.length > 0) {
      url += `&waypoints=optimize:true|${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }
    const request = net.request(url);
    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.status === 'OK' && data.routes.length > 0) {
            const route = data.routes[0];
            const legs = route.legs;
            let totalDist = 0, totalTime = 0;
            for (const leg of legs) { totalDist += leg.distance.value; totalTime += leg.duration.value; }
            resolve({
              ok: true,
              totalDistance: totalDist,
              totalDistanceText: (totalDist / 1000).toFixed(1) + ' km',
              totalDuration: totalTime,
              totalDurationText: Math.ceil(totalTime / 60) + ' min',
              waypointOrder: route.waypoint_order || [],
              legs: legs.map(l => ({ distance: l.distance.text, duration: l.duration.text, start: l.start_address, end: l.end_address }))
            });
          } else {
            resolve({ ok: false, error: data.status + ': ' + (data.error_message || 'No route') });
          }
        } catch (err) { resolve({ ok: false, error: err.message }); }
      });
    });
    request.on('error', (err) => { resolve({ ok: false, error: err.message }); });
    request.end();
  });
});

// ---- Auto-Update IPC ----
ipcMain.handle('update-download', () => {
  autoUpdater.downloadUpdate().catch(() => {});
  return { ok: true };
});

ipcMain.handle('update-install', () => {
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});

ipcMain.handle('get-app-version', () => {
  return { version: app.getVersion() };
});

app.on('window-all-closed', () => { if (db) db.close(); if (process.platform !== 'darwin') app.quit(); });
