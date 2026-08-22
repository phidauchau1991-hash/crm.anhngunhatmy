const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'});
  const res = await ssh.execCommand('pm2 describe nhat-my-crm | grep "exec cwd"');
  console.log(res.stdout);
  ssh.dispose();
}
run();
