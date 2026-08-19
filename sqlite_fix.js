const { execSync } = require('child_process');

try {
  // SQLite update command
  const query = "UPDATE Enrollment SET status = 'Đang học' WHERE status != 'Đang học'; UPDATE Student SET status = 'Đang học' WHERE status != 'Đang học';";
  
  execSync(`sqlite3 /var/www/nhat-my-crm/dev.db "${query}"`);
  console.log('Update successful!');
  
  const res = execSync(`sqlite3 /var/www/nhat-my-crm/dev.db "SELECT status, COUNT(1) FROM Enrollment GROUP BY status;"`);
  console.log('Enrollment status counts:', res.toString());
} catch (e) {
  console.error('Error:', e.message);
}
