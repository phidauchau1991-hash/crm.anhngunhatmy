async function test() {
  const loginData = JSON.stringify({ username: 'admin', password: 'password123' });
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginData
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Login Status:', loginRes.status);
  console.log('Cookie:', setCookie);
  
  const pageRes = await fetch('http://localhost:3000/students/HV2607_001', {
    headers: { 'Cookie': setCookie },
    redirect: 'manual'
  });
  
  const html = await pageRes.text();
  console.log('Page Status:', pageRes.status);
  if (pageRes.status >= 500) {
    console.log(html.substring(0, 1000));
  } else if (pageRes.status >= 300) {
    console.log('Redirected to:', pageRes.headers.get('location'));
  } else {
    console.log('Page loaded successfully! Title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
  }
}

test();
