const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function uploadTar() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log('Uploading tar...');
    await ssh.putFile(
      'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\next_build.tar',
      '/var/www/nhat-my-crm/next_build.tar'
    );
    
    console.log('Extracting tar on server...');
    await ssh.execCommand('cd /var/www/nhat-my-crm && rm -rf .next && tar -xf next_build.tar');
    
    console.log('Restarting PM2...');
    await ssh.execCommand('pm2 start nhat-my-crm || pm2 restart nhat-my-crm');
    
    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
uploadTar();
