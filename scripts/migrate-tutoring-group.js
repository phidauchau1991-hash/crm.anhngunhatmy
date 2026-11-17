const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new Database(dbPath);

try {
  const cols = db.prepare('PRAGMA table_info("TutoringPlan")').all();
  const hasGroupCode = cols.some((c) => c.name === 'groupCode');

  if (!hasGroupCode) {
    db.exec('ALTER TABLE "TutoringPlan" ADD COLUMN "groupCode" TEXT;');
    console.log('Added column TutoringPlan.groupCode');
  } else {
    console.log('Column TutoringPlan.groupCode already exists');
  }

  db.exec('CREATE INDEX IF NOT EXISTS "TutoringPlan_groupCode_idx" ON "TutoringPlan"("groupCode");');
  console.log('Ensured index TutoringPlan_groupCode_idx');

  try {
    db.pragma('wal_checkpoint(PASSIVE)');
  } catch (_) {}
} finally {
  db.close();
}
