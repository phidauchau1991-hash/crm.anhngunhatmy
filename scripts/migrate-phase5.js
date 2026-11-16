const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('=== [Phase 5] Connecting to DB:', dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const toPrismaIso = (val) => {
  if (val === null || val === undefined) return new Date().toISOString().replace('Z', '+00:00');
  if (typeof val === 'number') return new Date(val).toISOString().replace('Z', '+00:00');
  const s = String(val).trim();
  if (/^\d+$/.test(s)) return new Date(Number(s)).toISOString().replace('Z', '+00:00');
  return s;
};

const runMigration = db.transaction(() => {
  // 1. Create MonthlyAcademicReport table if missing
  db.prepare(`
    CREATE TABLE IF NOT EXISTS "MonthlyAcademicReport" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "studentId" TEXT NOT NULL,
      "classCode" TEXT NOT NULL,
      "monthYear" TEXT NOT NULL,
      "teacherKeywords" TEXT,
      "aiComment" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MonthlyAcademicReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MonthlyAcademicReport_classCode_fkey" FOREIGN KEY ("classCode") REFERENCES "Class" ("code") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();
  db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyAcademicReport_studentId_classCode_monthYear_key"
    ON "MonthlyAcademicReport"("studentId", "classCode", "monthYear")
  `).run();

  // 2. Reconcile Inventory opening balance so SUM(InventoryLog.quantity) === Inventory.currentStock
  const items = db.prepare('SELECT id, name, currentStock, unitCost, createdAt FROM Inventory').all();
  const sumStmt = db.prepare('SELECT COALESCE(SUM(quantity), 0) AS s FROM InventoryLog WHERE inventoryId = ?');
  const insInitLog = db.prepare(`
    INSERT INTO InventoryLog (receiptCode, type, inventoryId, quantity, unitCost, targetType, targetName, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let invReconciled = 0;
  for (const item of items) {
    const logSum = Number(sumStmt.get(item.id)?.s || 0);
    const diff = Number(item.currentStock || 0) - logSum;
    if (diff !== 0) {
      const type = diff > 0 ? 'NHAP_MOI' : 'KIEM_KE';
      const rc = `PK-INIT-${item.id}`;
      insInitLog.run(
        rc,
        type,
        item.id,
        diff,
        Number(item.unitCost || 0),
        'SYSTEM',
        'Hệ thống',
        `Đồng bộ tồn đầu kỳ cho khớp sổ kho thực tế (${logSum} -> ${item.currentStock})`,
        toPrismaIso(item.createdAt)
      );
      invReconciled++;
      console.log(`Reconciled Inventory ${item.id} (${item.name}): logSum ${logSum} -> currentStock ${item.currentStock} (diff ${diff > 0 ? '+' + diff : diff})`);
    }
  }
  console.log(`Inventory reconciliation finished: ${invReconciled} items aligned.`);

  // 3. Backfill PaymentLog for any ORD_ITEM_* orders without PaymentLog
  const itemOrders = db.prepare(`
    SELECT o.id, o.amountPaid, o.promoType, o.createdAt, o.updatedAt,
           COALESCE((SELECT SUM(p.amount) FROM PaymentLog p WHERE p.orderId = o.id), 0) AS loggedAmount
    FROM OrderFinance o
    WHERE o.id LIKE 'ORD_ITEM%' AND o.amountPaid > 0
  `).all();
  const insPayLog = db.prepare(`
    INSERT INTO PaymentLog (orderId, amount, paymentMethod, notes, createdAt, createdBy)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  let itemLogsAdded = 0;
  for (const o of itemOrders) {
    const diff = Number((o.amountPaid - o.loggedAmount).toFixed(2));
    if (diff > 0.01) {
      const promo = (o.promoType || '').toLowerCase();
      const method = promo.includes('tiền mặt') ? 'Tiền mặt' : (promo.includes('quẹt thẻ') ? 'Quẹt thẻ' : 'Chuyển khoản');
      insPayLog.run(o.id, diff, method, `Đồng bộ thu bán vật tư (${o.id})`, toPrismaIso(o.createdAt), 'SystemSync');
      itemLogsAdded++;
    }
  }
  console.log(`Inventory order PaymentLogs backfilled: ${itemLogsAdded} records.`);

  // 4. Recalculate Student.coursewareStudyMinutes & telemetry cleanly from StudySession
  const studentCols = db.prepare('PRAGMA table_info(Student)').all().map((c) => c.name);
  if (studentCols.includes('coursewareStudyMinutes')) {
    const sessionStats = db.prepare(`
      SELECT studentId,
             SUM(durationSeconds) AS totalSec,
             MIN(createdAt) AS firstAt,
             MAX(createdAt) AS lastAt
      FROM StudySession
      GROUP BY studentId
    `).all();

    const latestLessonStmt = db.prepare(`
      SELECT lessonTitle
      FROM StudySession
      WHERE studentId = ? AND lessonTitle IS NOT NULL AND lessonTitle != ''
      ORDER BY id DESC
      LIMIT 1
    `);

    const updStudent = db.prepare(`
      UPDATE Student
      SET coursewareStudyMinutes = ?,
          coursewareActivatedAt = COALESCE(coursewareActivatedAt, ?),
          coursewareLastActiveAt = COALESCE(?, coursewareLastActiveAt),
          coursewareCurrentProgress = CASE WHEN ? != '' THEN ? ELSE coursewareCurrentProgress END
      WHERE id = ?
    `);

    let syncedStudents = 0;
    for (const st of sessionStats) {
      const accurateMinutes = Math.round((st.totalSec || 0) / 60.0);
      const latestLesson = latestLessonStmt.get(st.studentId)?.lessonTitle || '';
      const res = updStudent.run(
        accurateMinutes,
        st.firstAt,
        st.lastAt,
        latestLesson,
        latestLesson,
        st.studentId
      );
      if (res.changes > 0) syncedStudents++;
    }
    console.log(`Courseware StudyMinutes synchronized from StudySession for ${syncedStudents} students.`);
  }
});

runMigration();
db.pragma('wal_checkpoint(PASSIVE)');
db.close();
console.log('=== [Phase 5] Migration & cleanup completed cleanly! ===');
