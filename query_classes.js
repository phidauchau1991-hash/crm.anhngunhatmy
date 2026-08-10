const Database = require('better-sqlite3');
const db = new Database('dev.db');

const classes = db.prepare(`SELECT * FROM Class`).all();
console.log(JSON.stringify(classes, null, 2));

db.close();
