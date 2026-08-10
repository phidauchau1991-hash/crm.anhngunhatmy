const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const config = {
  host: '103.165.144.154',
  username: 'root',
  password: '4jGbRF9eQRXybRJr3vQP'
};

async function configureNginx() {
  try {
    await ssh.connect(config);
    console.log('Connected!');

    console.log('8. Configuring Nginx...');
    const nginxConfig = `
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
    await ssh.execCommand(`echo "${nginxConfig.replace(/\$/g, '\\$')}" > /etc/nginx/sites-available/default`);
    await ssh.execCommand('systemctl restart nginx');
    
    // Also explicitly set pm2 startup properly just in case
    await ssh.execCommand('pm2 startup systemd -u root --hp /root');
    await ssh.execCommand('pm2 save');

    console.log('NGINX CONFIGURED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}
configureNginx();
