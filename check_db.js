const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res2 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/prisma/dev.db "SELECT count(*) FROM Student;"');
  console.log('Students in prisma/dev.db:', res2.stdout);
  
  const res3 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT count(*) FROM Student;"');
  console.log('Students in dev.db:', res3.stdout);
  
  // also check env
  const res4 = await ssh.execCommand('cat /var/www/nhat-my-crm/.env');
  console.log('ENV:', res4.stdout);

  process.exit(0);
}
run();
