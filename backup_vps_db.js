const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function backup() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupCmd = `cp /var/www/nhat-my-crm/dev.db /var/www/nhat-my-crm/dev.db.bak_${timestamp}`;
    console.log('Running backup on VPS:', backupCmd);
    const res = await ssh.execCommand(backupCmd);
    console.log('Backup result:', res.stdout || 'OK');
    if (res.stderr) console.error('Backup error:', res.stderr);

    // Verify backup file exists
    const check = await ssh.execCommand(`ls -lh /var/www/nhat-my-crm/dev.db.bak_${timestamp}`);
    console.log('Backup file verification:', check.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

backup();
