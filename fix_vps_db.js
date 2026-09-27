const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log("Fixing database on VPS...");
    const cmd = `cd /var/www/nhat-my-crm && node -e "const Database = require('better-sqlite3'); const db = new Database('dev.db'); const res = db.prepare(\\"UPDATE Student SET status = 'Đang học' WHERE status != 'Đang học' AND status LIKE '%ang h%'\\").run(); console.log('Fixed:', res.changes); db.close();"`;
    const res = await ssh.execCommand(cmd);
    
    console.log("STDOUT:", res.stdout);
    if(res.stderr) console.error("STDERR:", res.stderr);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
