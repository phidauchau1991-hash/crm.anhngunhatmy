const Database = require('better-sqlite3');
const db = new Database('dev.db');
const rows = db.prepare('SELECT status, classCode FROM Enrollment').all();
console.log(rows);
