const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('=== [Phase 4 Finance] Connecting to DB:', dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

const toPrismaIso = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return new Date(val).toISOString().replace('Z', '+00:00');
  }
  const s = String(val).trim();
  if (/^\d+$/.test(s)) {
    return new Date(Number(s)).toISOString().replace('Z', '+00:00');
  }
  return s;
};

const runMigration = db.transaction(() => {
  // 1. Add hourlyRate column to User if missing
  const userCols = db.prepare('PRAGMA table_info(User)').all().map((c) => c.name);
  if (!userCols.includes('hourlyRate')) {
    console.log('Adding column "hourlyRate" to User...');
    db.prepare('ALTER TABLE User ADD COLUMN hourlyRate REAL NOT NULL DEFAULT 200000').run();
  }

  // 2. Create MonthlyPaymentLog table if missing
  db.prepare(`
    CREATE TABLE IF NOT EXISTS "MonthlyPaymentLog" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "invoiceId" INTEGER NOT NULL,
      "amount" REAL NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "receiptCode" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdBy" TEXT,
      CONSTRAINT "MonthlyPaymentLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "MonthlyInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `).run();

  // 3. Normalize integer timestamps -> ISO string in AttendanceSummary & Attendance
  const intSummaries = db.prepare("SELECT id, classCode, date FROM AttendanceSummary WHERE typeof(date) = 'integer'").all();
  let sumConverted = 0;
  let sumDeduped = 0;
  const checkSumDup = db.prepare('SELECT id FROM AttendanceSummary WHERE classCode = ? AND date = ? AND id != ?');
  const updSumDate = db.prepare('UPDATE AttendanceSummary SET date = ? WHERE id = ?');
  const delSumDup = db.prepare('DELETE FROM AttendanceSummary WHERE id = ?');

  for (const row of intSummaries) {
    const iso = toPrismaIso(row.date);
    const existing = checkSumDup.get(row.classCode, iso, row.id);
    if (existing) {
      delSumDup.run(row.id);
      sumDeduped++;
    } else {
      updSumDate.run(iso, row.id);
      sumConverted++;
    }
  }
  console.log(`AttendanceSummary dates normalized: ${sumConverted} converted, ${sumDeduped} duplicates merged.`);

  const intAttendances = db.prepare("SELECT id, studentId, leadId, classCode, date FROM Attendance WHERE typeof(date) = 'integer'").all();
  let attConverted = 0;
  let attDeduped = 0;
  const checkAttStuDup = db.prepare('SELECT id FROM Attendance WHERE studentId = ? AND classCode = ? AND date = ? AND id != ?');
  const checkAttLeadDup = db.prepare('SELECT id FROM Attendance WHERE leadId = ? AND classCode = ? AND date = ? AND id != ?');
  const updAttDate = db.prepare('UPDATE Attendance SET date = ? WHERE id = ?');
  const delAttDup = db.prepare('DELETE FROM Attendance WHERE id = ?');

  for (const row of intAttendances) {
    const iso = toPrismaIso(row.date);
    let dup = null;
    if (row.studentId) dup = checkAttStuDup.get(row.studentId, row.classCode, iso, row.id);
    else if (row.leadId) dup = checkAttLeadDup.get(row.leadId, row.classCode, iso, row.id);
    if (dup) {
      delAttDup.run(row.id);
      attDeduped++;
    } else {
      updAttDate.run(iso, row.id);
      attConverted++;
    }
  }
  console.log(`Attendance dates normalized: ${attConverted} converted, ${attDeduped} duplicates merged.`);

  // 4. Fill missing Class.teacherId from matching User, then AttendanceSummary.teacherId from Class.teacherId
  const users = db.prepare('SELECT id, username, fullName, shortName FROM User').all();
  const findUserByName = (nameStr) => {
    if (!nameStr) return null;
    const norm = nameStr.trim().toLowerCase();
    return users.find(
      (u) =>
        (u.shortName && u.shortName.trim().toLowerCase() === norm) ||
        (u.fullName && u.fullName.trim().toLowerCase() === norm) ||
        (u.username && u.username.trim().toLowerCase() === norm)
    );
  };

  const classesNoTeacher = db.prepare('SELECT code, teacherName FROM Class WHERE teacherId IS NULL AND teacherName IS NOT NULL').all();
  let classTeacherFixed = 0;
  const updClassTeacher = db.prepare('UPDATE Class SET teacherId = ? WHERE code = ?');
  for (const cls of classesNoTeacher) {
    const u = findUserByName(cls.teacherName);
    if (u) {
      updClassTeacher.run(u.id, cls.code);
      classTeacherFixed++;
    }
  }

  const summaryTeacherRes = db.prepare(`
    UPDATE AttendanceSummary
    SET teacherId = (SELECT teacherId FROM Class WHERE Class.code = AttendanceSummary.classCode)
    WHERE teacherId IS NULL
      AND EXISTS (SELECT 1 FROM Class WHERE Class.code = AttendanceSummary.classCode AND Class.teacherId IS NOT NULL)
  `).run();
  console.log(`Teacher links repaired: ${classTeacherFixed} classes, ${summaryTeacherRes.changes} AttendanceSummary rows.`);

  // 5. Unify branchId ('CN1' or NULL -> 'CN1_BinhDuong') across core tables
  const branchTables = ['Student', 'Class', 'OrderFinance', 'Lead', 'Inventory'];
  for (const tbl of branchTables) {
    const res = db.prepare(`UPDATE "${tbl}" SET branchId = 'CN1_BinhDuong' WHERE branchId = 'CN1' OR branchId IS NULL OR branchId = ''`).run();
    if (res.changes > 0) {
      console.log(`Normalized branchId to CN1_BinhDuong in ${tbl}: ${res.changes} rows.`);
    }
  }

  // 6. Clean OrderFinance paymentStatus inconsistencies (e.g. ORD_UP_2608_011, ORD_UP_2608_014)
  const fixOrderZero = db.prepare("UPDATE OrderFinance SET paymentStatus = 'Đã đóng' WHERE feeToPay <= 0 AND paymentStatus != 'Đã đóng'").run();
  const fixOrderPaid = db.prepare("UPDATE OrderFinance SET paymentStatus = 'Đã đóng' WHERE feeToPay > 0 AND amountPaid >= feeToPay - 0.01 AND paymentStatus != 'Đã đóng'").run();
  const fixOrderPartial = db.prepare("UPDATE OrderFinance SET paymentStatus = 'Chưa đóng đủ' WHERE feeToPay > 0 AND amountPaid > 0 AND amountPaid < feeToPay - 0.01 AND paymentStatus != 'Chưa đóng đủ'").run();
  const fixOrderUnpaid = db.prepare("UPDATE OrderFinance SET paymentStatus = 'Chưa đóng' WHERE feeToPay > 0 AND amountPaid <= 0 AND paymentStatus != 'Chưa đóng'").run();
  console.log('OrderFinance status cleaned:', {
    zero: fixOrderZero.changes,
    paid: fixOrderPaid.changes,
    partial: fixOrderPartial.changes,
    unpaid: fixOrderUnpaid.changes,
  });

  // 7. Clean MonthlyInvoice status inconsistencies (e.g. #31 HV2609_013 with totalToPay = 0 marked UNPAID)
  const fixMonthlyZero = db.prepare("UPDATE MonthlyInvoice SET status = 'PAID' WHERE totalToPay <= 0 AND status != 'PAID'").run();
  const fixMonthlyPaid = db.prepare("UPDATE MonthlyInvoice SET status = 'PAID' WHERE totalToPay > 0 AND amountPaid >= totalToPay - 0.01 AND status != 'PAID'").run();
  const fixMonthlyPartial = db.prepare("UPDATE MonthlyInvoice SET status = 'PARTIAL' WHERE totalToPay > 0 AND amountPaid > 0 AND amountPaid < totalToPay - 0.01 AND status != 'PARTIAL'").run();
  console.log('MonthlyInvoice status cleaned:', {
    zero: fixMonthlyZero.changes,
    paid: fixMonthlyPaid.changes,
    partial: fixMonthlyPartial.changes,
  });

  // 8. Backfill missing PaymentLog entries so PaymentLog sum equals OrderFinance.amountPaid
  const missingOrders = db.prepare(`
    SELECT o.id, o.amountPaid, o.promoType, o.createdAt, o.updatedAt,
           COALESCE((SELECT SUM(p.amount) FROM PaymentLog p WHERE p.orderId = o.id), 0) AS loggedAmount
    FROM OrderFinance o
    WHERE o.amountPaid > 0
  `).all();

  const insPaymentLog = db.prepare(`
    INSERT INTO PaymentLog (orderId, amount, paymentMethod, notes, createdAt, createdBy)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let orderLogsAdded = 0;
  for (const o of missingOrders) {
    const diff = Number((o.amountPaid - o.loggedAmount).toFixed(2));
    if (diff > 0.01) {
      let method = 'Chuyển khoản';
      const promo = (o.promoType || '').toLowerCase();
      if (promo.includes('tiền mặt')) method = 'Tiền mặt';
      else if (promo.includes('quẹt thẻ') || promo.includes('pos')) method = 'Quẹt thẻ';
      const ts = toPrismaIso(o.createdAt) || toPrismaIso(o.updatedAt) || toPrismaIso(Date.now());
      insPaymentLog.run(o.id, diff, method, `Đồng bộ lịch sử thu từ hóa đơn ${o.id}`, ts, 'SystemSync');
      orderLogsAdded++;
    }
  }
  console.log(`PaymentLog backfilled: ${orderLogsAdded} records.`);

  // 9. Backfill missing MonthlyPaymentLog entries so MonthlyInvoice payments have cashflow history
  const missingMonthly = db.prepare(`
    SELECT m.id, m.studentId, m.monthYear, m.amountPaid, m.notes, m.createdAt, m.updatedAt,
           COALESCE((SELECT SUM(p.amount) FROM MonthlyPaymentLog p WHERE p.invoiceId = m.id), 0) AS loggedAmount
    FROM MonthlyInvoice m
    WHERE m.amountPaid > 0
  `).all();

  const insMonthlyLog = db.prepare(`
    INSERT INTO MonthlyPaymentLog (invoiceId, amount, paymentMethod, receiptCode, notes, createdAt, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let monthlyLogsAdded = 0;
  for (const m of missingMonthly) {
    const diff = Number((m.amountPaid - m.loggedAmount).toFixed(2));
    if (diff > 0.01) {
      let method = 'Chuyển khoản';
      const n = (m.notes || '').toLowerCase();
      if (n.includes('tiền mặt')) method = 'Tiền mặt';
      else if (n.includes('quẹt thẻ') || n.includes('pos')) method = 'Quẹt thẻ';
      const ts = toPrismaIso(m.updatedAt) || toPrismaIso(m.createdAt) || toPrismaIso(Date.now());
      const receiptCode = `PT-T${String(m.monthYear || '').replace(/[^0-9]/g, '')}-${m.id}`;
      insMonthlyLog.run(m.id, diff, method, receiptCode, `Đồng bộ lịch sử thu học phí tháng ${m.monthYear}`, ts, 'SystemSync');
      monthlyLogsAdded++;
    }
  }
  console.log(`MonthlyPaymentLog backfilled: ${monthlyLogsAdded} records.`);
});

runMigration();
db.pragma('wal_checkpoint(PASSIVE)');
db.close();
console.log('=== [Phase 4 Finance] Migration & data cleanup finished cleanly! ===');
