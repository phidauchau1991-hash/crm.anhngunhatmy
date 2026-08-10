const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res = await ssh.execCommand("curl -s -X POST -H 'Content-Type: application/json' -d '{\"username\":\"admin\", \"password\":\"NhatMy@2026\"}' http://localhost:3000/api/auth/login");
  console.log('STDOUT:', res.stdout);
  console.log('STDERR:', res.stderr);
  process.exit(0);
}
run();
