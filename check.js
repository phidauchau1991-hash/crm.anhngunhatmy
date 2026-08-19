const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP'}).then(async () => {
  console.log("Fixing encoding in DB...");
  const updateQuery = `UPDATE Enrollment SET status = 'Đang học' WHERE status = 'Ä ang há» c';`;
  const res = await ssh.execCommand(`sqlite3 /var/www/nhat-my-crm/dev.db "${updateQuery}"`);
  console.log("Update output:", res.stdout, res.stderr);
  
  const res2 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT status, COUNT(1) FROM Enrollment GROUP BY status;"');
  console.log("Check after update:", res2.stdout);
  
  ssh.dispose();
});
