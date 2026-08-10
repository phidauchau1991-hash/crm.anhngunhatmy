
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/var/www/nhat-my-crm/dev.db');
db.get('SELECT count(*) as cnt FROM Student', (err, row) => {
  if (err) console.error(err);
  else console.log('Students in dev.db:', row.cnt);
  
  const db2 = new sqlite3.Database('/var/www/nhat-my-crm/prisma/dev.db');
  db2.get('SELECT count(*) as cnt FROM Student', (err2, row2) => {
    if (err2) console.error(err2);
    else console.log('Students in prisma/dev.db:', row2.cnt);
    db2.close();
  });

  db.close();
});
