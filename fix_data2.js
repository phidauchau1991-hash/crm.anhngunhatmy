const Database = require('better-sqlite3');
const db = new Database('dev.db');

try {
  // S1 cleanup and insert
  const s1Code = 'CN1_S1_MsMy_7CN_Ca4';
  const missingS1DateStr = '2026-07-26';
  const s1DateMillis = new Date(missingS1DateStr + 'T00:00:00Z').getTime();
  
  // Clean up
  db.prepare('DELETE FROM Attendance WHERE classCode = ? AND date = ?').run(s1Code, s1DateMillis);
  db.prepare('DELETE FROM AttendanceSummary WHERE classCode = ? AND date = ?').run(s1Code, s1DateMillis);
  
  // Insert S1
  const s1Teacher = db.prepare('SELECT teacherId FROM Class WHERE code = ?').get(s1Code);
  db.prepare(`
    INSERT INTO AttendanceSummary (classCode, date, teacherId, updatedAt) 
    VALUES (?, ?, ?, ?)
  `).run(s1Code, s1DateMillis, s1Teacher?.teacherId, new Date().getTime());
  
  const s1Students = db.prepare(`
    SELECT studentId
    FROM Enrollment
    WHERE classCode = ?
  `).all(s1Code);
  
  const insertAtt = db.prepare(`
    INSERT INTO Attendance (studentId, leadId, classCode, date, status, missingWb, missingVideo, copyError, updatedAt)
    VALUES (?, ?, ?, ?, 'Có mặt', 0, 0, 0, ?)
  `);
  
  let now = new Date().getTime();
  for (const st of s1Students) {
    insertAtt.run(st.studentId, null, s1Code, s1DateMillis, now);
  }
  console.log('Inserted missing session for S1: 26/07');
  
  // M3 cleanup and insert
  const m3Code = 'CN1_M3_MsMy_24_01';
  const missingM3DateStr = '2026-07-27';
  const m3DateMillis = new Date(missingM3DateStr + 'T00:00:00Z').getTime();
  
  db.prepare('DELETE FROM Attendance WHERE classCode = ? AND date = ?').run(m3Code, m3DateMillis);
  db.prepare('DELETE FROM AttendanceSummary WHERE classCode = ? AND date = ?').run(m3Code, m3DateMillis);

  const m3Teacher = db.prepare('SELECT teacherId FROM Class WHERE code = ?').get(m3Code);
  db.prepare(`
    INSERT INTO AttendanceSummary (classCode, date, teacherId, updatedAt) 
    VALUES (?, ?, ?, ?)
  `).run(m3Code, m3DateMillis, m3Teacher?.teacherId, new Date().getTime());
  
  const m3Students = db.prepare(`
    SELECT studentId
    FROM Enrollment
    WHERE classCode = ?
  `).all(m3Code);
  
  for (const st of m3Students) {
    insertAtt.run(st.studentId, null, m3Code, m3DateMillis, now);
  }
  console.log('Inserted missing session for M3: 27/07');
  
  console.log('Done!');
} catch(e) {
  console.error(e);
}
