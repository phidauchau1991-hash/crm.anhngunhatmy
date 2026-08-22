const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'});
  console.log('Connected');
  
  const res = await ssh.execCommand('curl http://localhost:3000/api/fix-encoding');
  console.log('CURL OUTPUT:');
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  
  ssh.dispose();
}
run();
