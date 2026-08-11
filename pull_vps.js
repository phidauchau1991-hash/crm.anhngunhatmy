const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log("Pulling code, migrating DB, and building...");
    const res = await ssh.execCommand('cd /var/www/nhat-my-crm && git pull origin main && npx prisma db push && npm run build && pm2 restart nhat-my-crm');
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
