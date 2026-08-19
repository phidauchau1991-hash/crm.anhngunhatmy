const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'}).then(async () => {
  await ssh.putFile(path.join(__dirname, 'check_null_class.js'), '/var/www/nhat-my-crm/check_null_class.js');
  const res = await ssh.execCommand('node check_null_class.js', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout, res.stderr);
  ssh.dispose();
});
