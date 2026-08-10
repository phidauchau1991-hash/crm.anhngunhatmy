const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const config = {
  host: '103.165.144.154',
  username: 'root',
  password: '4jGbRF9eQRXybRJr3vQP'
};
const remoteDir = '/var/www/nhat-my-crm';

async function finishDeploy() {
  try {
    await ssh.connect(config);
    console.log('Connected!');

    // Since unzip returned 1 (warning), the files were actually extracted. 
    // BUT because of backslashes, the files might be extracted with wrong names (e.g. "src\app\page.js" instead of inside folder).
    // Let's check if the files have backslashes in their names.
    const lsResult = await ssh.execCommand(`ls -la ${remoteDir}`);
    console.log(lsResult.stdout);
    
    // If they have backslashes, we need to fix it. Wait, Compress-Archive on Windows creates zip with backslashes.
    // It's better to zip using node's 'jszip' or 'archiver' or just use 'tar' in WSL if available.
    // Since 'jszip' is already installed in package.json dependencies, let's use a quick node script to zip it!
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
finishDeploy();
