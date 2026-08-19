const Database = require('better-sqlite3');
const db = new Database('dev.db');
const rows = db.prepare('SELECT code, schedule, startDate FROM Class').all();
console.log(rows);
