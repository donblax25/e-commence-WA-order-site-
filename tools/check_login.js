(async ()=>{
  try {
    const r = await fetch('http://localhost:3001/admin');
    console.log('/admin status', r.status);
    const t = await r.text();
    console.log('/admin contains Admin Dashboard?', t.includes('Admin Dashboard'));

    const loginRes = await fetch('http://localhost:4000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3001' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin1234' })
    });
    console.log('login status', loginRes.status);
    try {
      console.log('login body', await loginRes.json());
    } catch (e) {
      console.log('login text', await loginRes.text());
    }
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
