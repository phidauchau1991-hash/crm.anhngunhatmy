const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  await ssh.putFile('d:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\vps_db_test.js', '/var/www/nhat-my-crm/vps_db_test.js');
  
  const res = await ssh.execCommand('node /var/www/nhat-my-crm/vps_db_test.js', { cwd: '/var/www/nhat-my-crm' });
  console.log('VPS DB Test Output:', res.stdout);
  if (res.stderr) console.log('VPS DB Test Error:', res.stderr);
  
  process.exit(0);
}
run();
