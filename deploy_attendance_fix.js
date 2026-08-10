const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    console.log('Connected to VPS.');

    // 1. Upload page.js
    console.log('Uploading page.js...');
    await ssh.putFile(
      'src/app/attendance/page.js', 
      '/var/www/nhat-my-crm/src/app/attendance/page.js'
    );
    
    // 2. Upload SQLite dev.db
    console.log('Uploading dev.db...');
    await ssh.putFile(
      'dev.db',
      '/var/www/nhat-my-crm/dev.db'
    );
    
    // 3. Build on VPS
    console.log('Stopping PM2 to free RAM...');
    await ssh.execCommand('pm2 stop all');
    
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
