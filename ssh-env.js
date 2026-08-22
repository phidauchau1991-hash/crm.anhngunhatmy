const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'});
  const res = await ssh.execCommand('cat .env', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout);
  ssh.dispose();
}
run();
