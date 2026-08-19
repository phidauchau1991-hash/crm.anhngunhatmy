const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 'mock', username: 'admin', role: 'ADMIN' }, process.env.JWT_SECRET || 'nhatmycrm_secret_key_2026', { expiresIn: '1d' });
  
  const pageRes = await fetch('http://localhost:3000/students/HV2607_001', {
    headers: { 'Cookie': 'auth_token=' + token },
    redirect: 'manual'
  });
  
  const html = await pageRes.text();
  console.log('Status:', pageRes.status);
  console.log('HTML Length:', html.length);
  if (pageRes.status >= 500) {
    console.log(html.substring(0, 1000));
  } else if (pageRes.status >= 300) {
    console.log('Redirected to:', pageRes.headers.get('location'));
  } else {
    console.log('Page loaded successfully! Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
  }
}

test();
