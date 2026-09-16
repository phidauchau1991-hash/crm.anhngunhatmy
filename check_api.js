const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res = await ssh.execCommand('curl -s "http://localhost:3000/api/finance/monthly?monthYear=09/2026"');
  console.log(res.stdout.substring(0, 500));
  process.exit(0);
}
run();
