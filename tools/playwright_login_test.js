// Playwright script to automate admin login and capture console/network logs.
// Usage:
// 1) Install Playwright (in the `web` folder):
//    npm --prefix "./web" install -D playwright
// 2) Run this script from the repo root:
//    node tools/playwright_login_test.js

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function run() {
  const outDir = path.join(__dirname, 'playwright-logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ recordHar: { path: path.join(outDir, 'session.har') } });
  const page = await context.newPage();

  const logs = { console: [], requests: [], responses: [] };

  page.on('console', (msg) => logs.console.push({ type: msg.type(), text: msg.text() }));
  page.on('request', (req) => logs.requests.push({ url: req.url(), method: req.method(), headers: req.headers() }));
  page.on('response', async (res) => {
    try {
      const ct = res.headers()['content-type'] || '';
      let body = null;
      if (ct.includes('application/json')) body = await res.json().catch(() => null);
      else body = await res.text().catch(() => null);
      logs.responses.push({ url: res.url(), status: res.status(), body });
    } catch (e) {
      logs.responses.push({ url: res.url(), status: res.status(), body: '<unreadable>' });
    }
  });

  try {
    console.log('Opening admin page...');
    await page.goto('http://localhost:3001/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Fill the login form
    await page.fill('input[type="email"], input[placeholder*="admin@example"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin1234');

    // Intercept the login response
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/admin/login') && r.request().method() === 'POST', { timeout: 10000 }),
      page.click('button:has-text("Login")')
    ]);

    console.log('Login response status:', response.status());
    let respBody;
    try { respBody = await response.json(); } catch (e) { respBody = await response.text(); }
    console.log('Login response body:', respBody);

    // Save logs
    fs.writeFileSync(path.join(outDir, 'logs.json'), JSON.stringify(logs, null, 2));
    console.log('Logs saved to', outDir);
  } catch (err) {
    console.error('Playwright test failed:', err.message || err);
    fs.writeFileSync(path.join(outDir, 'logs.json'), JSON.stringify(logs, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

run();
