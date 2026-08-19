const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');
try {
  const rows = db.prepare('SELECT status, classCode FROM Enrollment').all();
  console.log("Success prisma/dev.db");
} catch(e) {
  console.error(e.message);
}
