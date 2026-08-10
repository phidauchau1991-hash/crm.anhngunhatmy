const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const config = {
  host: '103.165.144.154',
  username: 'root',
  password: '4jGbRF9eQRXybRJr3vQP'
};
const remoteDir = '/var/www/nhat-my-crm';

async function finishDeploy() {
  try {
    await ssh.connect(config);
    console.log('Connected!');

    console.log('6. Building App (This may take a few minutes)...');
    await execRemote(`cd ${remoteDir} && npm ci`);
    await execRemote(`cd ${remoteDir} && npx prisma generate`);
    await execRemote(`cd ${remoteDir} && npm run build`);
    
    console.log('7. Starting App with PM2...');
    // delete previous if exists
    await execRemote(`pm2 delete nhat-my-crm || true`);
    await execRemote(`cd ${remoteDir} && pm2 start npm --name "nhat-my-crm" -- run start`);
    await execRemote('pm2 save');
    await execRemote('pm2 startup | tail -n 1 | bash');

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
    await execRemote(`echo "${nginxConfig.replace(/\$/g, '\\$')}" > /etc/nginx/sites-available/default`);
    await execRemote('systemctl restart nginx');

    console.log('DEPLOYMENT COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

async function execRemote(cmd) {
  console.log(`[VPS] Running: ${cmd}`);
  const result = await ssh.execCommand(cmd);
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  if (result.code !== 0) throw new Error(`Command failed with code ${result.code}`);
}

finishDeploy();
