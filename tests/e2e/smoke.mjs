/**
 * End-to-end smoke test for the full user journey:
 * login -> dashboard render -> upgrade flow -> plan persistence -> logout ->
 * route guard -> responsive layout checks.
 *
 * Usage:
 *   npx http-server -p 8080 -c-1 .     # in one shell
 *   npm run test:e2e                   # in another
 *
 * Env overrides:
 *   BASE_URL      (default http://127.0.0.1:8080)
 *   CHROME_PATH   (default /usr/bin/google-chrome)
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const DEMO = { email: 'demo@subanalytics.io', password: 'Demo1234' };

const errors = [];
let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function loginAs(page) {
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
  await page.type('#email', DEMO.email);
  await page.type('#password', DEMO.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#submit-btn'),
  ]);
}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  await page.setViewport({ width: 1280, height: 900 });

  console.log('\n1. Authentication');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
  check('login page loads', (await page.title()).includes('Log in'));

  // Invalid credentials must be rejected without navigating away.
  await page.type('#email', 'nobody@example.com');
  await page.type('#password', 'WrongPass1');
  await page.click('#submit-btn');
  await page.waitForSelector('#form-alert.visible', { timeout: 3000 });
  check('invalid credentials rejected', page.url().includes('index.html'),
    await page.$eval('#form-alert', (el) => el.textContent.trim()));

  await loginAs(page);
  check('demo login reaches dashboard', page.url().includes('dashboard.html'), page.url());

  console.log('\n2. Dashboard');
  const kpiText = await page.$eval('#kpi-grid', (el) => el.textContent);
  check('MRR KPI card rendered', kpiText.includes('Monthly Recurring Revenue'));
  check('churn KPI card rendered', kpiText.includes('Churn Rate'));
  const rowCount = await page.$$eval('#subscribers-body tr', (rows) => rows.length);
  check('subscriber table populated', rowCount > 0, `${rowCount} rows`);

  const canvasReport = await page.evaluate(() =>
    [...document.querySelectorAll('canvas')].map((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let painted = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
      return { id: c.id, paintedPct: +((painted / (d.length / 4)) * 100).toFixed(1) };
    })
  );
  check('all charts painted pixels', canvasReport.length === 4 && canvasReport.every((c) => c.paintedPct > 1),
    canvasReport.map((c) => `${c.id}=${c.paintedPct}%`).join(', '));

  console.log('\n3. Upgrade flow');
  await page.goto(`${BASE_URL}/upgrade.html`, { waitUntil: 'networkidle0' });
  const pricingCards = await page.$$('.price-card');
  check('all four plans listed', pricingCards.length === 4, `${pricingCards.length} cards`);
  check('current plan marked', (await page.$$('.price-card.current')).length === 1);

  const selectBtn = await page.$('[data-plan-select]');
  const targetPlan = await page.evaluate((el) => el.getAttribute('data-plan-select'), selectBtn);
  await selectBtn.click();
  await page.waitForSelector('#confirm-overlay.visible', { timeout: 3000 });
  check('confirm modal opens', true, `target plan: ${targetPlan}`);

  await page.click('#confirm-cancel');
  check('confirm modal cancels',
    !(await page.$eval('#confirm-overlay', (el) => el.classList.contains('visible'))));

  await (await page.$('[data-plan-select]')).click();
  await page.waitForSelector('#confirm-overlay.visible', { timeout: 3000 });
  await page.click('#confirm-accept');
  await page.waitForSelector('#success-overlay.visible', { timeout: 5000 });
  check('upgrade succeeds', true);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#success-continue'),
  ]);
  check('redirects to dashboard after upgrade', page.url().includes('dashboard.html'), page.url());
  const planBadge = await page.$eval('[data-plan-name]', (el) => el.textContent.trim());
  check('plan change persisted across navigation', planBadge === targetPlan, `badge: ${planBadge}`);

  console.log('\n4. Session & route guard');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('[data-logout]'),
  ]);
  check('logout returns to login', page.url().includes('index.html'), page.url());

  await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle0' });
  check('unauthenticated dashboard access redirected', page.url().includes('index.html'), page.url());
  await page.goto(`${BASE_URL}/upgrade.html`, { waitUntil: 'networkidle0' });
  check('unauthenticated upgrade access redirected', page.url().includes('index.html'), page.url());

  console.log('\n5. Responsive layout');
  await loginAs(page);
  for (const pagePath of ['index.html', 'signup.html', 'dashboard.html', 'upgrade.html']) {
    for (const width of [390, 768, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${BASE_URL}/${pagePath}`, { waitUntil: 'networkidle0' });
      const o = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      check(`no horizontal overflow: ${pagePath} @${width}px`, o.s <= o.c + 1, `${o.s}/${o.c}`);
    }
  }

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle0' });
  const toggleVisible = await page.$eval('[data-sidebar-toggle]', (el) => getComputedStyle(el).display !== 'none');
  check('mobile sidebar toggle visible at 390px', toggleVisible);
  await page.click('[data-sidebar-toggle]');
  const drawerOpen = await page.$eval('.sidebar', (el) => el.classList.contains('open'));
  check('mobile drawer opens on toggle', drawerOpen);
} finally {
  await browser.close();
}

if (errors.length) {
  failures += errors.length;
  console.error('\nConsole/page errors detected:');
  errors.forEach((e) => console.error(`  ${e}`));
}

console.log(
  failures === 0
    ? '\n=== E2E SMOKE TEST PASSED (no failures, no console errors) ==='
    : `\n=== E2E SMOKE TEST FAILED: ${failures} problem(s) ===`
);
process.exit(failures === 0 ? 0 : 1);
