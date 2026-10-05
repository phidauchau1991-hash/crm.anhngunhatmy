import prisma from '@/lib/db';

// Bảng riêng, tự tạo nếu chưa có (không ảnh hưởng bất kỳ bảng dữ liệu nào khác)
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS AlertDismissal (alertKey TEXT PRIMARY KEY, dismissedAt DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
  tableReady = true;
}

// Lấy tập hợp các khóa cảnh báo đã được đánh dấu "Đã xử lý"
export async function getDismissedKeys() {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe('SELECT alertKey FROM AlertDismissal');
    return new Set(rows.map((r) => r.alertKey));
  } catch (e) {
    console.error('Lỗi đọc AlertDismissal:', e);
    return new Set();
  }
}

// Đánh dấu một hoặc nhiều cảnh báo là "Đã xử lý"
export async function dismissKeys(keys) {
  await ensureTable();
  for (const k of keys) {
    await prisma.$executeRawUnsafe('INSERT OR IGNORE INTO AlertDismissal (alertKey) VALUES (?)', String(k));
  }
}
