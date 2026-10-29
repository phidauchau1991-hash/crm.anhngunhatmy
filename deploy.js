const { NodeSSH } = require('node-ssh');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log('1. Bắt đầu đóng gói mã nguồn (Git Bundle)...');
    
    // Create git commit if there are changes
    try {
      execSync('git add .');
      execSync('git commit -m "Auto deploy update"');
      console.log('Đã tạo commit mới.');
    } catch (e) {
      console.log('Không có thay đổi file nào mới, sử dụng commit hiện tại.');
    }
    
    // Create bundle
    if (fs.existsSync('deploy.bundle')) {
        fs.unlinkSync('deploy.bundle');
    }
    execSync('git bundle create deploy.bundle main');
    
    console.log('2. Đang kết nối đến máy chủ VPS...');
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP' // Mật khẩu của VPS
    });
    
    console.log('3. Đang tải mã nguồn lên máy chủ...');
    await ssh.putFile(
      path.join(__dirname, 'deploy.bundle'),
      '/root/deploy.bundle'
    );
    
    const command = `
      rm -rf /tmp/deploy_temp.git
      git clone --bare /root/deploy.bundle /tmp/deploy_temp.git
      cd /tmp/deploy_temp.git
      git push -f /var/repo/nhat-my-crm.git main:master
    `;
    
    const result = await ssh.execCommand(command);
    console.log('=== KẾT QUẢ TRIỂN KHAI ===');
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    console.log('3.1. Đang sao lưu CSDL an toàn trên VPS trước khi cập nhật...');
    const backupCmd = 'TIMESTAMP=$(date +"%Y%m%d_%H%M%S") && cp /var/www/nhat-my-crm/dev.db /var/www/nhat-my-crm/dev.db.backup_$TIMESTAMP && echo "Đã tạo bản sao lưu VPS: dev.db.backup_$TIMESTAMP"';
    const backupResult = await ssh.execCommand(backupCmd);
    console.log(backupResult.stdout);
    if (backupResult.stderr) console.error(backupResult.stderr);

    console.log('4. Đang đồng bộ cấu trúc bảng CSDL an toàn (Additive push)...');
    const dbPushResult = await ssh.execCommand('cd /var/www/nhat-my-crm && npx prisma generate && npx prisma db push');
    console.log(dbPushResult.stdout);
    if (dbPushResult.stderr) console.error(dbPushResult.stderr);

    console.log('5. Đang tải lại tiến trình PM2 nhat-my-crm...');
    await ssh.execCommand('pm2 reload nhat-my-crm');
    
    console.log('🚀 HOÀN TẤT! Hệ thống CRM đã được cập nhật thành công!');
    
  } catch (error) {
    console.error('❌ LỖI TRIỂN KHAI:', error.message);
  } finally {
    ssh.dispose();
  }
}

deploy();