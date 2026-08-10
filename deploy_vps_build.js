const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    console.log('Connected to VPS.');

    // 1. Add Swap file if not exists
    console.log('Checking swap...');
    const swap = await ssh.execCommand('swapon --show');
    if (!swap.stdout) {
      console.log('Creating 2GB swap file...');
      await ssh.execCommand('fallocate -l 2G /swapfile');
      await ssh.execCommand('chmod 600 /swapfile');
      await ssh.execCommand('mkswap /swapfile');
      await ssh.execCommand('swapon /swapfile');
      console.log('Swap created.');
    } else {
      console.log('Swap already exists.');
    }

    // 2. Upload the single modified file
    console.log('Uploading route.js...');
    await ssh.putFile(
      'src/app/api/auth/login/route.js', 
      '/var/www/nhat-my-crm/src/app/api/auth/login/route.js'
    );
    
    // Upload dev.db just in case it got messed up
    console.log('Uploading dev.db...');
    await ssh.putFile('dev.db', '/var/www/nhat-my-crm/dev.db');

    // 3. Build on VPS
    console.log('Building on VPS...');
    const build = await ssh.execCommand('npm run build', { cwd: '/var/www/nhat-my-crm' });
    console.log('Build Output:', build.stdout);
    if (build.stderr) console.error('Build Error:', build.stderr);

    // 4. Restart PM2
    console.log('Restarting PM2...');
    await ssh.execCommand('pm2 restart nhat-my-crm');

    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
