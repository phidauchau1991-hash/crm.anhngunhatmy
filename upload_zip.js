const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function uploadZip() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log('Uploading zip...');
    await ssh.putFile(
      'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\next_build.zip',
      '/var/www/nhat-my-crm/next_build.zip'
    );
    
    console.log('Unzipping...');
    // Clear old .next and unzip new one
    await ssh.execCommand('cd /var/www/nhat-my-crm && rm -rf .next && unzip -q next_build.zip');
    
    // Fix backslashes in path just in case Compress-Archive messed them up
    // But since we zipped the `.next` directory directly, it should just extract `.next/server/...`
    // Actually, Compress-Archive sometimes puts a backslash in the paths. Let's fix that.
    await ssh.execCommand(`cd /var/www/nhat-my-crm && find .next -depth -name '*\\\\*' -execdir bash -c 'mv "$1" "\${1//\\\\//}"' _ {} \\;`);

    console.log('Restarting PM2...');
    await ssh.execCommand('pm2 start nhat-my-crm || pm2 restart nhat-my-crm');
    
    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
uploadZip();
