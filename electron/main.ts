import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createRequire } from 'module';
import { db, initDb, dbPath, getDbDirectory } from '../src/db/index';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const _require = createRequire(import.meta.url);
const express = _require('express') as typeof import('express');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let server: any = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Bilbao POS',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function registerIpcHandlers() {
  ipcMain.handle('pos:list-printers', async () => {
    if (!mainWindow) return [];
    return await mainWindow.webContents.getPrintersAsync();
  });

  ipcMain.handle('pos:print-receipt', async (_event, args: { html: string; options?: any }) => {
    const { html, options } = args || {};

    if (typeof html !== 'string' || html.trim().length === 0) {
      return { success: false, error: 'Missing receipt HTML' };
    }

    // Create an offscreen window dedicated to printing.
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const printOptions = {
        silent: !!options?.silent,
        deviceName: options?.deviceName,
        copies: typeof options?.copies === 'number' ? options.copies : 1,
        printBackground: true,
      } as any;

      const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        // callback signature is (success, failureReason)
        printWindow.webContents.print(printOptions, (success, failureReason) => {
          if (!success) {
            resolve({ success: false, error: failureReason || 'Print failed' });
          } else {
            resolve({ success: true });
          }
        });
      });

      return result;
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    } finally {
      // Give the print spooler a brief moment if needed.
      setTimeout(() => {
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
      }, 250);
    }
  });
}

