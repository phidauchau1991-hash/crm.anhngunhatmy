const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    console.log('Connected to VPS. Downloading dev.db...');
    
    const localDbPath = path.join(__dirname, 'dev.db');
    
    // Backup local DB just in case
    if (fs.existsSync(localDbPath)) {
      fs.copyFileSync(localDbPath, localDbPath + '.backup');
    }
    
    // Download the DB from the VPS which has the latest changes (622KB file in root)
    await ssh.getFile(localDbPath, '/var/www/nhat-my-crm/dev.db');
    console.log('Successfully downloaded dev.db from VPS to local.');
    
    process.exit(0);
  } catch (e) {
    console.error('Error downloading DB:', e);
    process.exit(1);
  }
}
run();
