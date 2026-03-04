import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export function getDbDirectory() {
  const isElectron = !!process.versions?.electron;

  if (!isElectron) {
    return process.cwd();
  }

  // For Electron (dev + packaged), store DB in a per-user writable folder
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || process.cwd(), 'Library', 'Application Support')
      : path.join(process.env.HOME || process.cwd(), 'AppData', 'Roaming'));

  const dir = path.join(appData, 'Bilbao POS');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export const dbPath = path.join(getDbDirectory(), 'bilbao.db');
export const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' -- available, occupied
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
      total REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      pin TEXT DEFAULT '0000'
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const staffColumns = db.prepare('PRAGMA table_info(staff)').all() as any[];
  if (!staffColumns.find(c => c.name === 'pin')) {
    db.exec("ALTER TABLE staff ADD COLUMN pin TEXT DEFAULT '0000'");
  }

  const orderColumns = db.prepare('PRAGMA table_info(orders)').all() as any[];
  if (!orderColumns.find(c => c.name === 'staff_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL');
  }

  // Seed initial data if empty
  const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoriesCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const coffeeId = insertCategory.run('Coffee').lastInsertRowid;
    const pastryId = insertCategory.run('Pastries').lastInsertRowid;

    const insertMenuItem = db.prepare('INSERT INTO menu_items (category_id, name, price, image_url) VALUES (?, ?, ?, ?)');
    insertMenuItem.run(coffeeId, 'Espresso', 2.50, 'https://picsum.photos/seed/espresso/200/200');
    insertMenuItem.run(coffeeId, 'Latte', 4.00, 'https://picsum.photos/seed/latte/200/200');
    insertMenuItem.run(coffeeId, 'Cappuccino', 4.50, 'https://picsum.photos/seed/cappuccino/200/200');
    insertMenuItem.run(pastryId, 'Croissant', 3.00, 'https://picsum.photos/seed/croissant/200/200');
    insertMenuItem.run(pastryId, 'Muffin', 3.50, 'https://picsum.photos/seed/muffin/200/200');

    const insertTable = db.prepare('INSERT INTO tables (name, status) VALUES (?, ?)');
    insertTable.run('Table 1', 'available');
    insertTable.run('Table 2', 'available');
    insertTable.run('Table 3', 'available');
    insertTable.run('Table 4', 'available');
    insertTable.run('Table 5', 'available');
    insertTable.run('Table 6', 'available');

    const insertStaff = db.prepare('INSERT INTO staff (name, role, hourly_rate, pin) VALUES (?, ?, ?, ?)');
    insertStaff.run('Alice', 'Manager', 25.00, '1234');
    insertStaff.run('Bob', 'Barista', 18.00, '5678');
    insertStaff.run('Charlie', 'Barista', 18.00, '9012');
  }
}
