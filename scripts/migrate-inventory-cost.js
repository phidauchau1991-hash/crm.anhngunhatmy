const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// 1. Migrate Inventory columns
const invCols = db.prepare('PRAGMA table_info(Inventory)').all().map(c => c.name);

if (!invCols.includes('unit')) {
  console.log('Adding column "unit" to Inventory...');
  db.prepare("ALTER TABLE Inventory ADD COLUMN unit TEXT NOT NULL DEFAULT 'Cái'").run();
}
if (!invCols.includes('unitCost')) {
  console.log('Adding column "unitCost" to Inventory...');
  db.prepare("ALTER TABLE Inventory ADD COLUMN unitCost REAL NOT NULL DEFAULT 0").run();
}
if (!invCols.includes('unitPrice')) {
  console.log('Adding column "unitPrice" to Inventory...');
  db.prepare("ALTER TABLE Inventory ADD COLUMN unitPrice REAL NOT NULL DEFAULT 0").run();
}

// 2. Migrate InventoryLog columns
const logCols = db.prepare('PRAGMA table_info(InventoryLog)').all().map(c => c.name);

if (!logCols.includes('unitCost')) {
  console.log('Adding column "unitCost" to InventoryLog...');
  db.prepare("ALTER TABLE InventoryLog ADD COLUMN unitCost REAL NOT NULL DEFAULT 0").run();
}
if (!logCols.includes('campaignName')) {
  console.log('Adding column "campaignName" to InventoryLog...');
  db.prepare("ALTER TABLE InventoryLog ADD COLUMN campaignName TEXT").run();
}

// 3. Set standard initial unitCost / unitPrice for existing inventory if 0
const initialDefaults = [
  { match: 'Áo thun', unit: 'Cái', cost: 65000, price: 120000 },
  { match: 'Balo', unit: 'Cái', cost: 85000, price: 150000 },
  { match: 'Túi xách', unit: 'Cái', cost: 55000, price: 95000 },
  { match: 'Bình nước', unit: 'Cái', cost: 35000, price: 65000 },
  { match: 'Nón', unit: 'Cái', cost: 30000, price: 50000 },
  { match: 'Gấu bông', unit: 'Con', cost: 45000, price: 80000 },
  { match: 'Bút', unit: 'Cây', cost: 5000, price: 10000 },
  { match: 'Sổ', unit: 'Cuốn', cost: 25000, price: 45000 },
  { match: 'Giáo trình', unit: 'Bộ', cost: 120000, price: 200000 },
];

const allItems = db.prepare('SELECT id, name, category, unitCost, unitPrice FROM Inventory').all();
for (const item of allItems) {
  let cost = item.unitCost;
  let price = item.unitPrice;
  let unit = 'Cái';

  const matched = initialDefaults.find(d => item.name.toLowerCase().includes(d.match.toLowerCase()));
  if (matched) {
    if (cost === 0) cost = matched.cost;
    if (price === 0) price = matched.price;
    unit = matched.unit;
  } else if (item.category === 'Giáo trình') {
    if (cost === 0) cost = 120000;
    if (price === 0) price = 200000;
    unit = 'Bộ';
  } else if (cost === 0) {
    cost = 50000;
    price = 80000;
  }

  db.prepare('UPDATE Inventory SET unit = ?, unitCost = ?, unitPrice = ? WHERE id = ?').run(unit, cost, price, item.id);
  console.log(`Updated Inventory [${item.id}] ${item.name}: unitCost=${cost.toLocaleString()}đ, unitPrice=${price.toLocaleString()}đ, unit=${unit}`);
}

// 4. Backfill unitCost and campaignName for logs
const itemsMap = new Map(db.prepare('SELECT id, unitCost FROM Inventory').all().map(i => [i.id, i.unitCost]));

const zeroLogs = db.prepare("SELECT id, inventoryId, type, notes FROM InventoryLog WHERE unitCost = 0 OR unitCost IS NULL").all();
for (const l of zeroLogs) {
  const cost = itemsMap.get(l.inventoryId) || 0;
  db.prepare('UPDATE InventoryLog SET unitCost = ? WHERE id = ?').run(cost, l.id);
}
console.log(`Backfilled unitCost for ${zeroLogs.length} logs.`);

// Backfill campaignName for XUAT_TANG if null
const nullCampaignLogs = db.prepare("SELECT id, notes FROM InventoryLog WHERE type = 'XUAT_TANG' AND (campaignName IS NULL OR campaignName = '')").all();
for (const l of nullCampaignLogs) {
  let cName = 'Chiến dịch Ghi danh / Tri ân';
  if (l.notes) {
    if (l.notes.includes('Tặng kèm khi nhập học')) cName = 'Quà tặng Nhập học Khóa mới';
    else if (l.notes.includes('AE học chung')) cName = 'Ưu đãi Anh/Chị em cùng học';
    else if (l.notes.includes('thu học phí')) cName = 'Tặng phẩm Đi kèm Thu học phí';
  }
  db.prepare('UPDATE InventoryLog SET campaignName = ? WHERE id = ?').run(cName, l.id);
}
console.log(`Backfilled campaignName for ${nullCampaignLogs.length} XUAT_TANG logs.`);

console.log('Migration completed successfully!');
