(async () => {
  const base = 'http://localhost:4000';
  const log = (label, v) => console.log(`--- ${label} ---`, typeof v === 'object' ? JSON.stringify(v, null, 2) : v);
  try {
    const h = await (await fetch(base + '/health')).json();
    log('health', h);

    const products = await (await fetch(base + '/api/products')).json();
    log('products', products);

    const categories = await (await fetch(base + '/api/categories')).json();
    log('categories', categories);

    const first = Array.isArray(products) && products.length ? products[0] : null;
    if (!first) throw new Error('no products to order');

    const orderPayload = {
      customerName: 'Automated Tester',
      customerPhone: '+2348000000000',
      deliveryAddress: '123 Test Ave',
      items: [{ productId: first.id, qty: 1 }]
    };

    const orderRes = await fetch(base + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const orderBody = await orderRes.json();
    log('createOrder status', orderRes.status);
    log('createOrder body', orderBody);

    // Admin login
    const loginRes = await fetch(base + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin1234' })
    });
    const loginBody = await loginRes.json();
    log('adminLogin status', loginRes.status);
    log('adminLogin body', loginBody);
    const token = loginBody.token;

    if (!token) {
      console.error('Admin login failed; cannot continue admin checks');
      process.exit(1);
    }

    const ordersRes = await fetch(base + '/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
    const orders = await ordersRes.json();
    log('adminOrders', orders.slice ? orders.slice(0, 5) : orders);

    const orderCode = orderBody.orderCode || (orders && orders.length && orders[0].orderCode);
    if (!orderCode) {
      console.error('No order code found to inspect');
      process.exit(1);
    }

    const orderDetail = await (await fetch(base + `/api/admin/orders/${orderCode}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    log('orderDetail', orderDetail);

    // Update status to CONFIRMED
    const patchRes = await fetch(base + `/api/admin/orders/${orderCode}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'CONFIRMED', note: 'Confirmed by automated test' })
    });
    log('patchStatus status', patchRes.status);
    log('patchStatus body', await patchRes.json());

    console.log('\nAll API checks completed successfully');
  } catch (err) {
    console.error('TEST ERROR', err);
    process.exit(1);
  }
})();
