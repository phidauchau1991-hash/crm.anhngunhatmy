const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('dev.db');

async function updatePasswords() {
  const pAdmin = await bcrypt.hash('NhatMy@2026', 10);
  const pMy = await bcrypt.hash('trucmy@030791', 10);
  const pDau = await bcrypt.hash('phidau@220891', 10);

  const stmt = db.prepare('UPDATE User SET password = ? WHERE username = ?');
  
  stmt.run(pAdmin, 'admin', function(err) {
    if (err) console.error(err);
    else console.log('Updated admin, rows changed:', this.changes);
  });
  
  stmt.run(pMy, 'gv. Ms My', function(err) {
    if (err) console.error(err);
    else console.log('Updated Ms My, rows changed:', this.changes);
  });
  
  stmt.run(pDau, 'nv. Mr Đấu', function(err) {
    if (err) console.error(err);
    else console.log('Updated Mr Dau, rows changed:', this.changes);
  });
  
  stmt.finalize(() => {
    db.close();
  });
}

updatePasswords();
