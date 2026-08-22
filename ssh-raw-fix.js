const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'});
  await ssh.putFile('raw-fix.js', '/var/www/nhat-my-crm/raw-fix.js');
  const res = await ssh.execCommand('node raw-fix.js', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  ssh.dispose();
}
run();
