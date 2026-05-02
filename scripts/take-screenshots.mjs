// Boots the dev server in demo mode and uses Playwright to capture
// screenshots of each feature for the README. All screenshots go to
// docs/screenshots/. The app is opened with `?demo=1` so it runs against
// the in-memory MockSheetsService — no Google account required.
//
// Usage:  node scripts/take-screenshots.mjs

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'screenshots');
const APP_URL = 'http://localhost:8080/?demo=1';

// ── Boot dev server ─────────────────────────────────────────────────────────

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch { /* not yet up */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Dev server didn't come up at ${url} within ${timeoutMs}ms`);
}

async function ensurePortFree(port) {
  const { execSync } = await import('node:child_process');
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    if (pids) {
      console.log(`Port ${port} already in use by PID(s): ${pids} — terminating so we can boot a fresh demo server.`);
      execSync(`kill -TERM ${pids}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch { /* lsof returns non-zero when nothing is listening */ }
}

function startDevServer() {
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  proc.stdout.on('data', d => process.stdout.write(`[vite] ${d}`));
  proc.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));
  return proc;
}

// ── Screenshot helpers ──────────────────────────────────────────────────────

async function shoot(page, name) {
  const out = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  → ${path.relative(ROOT, out)}`);
}

async function clickTab(page, label) {
  // Tabs render as buttons with the icon + label. The label hides on small
  // screens (sm:inline) so click by aria-label / text role.
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await page.waitForTimeout(400); // small settle for chart/layout
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  await ensurePortFree(8080);
  console.log('Starting dev server…');
  const server = startDevServer();
  try {
    await waitForServer('http://localhost:8080');
    console.log('Dev server is up. Launching browser…');

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2, // retina-quality screenshots
    });
    const page = await context.newPage();

    page.on('pageerror', err => console.error('[page error]', err.message));

    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Wait for the loading state to clear and the dashboard to render.
    await page.waitForSelector('text=Dashboard', { timeout: 30_000 });
    await page.waitForTimeout(800); // let charts finish animating

    console.log('Capturing screenshots…');

    // Dashboard (top-of-readme overview shot)
    await shoot(page, 'dashboard');

    // Dashboard charts close-up — scroll down to put charts in viewport
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await shoot(page, 'dashboard-charts');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    // Expenses
    await clickTab(page, 'Expenses');
    await page.waitForTimeout(600);
    await shoot(page, 'expenses');

    // CSV import — open the bulk upload dialog from the Expenses tab
    await page.getByRole('button', { name: /upload bulk/i }).first().click();
    await page.waitForTimeout(600);
    await shoot(page, 'csv-import');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // Income
    await clickTab(page, 'Income');
    await page.waitForTimeout(600);
    await shoot(page, 'income');

    // Savings
    await clickTab(page, 'Savings');
    await page.waitForTimeout(600);
    await shoot(page, 'savings');

    // Household (Debt tracker hub)
    await clickTab(page, 'Household');
    await page.waitForTimeout(600);
    await shoot(page, 'household');

    // Per-person debt detail page — uses the partner's household_person_id
    // from demoFixtures.ts.
    await page.goto('http://localhost:8080/debt/hp-partner?demo=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shoot(page, 'debt');

    // Settings
    await page.goto('http://localhost:8080/settings?demo=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await shoot(page, 'settings');

    await browser.close();
    console.log('Done.');
  } finally {
    server.kill('SIGTERM');
    // Give vite a moment to clean up its child processes
    await new Promise(r => setTimeout(r, 500));
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
