const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  await ssh.execCommand('echo \'DATABASE_URL="file:/var/www/nhat-my-crm/dev.db"\' > /var/www/nhat-my-crm/.env');
  await ssh.execCommand('pm2 restart nhat-my-crm');
  console.log('Fixed .env and restarted PM2.');
  process.exit(0);
}
run();
