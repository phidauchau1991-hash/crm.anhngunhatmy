const { NodeSSH } = require('node-ssh');
const Database = require('better-sqlite3');
const ssh = new NodeSSH();

// 1. Local SQLite update
try {
  const localDb = new Database('dev.db');
  try {
    localDb.prepare('ALTER TABLE MonthlyInvoice ADD COLUMN previousDebtLocked BOOLEAN DEFAULT 0;').run();
    console.log('Added previousDebtLocked to local dev.db');
  } catch (e) {
    console.log('Local previousDebtLocked:', e.message);
  }
  try {
    localDb.prepare('ALTER TABLE MonthlyInvoice ADD COLUMN isLocked BOOLEAN DEFAULT 0;').run();
    console.log('Added isLocked to local dev.db');
  } catch (e) {
    console.log('Local isLocked:', e.message);
  }
} catch (e) {
  console.log('Local db error:', e.message);
}

// 2. VPS SQLite update
async function updateVps() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    console.log('Connected to VPS! Adding columns if not exist...');
    await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "ALTER TABLE MonthlyInvoice ADD COLUMN previousDebtLocked BOOLEAN DEFAULT 0;"');
    await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "ALTER TABLE MonthlyInvoice ADD COLUMN isLocked BOOLEAN DEFAULT 0;"');

    // Verify columns on VPS
    const info = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "PRAGMA table_info(MonthlyInvoice);"');
    console.log('VPS MonthlyInvoice table columns:\n', info.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('VPS update error:', err);
  }
}

updateVps();
