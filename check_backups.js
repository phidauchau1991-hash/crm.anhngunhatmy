const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    console.log('Connected to VPS.');

    const result = await ssh.execCommand('ls -la /var/www/nhat-my-crm');
    console.log(result.stdout);
    
    const rootResult = await ssh.execCommand('find / -name "dev.db*" -mtime -2 2>/dev/null');
    console.log('Find results:', rootResult.stdout);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
