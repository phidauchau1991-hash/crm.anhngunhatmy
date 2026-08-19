const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối DB:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  db.all(`
    SELECT e.id, e.classCode, e.studentId 
    FROM Enrollment e 
    LEFT JOIN Class c ON e.classCode = c.code 
    WHERE c.code IS NULL;
  `, (err, rows) => {
    if (err) console.error(err.message);
    console.log('Orphan Enrollments:', rows);
  });
  
  db.all(`
    SELECT o.id, o.classCode, o.studentId 
    FROM OrderFinance o 
    LEFT JOIN Class c ON o.classCode = c.code 
    WHERE c.code IS NULL AND o.classCode != 'THU_GIAO_TRINH';
  `, (err, rows) => {
    if (err) console.error(err.message);
    console.log('Orphan Orders:', rows);
  });
});

db.close();
