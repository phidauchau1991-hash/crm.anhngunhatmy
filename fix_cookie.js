const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function fix() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  
  // Replace in login route
  await ssh.execCommand("sed -i 's/secure: process.env.NODE_ENV === \\x27production\\x27/secure: false/g' /var/www/nhat-my-crm/src/app/api/auth/login/route.js");
  
  // Rebuild
  console.log('Rebuilding...');
  const res = await ssh.execCommand('cd /var/www/nhat-my-crm && npm run build');
  console.log(res.stdout);
  console.log(res.stderr);
  await ssh.execCommand('pm2 restart nhat-my-crm');
  console.log('Done!');
  process.exit(0);
}
fix();
