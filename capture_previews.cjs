const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

async function run() {
  const outDir = path.resolve(__dirname, 'docs', 'previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  });

  const testCases = [
    { name: 'mobile_360_home', url: 'http://localhost:3000/', width: 360, height: 800 },
    { name: 'mobile_360_calc', url: 'http://localhost:3000/calculator', width: 360, height: 800 },
    { name: 'mobile_390_results', url: 'http://localhost:3000/results', width: 390, height: 844 },
    { name: 'tablet_768_admin', url: 'http://localhost:3000/admin', width: 768, height: 1024 },
    { name: 'desktop_1440_home', url: 'http://localhost:3000/', width: 1440, height: 900 },
  ];

  const results = [];

  for (const tc of testCases) {
    const context = await browser.newContext({
      viewport: { width: tc.width, height: tc.height },
    });
    const page = await context.newPage();
    await page.goto(tc.url, { waitUntil: 'networkidle' });

    // Check for page-level horizontal overflow
    const overflowInfo = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientWidth = window.innerWidth;
      const hasHorizontalOverflow = scrollWidth > clientWidth + 1; // 1px rounding tolerance
      return { scrollWidth, clientWidth, hasHorizontalOverflow };
    });

    const filePath = path.join(outDir, `${tc.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });

    console.log(
      `[${tc.name}] ${tc.width}x${tc.height} -> Horizontal Overflow: ${
        overflowInfo.hasHorizontalOverflow ? 'FAIL (overflow detected)' : 'PASS (no overflow)'
      } (scroll: ${overflowInfo.scrollWidth}, client: ${overflowInfo.clientWidth})`
    );

    results.push({ name: tc.name, ...overflowInfo });
    await context.close();
  }

  await browser.close();
  console.log('Visual inspection finished successfully.');
}

run().catch((err) => {
  console.error('Inspection error:', err);
  process.exit(1);
});
