const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function setup() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    console.log('Connected to VPS.');

    // 1. Create bare repo
    console.log('Creating bare git repo at /var/repo/nhat-my-crm.git...');
    await ssh.execCommand('mkdir -p /var/repo/nhat-my-crm.git');
    await ssh.execCommand('git init --bare', { cwd: '/var/repo/nhat-my-crm.git' });

    // 2. Create post-receive hook
    console.log('Creating post-receive hook...');
    const hookScript = `#!/bin/bash
TARGET="/var/www/nhat-my-crm"
GIT_DIR="/var/repo/nhat-my-crm.git"
BRANCH="master"

while read oldrev newrev ref
do
    # only checking out the master (or main) branch
    if [[ $ref = refs/heads/master ]];
    then
        echo "Ref $ref received. Deploying master branch to production..."
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f
        
        echo "Running npm install..."
        cd $TARGET
        npm install --omit=dev
        
        echo "Generating Prisma Client..."
        npx prisma generate
        
        echo "Building Next.js..."
        npm run build
        
        echo "Restarting PM2..."
        pm2 reload nhat-my-crm
    else
        echo "Ref $ref received. Doing nothing: only the master branch may be deployed on this server."
    fi
done
`;
    
    // Write hook script
    await ssh.execCommand(`cat << 'EOF' > /var/repo/nhat-my-crm.git/hooks/post-receive\n${hookScript}\nEOF`);
    await ssh.execCommand('chmod +x /var/repo/nhat-my-crm.git/hooks/post-receive');

    console.log('Setup completed successfully on VPS.');
    ssh.dispose();
  } catch (error) {
    console.error('Error:', error);
    ssh.dispose();
  }
}

setup();
