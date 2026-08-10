const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

const nginxConfig = `
server {
    listen 80;
    server_name crm.anhngunhatmy.edu.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

async function run() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    console.log('Connected to VPS.');

    console.log('Installing Nginx and Certbot...');
    await ssh.execCommand('apt-get update && apt-get install -y nginx certbot python3-certbot-nginx');

    console.log('Configuring Nginx...');
    const remoteConfigPath = '/etc/nginx/sites-available/crm.anhngunhatmy.edu.vn';
    await ssh.execCommand(`echo "${nginxConfig.replace(/\$/g, '\\$')}" > ${remoteConfigPath}`);
    await ssh.execCommand(`ln -sf ${remoteConfigPath} /etc/nginx/sites-enabled/`);
    
    // Remove default nginx config if exists
    await ssh.execCommand('rm -f /etc/nginx/sites-enabled/default');

    console.log('Testing Nginx config...');
    const test = await ssh.execCommand('nginx -t');
    console.log(test.stdout || test.stderr);

    console.log('Restarting Nginx...');
    await ssh.execCommand('systemctl restart nginx');
    
    console.log('Nginx is ready to receive requests on port 80.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
