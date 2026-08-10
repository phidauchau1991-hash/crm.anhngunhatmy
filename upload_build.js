const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function uploadBuild() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log('Uploading .next build folder...');
    await ssh.putDirectory(
      'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\.next',
      '/var/www/nhat-my-crm/.next',
      {
        recursive: true,
        concurrency: 10,
        validate: function(itemPath) {
          const baseName = require('path').basename(itemPath);
          return baseName !== 'cache'; // Skip cache folder to save time
        }
      }
    );
    
    console.log('Restarting PM2...');
    await ssh.execCommand('pm2 restart nhat-my-crm');
    
    console.log('Upload complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error during upload:', e);
    process.exit(1);
  }
}
uploadBuild();
