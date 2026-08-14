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
      git push /var/repo/nhat-my-crm.git main:master
    `;
    
    const result = await ssh.execCommand(command);
    console.log('=== KẾT QUẢ TRIỂN KHAI ===');
    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    
    console.log('🚀 HOÀN TẤT! Hệ thống CRM đã được cập nhật thành công!');
    
  } catch (error) {
    console.error('❌ LỖI TRIỂN KHAI:', error.message);
  } finally {
    ssh.dispose();
  }
}

deploy();