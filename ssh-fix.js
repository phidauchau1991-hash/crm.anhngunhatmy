const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'});
  console.log('Connected');
  
  await ssh.putFile('remote-fix.js', '/var/www/nhat-my-crm/remote-fix.js');
  console.log('File uploaded');
  
  const res = await ssh.execCommand('npx tsx remote-fix.js', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  
  ssh.dispose();
}
run();
