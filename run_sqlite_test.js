const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  
  const script = `
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
`;
  
  fs.writeFileSync('test_sqlite_local.js', script);
  await ssh.putFile('test_sqlite_local.js', '/var/www/nhat-my-crm/test_sqlite.js');
  
  await ssh.execCommand('npm install sqlite3', { cwd: '/var/www/nhat-my-crm' });
  const res = await ssh.execCommand('node test_sqlite.js', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  process.exit(0);
}
run();
