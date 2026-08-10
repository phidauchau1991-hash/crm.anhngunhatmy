const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function patchUpdate() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log('Uploading classes API route...');
    await ssh.putFile(
      'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\src\\app\\api\\classes\\route.js',
      '/var/www/nhat-my-crm/src/app/api/classes/route.js'
    );
    
    console.log('Uploading classes frontend page...');
    await ssh.putFile(
      'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\nhat-my-crm\\src\\app\\classes\\page.js',
      '/var/www/nhat-my-crm/src/app/classes/page.js'
    );
    
    console.log('Rebuilding app (this will take ~1 minute)...');
    const buildRes = await ssh.execCommand('cd /var/www/nhat-my-crm && npm run build');
    console.log(buildRes.stdout);
    if (buildRes.stderr) console.error(buildRes.stderr);
    
    console.log('Restarting PM2...');
    await ssh.execCommand('pm2 restart nhat-my-crm');
    
    console.log('Patch complete!');
    process.exit(0);
  } catch (e) {
    console.error('Error during patch:', e);
    process.exit(1);
  }
}
patchUpdate();