function startBackend() {
  const app = express();
  const PORT = 3000;
  server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '10mb' }));

  // Initialize DB
  initDb();

  const uploadsDir = path.join(getDbDirectory(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // WebSocket connections
  const clients = new Set<WebSocket>();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  const broadcastUpdate = (type: string, payload?: any) => {
    const message = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  };

  // --- API Routes ---

  // Categories
  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
  });

  app.post('/api/categories', (req, res) => {
    const { name } = req.body;
    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const info = stmt.run(name);
    broadcastUpdate('categories_updated');
    res.json({ id: info.lastInsertRowid, name });
  });

  app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    broadcastUpdate('categories_updated');
    res.json({ success: true });
  });

  // Menu Items
  app.get('/api/menu-items', (req, res) => {
    const items = db.prepare('SELECT * FROM menu_items').all();
    res.json(items);
  });

  app.post('/api/menu-items', (req, res) => {
    const { category_id, name, price, image_url } = req.body;
    const stmt = db.prepare('INSERT INTO menu_items (category_id, name, price, image_url) VALUES (?, ?, ?, ?)');
    const info = stmt.run(category_id, name, price, image_url);
    broadcastUpdate('menu_updated');
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/menu-items/:id', (req, res) => {
    const { id } = req.params;
    const { category_id, name, price, image_url } = req.body;
    const stmt = db.prepare('UPDATE menu_items SET category_id = ?, name = ?, price = ?, image_url = ? WHERE id = ?');
    stmt.run(category_id, name, price, image_url, id);
    broadcastUpdate('menu_updated');
    res.json({ success: true });
  });

  app.delete('/api/menu-items/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    broadcastUpdate('menu_updated');
    res.json({ success: true });
  });

  // Tables
  app.get('/api/tables', (req, res) => {
    const tables = db.prepare('SELECT * FROM tables').all();
    res.json(tables);
  });

  app.post('/api/tables', (req, res) => {
    const { name } = req.body;
    const stmt = db.prepare('INSERT INTO tables (name, status) VALUES (?, ?)');
    const info = stmt.run(name, 'available');
    broadcastUpdate('tables_updated');
    res.json({ id: info.lastInsertRowid, name, status: 'available' });
  });

  app.put('/api/tables/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id);
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  app.delete('/api/tables/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM tables WHERE id = ?').run(id);
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  // Orders
  app.get('/api/orders/active', (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE status != 'completed' AND status != 'cancelled'").all();
    const orderItems = db.prepare('SELECT * FROM order_items').all();
    
    const ordersWithItems = orders.map((o: any) => ({
      ...o,
      items: orderItems.filter((i: any) => i.order_id === o.id)
    }));
    res.json(ordersWithItems);
  });

  app.post('/api/orders', (req, res) => {
    const { table_id, items, total } = req.body;
    
    const insertOrder = db.transaction(() => {
      const orderStmt = db.prepare('INSERT INTO orders (table_id, status, total, created_at) VALUES (?, ?, ?, ?)');
      const orderInfo = orderStmt.run(table_id, 'pending', total, new Date().toISOString());
      const orderId = orderInfo.lastInsertRowid;

      const itemStmt = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(orderId, item.menu_item_id, item.quantity, item.price);
      }

      if (table_id) {
        db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(table_id);
      }
      
      return orderId;
    });

    const orderId = insertOrder();
    broadcastUpdate('orders_updated');
    broadcastUpdate('tables_updated');
    res.json({ id: orderId });
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, table_id } = req.body;
    
    db.transaction(() => {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
      if (status === 'completed' || status === 'cancelled') {
        if (table_id) {
          db.prepare("UPDATE tables SET status = 'available' WHERE id = ?").run(table_id);
        }
      }
    })();
    
    broadcastUpdate('orders_updated');
    broadcastUpdate('tables_updated');
    res.json({ success: true });
  });

  // Staff & Shifts
  app.get('/api/staff', (req, res) => {
    const staff = db.prepare('SELECT * FROM staff').all();
    res.json(staff);
  });

  app.post('/api/staff', (req, res) => {
    const { name, role, hourly_rate, pin } = req.body;
    const stmt = db.prepare('INSERT INTO staff (name, role, hourly_rate, pin) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, role, hourly_rate, pin || '0000');
    broadcastUpdate('staff_updated');
    res.json({ id: info.lastInsertRowid });
  });

  app.delete('/api/staff/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    broadcastUpdate('staff_updated');
    res.json({ success: true });
  });

  app.get('/api/shifts', (req, res) => {
    const shifts = db.prepare(`
      SELECT shifts.*, staff.name as staff_name, staff.hourly_rate 
      FROM shifts 
      JOIN staff ON shifts.staff_id = staff.id
      ORDER BY shifts.start_time DESC
    `).all();
    res.json(shifts);
  });

  app.post('/api/shifts/open', (req, res) => {
    const { staff_id } = req.body;
    const stmt = db.prepare('INSERT INTO shifts (staff_id, start_time) VALUES (?, ?)');
    const info = stmt.run(staff_id, new Date().toISOString());
    broadcastUpdate('shifts_updated');
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/shifts/:id/close', (req, res) => {
    const { id } = req.params;
    db.prepare('UPDATE shifts SET end_time = ? WHERE id = ?').run(new Date().toISOString(), id);
    broadcastUpdate('shifts_updated');
    res.json({ success: true });
  });

  // Reports
  app.get('/api/reports/revenue', (req, res) => {
    const { date } = req.query;
    let query = "SELECT * FROM orders WHERE status = 'completed'";
    let params: any[] = [];
    
    if (date) {
      query += ' AND date(created_at) = ?';
      params.push(date);
    }
    
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  });

  app.get('/api/reports/summary', (req, res) => {
    const { from, to } = req.query;
    let query = "SELECT id, total, created_at FROM orders WHERE status = 'completed'";
    const params: string[] = [];
    if (from) {
      query += ' AND date(created_at) >= ?';
      params.push(String(from));
    }
    if (to) {
      query += ' AND date(created_at) <= ?';
      params.push(String(to));
    }
    query += ' ORDER BY created_at ASC';
    const orders = db.prepare(query).all(...params) as { id: number; total: number; created_at: string }[];
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    res.json({
      from: from || null,
      to: to || null,
      totalRevenue,
      orderCount: orders.length,
      orders,
    });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  });

  app.put('/api/settings', (req, res) => {
    const body = req.body || {};
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    if (body.language != null) upsert.run('language', String(body.language));
    if (body.printer != null) upsert.run('printer', String(body.printer));
    if (body.logo_url != null) upsert.run('logo_url', String(body.logo_url));
    broadcastUpdate('settings_updated');
    res.json({ success: true });
  });

  app.put('/api/staff/:id/pin', (req, res) => {
    const { id } = req.params;
    const { pin } = req.body || {};
    if (pin == null || String(pin).length !== 4) {
      res.status(400).json({ error: 'PIN must be 4 digits' });
      return;
    }
    db.prepare('UPDATE staff SET pin = ? WHERE id = ?').run(String(pin), id);
    broadcastUpdate('staff_updated');
    res.json({ success: true });
  });

  // Upload (base64) - returns URL to access the file
  app.post('/api/upload', (req, res) => {
    const { base64, filename } = req.body || {};
    if (!base64) {
      res.status(400).json({ error: 'Missing base64' });
      return;
    }
    const ext = path.extname(filename || '') || '.png';
    const name = `upload_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, name);
    try {
      const buf = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buf);
      res.json({ url: `/api/uploads/${name}` });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Upload failed' });
    }
  });

  app.get('/api/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    if (!filename || filename.includes('..')) {
      res.status(400).end();
      return;
    }
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    res.sendFile(filePath);
  });

  // Backup - download raw SQLite database
  app.get('/api/backup', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="bilbao-backup.db"');
    const stream = fs.createReadStream(dbPath);
    stream.on('error', (err) => {
      console.error('Backup stream error', err);
      res.status(500).end('Failed to read database file');
    });
    stream.pipe(res);
  });

  // Simple CSV export of orders + items
  app.get('/api/export/orders.csv', (req, res) => {
    const orders = db.prepare('SELECT * FROM orders').all() as any[];
    const items = db.prepare('SELECT * FROM order_items').all() as any[];

    const rows: string[] = [];
    rows.push('order_id,table_id,status,total,created_at,items');

    for (const order of orders) {
      const orderItems = items.filter(i => i.order_id === order.id);
      const itemsSummary = orderItems
        .map(i => `${i.quantity}x${i.menu_item_id}`)
        .join('|')
        .replace(/"/g, '""');

      rows.push([
        order.id,
        order.table_id ?? '',
        order.status,
        order.total,
        order.created_at,
        `"${itemsSummary}"`,
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
    res.send(rows.join('\n'));
  });

  server.listen(PORT, 'localhost', () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});