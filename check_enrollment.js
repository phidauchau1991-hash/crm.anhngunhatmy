const db = require('better-sqlite3')('./dev.db');
const rows = db.prepare("SELECT id, studentId, classCode, billingType, status FROM Enrollment WHERE billingType != 'COURSE' AND billingType IS NOT NULL").all();
console.log(rows);
db.close();
