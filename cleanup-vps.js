const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkDisk() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    console.log('Deleting .next/dev ...');
    let res = await ssh.execCommand('rm -rf /var/www/nhat-my-crm/.next/dev && rm -rf /var/www/crm-saas/.next/dev && df -h');
    console.log(res.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
checkDisk();
