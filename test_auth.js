const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/students/HV2607_001',
  method: 'GET',
  headers: {
    // mock a cookie or something to bypass?
    // actually, let's just make a POST to /api/auth/login first
  }
};

async function test() {
  const loginData = JSON.stringify({ username: 'admin', password: 'password123' });
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginData
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Cookie:', setCookie);
  
  const pageRes = await fetch('http://localhost:3000/students/HV2607_001', {
    headers: { 'Cookie': setCookie }
  });
  
  const html = await pageRes.text();
  console.log('Status:', pageRes.status);
  console.log('HTML Length:', html.length);
  if (pageRes.status >= 500) {
    console.log(html.substring(0, 1000));
  } else {
    console.log('Page loaded successfully!');
  }
}

test();
