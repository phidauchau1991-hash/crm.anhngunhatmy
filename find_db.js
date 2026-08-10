const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    const result = await ssh.execCommand('find / -name "dev.db*"');
    console.log(result.stdout);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
