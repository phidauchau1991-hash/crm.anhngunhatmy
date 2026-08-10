const Database = require('better-sqlite3');
const db = new Database('dev.db');

try {
  // --- 1. S1 missing 26/07 ---
  const s1Code = 'CN1_S1_MsMy_7CN_Ca4';
  const missingS1DateStr = '2026-07-26';
  
  const s1Exists = db.prepare(`SELECT id FROM AttendanceSummary WHERE classCode = ? AND strftime('%Y-%m-%d', date/1000, 'unixepoch') = ?`).get(s1Code, missingS1DateStr);
  
  if (!s1Exists) {
    const s1Teacher = db.prepare('SELECT teacherId FROM Class WHERE code = ?').get(s1Code);
    
    // Insert into AttendanceSummary
    db.prepare(`
      INSERT INTO AttendanceSummary (classCode, date, teacherId, updatedAt) 
      VALUES (?, ?, ?, ?)
    `).run(s1Code, new Date(missingS1DateStr + 'T00:00:00Z').getTime(), s1Teacher?.teacherId, new Date().getTime());
    
    // Insert into Attendance for all students in S1
    const s1Students = db.prepare('SELECT studentId, leadId FROM Enrollment WHERE classCode = ?').all(s1Code);
    
    const insertS1Att = db.prepare(`
      INSERT INTO Attendance (studentId, leadId, classCode, date, status, missingWb, missingVideo, copyError, updatedAt)
      VALUES (?, ?, ?, ?, 'Có mặt', 0, 0, 0, ?)
    `);
    
    const now = new Date().getTime();
    for (const st of s1Students) {
      insertS1Att.run(st.studentId, st.leadId, s1Code, new Date(missingS1DateStr + 'T00:00:00Z').getTime(), now);
    }
    console.log('Inserted missing session for S1: 26/07');
  }

  // --- 2. Fix M2 end date to 20/08 ---
  const m2Class = db.prepare("SELECT code FROM Class WHERE code LIKE 'CN1_M2_%'").get();
  if (m2Class) {
    db.prepare('UPDATE Class SET expectedEndDate = ? WHERE code = ?').run(new Date('2026-08-20T00:00:00Z').getTime(), m2Class.code);
    console.log('Updated M2 Class end date to 20/08/2026');
  }

  // --- 3. M3 missing 27/07 ---
  const m3Code = 'CN1_M3_MsMy_24_01';
  const missingM3DateStr = '2026-07-27';
  
  const m3Exists = db.prepare(`SELECT id FROM AttendanceSummary WHERE classCode = ? AND strftime('%Y-%m-%d', date/1000, 'unixepoch') = ?`).get(m3Code, missingM3DateStr);
  
  if (!m3Exists) {
    const m3Teacher = db.prepare('SELECT teacherId FROM Class WHERE code = ?').get(m3Code);
    
    db.prepare(`
      INSERT INTO AttendanceSummary (classCode, date, teacherId, updatedAt) 
      VALUES (?, ?, ?, ?)
    `).run(m3Code, new Date(missingM3DateStr + 'T00:00:00Z').getTime(), m3Teacher?.teacherId, new Date().getTime());
    
    const m3Students = db.prepare('SELECT studentId, leadId FROM Enrollment WHERE classCode = ?').all(m3Code);
    
    const insertM3Att = db.prepare(`
      INSERT INTO Attendance (studentId, leadId, classCode, date, status, missingWb, missingVideo, copyError, updatedAt)
      VALUES (?, ?, ?, ?, 'Có mặt', 0, 0, 0, ?)
    `);
    
    const now = new Date().getTime();
    for (const st of m3Students) {
      insertM3Att.run(st.studentId, st.leadId, m3Code, new Date(missingM3DateStr + 'T00:00:00Z').getTime(), now);
    }
    console.log('Inserted missing session for M3: 27/07');
  }

  console.log('Done!');
} catch (e) {
  console.error(e);
}
