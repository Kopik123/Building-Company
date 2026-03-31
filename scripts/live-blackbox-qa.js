const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('@playwright/test');

const BASE_URL = process.env.BLACKBOX_BASE_URL || 'https://levellines.co.uk';
const OUTPUT_DIR = path.join(__dirname, '..', 'test-results', 'blackbox-live-qa');

const ROUTES = [
  '/',
  '/about.html',
  '/services.html',
  '/gallery.html',
  '/quote.html',
  '/contact.html',
  '/auth.html',
  '/manager-dashboard.html',
  '/client-dashboard.html',
  '/premium-kitchens-manchester.html',
  '/premium-renovations-altrincham.html'
];

const VIEWPORTS = [
  {
    key: 'desktop',
    options: {
      viewport: { width: 1440, height: 1000 }
    }
  },
  {
    key: 'mobile',
    options: {
      ...devices['iPhone 12']
    }
  }
];

const slug = (route) => {
  if (route === '/') {
    return 'home';
  }
  let value = route.replaceAll('/', '').replaceAll(/\.html$/gi, '').replaceAll(/[^a-z0-9]+/gi, '-');
  while (value.startsWith('-')) {
    value = value.slice(1);
  }
  while (value.endsWith('-')) {
    value = value.slice(0, -1);
  }
  return value;
};

const ensureOutputDir = () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
};

const createRunMeta = () => ({
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  routes: ROUTES,
  checks: []
});

const readSeoAndLayoutState = async (page) =>
  page.evaluate(() => {
    const title = document.title || '';
    const h1Count = document.querySelectorAll('h1').length;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
    const hasHorizontalOverflow = document.documentElement.scrollWidth > globalThis.innerWidth + 1;

    let hasMainBackground = false;
    let hasBoxBackground = false;
    for (const element of Array.from(document.querySelectorAll('*'))) {
      const bg = globalThis.getComputedStyle(element).backgroundImage || '';
      if (!hasMainBackground && bg.includes('mainbackground')) {
        hasMainBackground = true;
      }
      if (!hasBoxBackground && bg.includes('boxbackground')) {
        hasBoxBackground = true;
      }
      if (hasMainBackground && hasBoxBackground) {
        break;
      }
    }

    return {
      title,
      h1Count,
      canonical,
      metaDescription,
      ogTitle,
      ogDescription,
      twitterTitle,
      twitterDescription,
      hasHorizontalOverflow,
      hasMainBackground,
      hasBoxBackground
    };
  });

const writeReports = (meta) => {
  const jsonPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const failed = meta.checks.filter((entry) => !entry.ok);
  const lines = [
    '# Blackbox Live QA Report',
    '',
    `- Base URL: ${meta.baseUrl}`,
    `- Generated at: ${meta.generatedAt}`,
    `- Total checks: ${meta.checks.length}`,
    '',
    `- Passed: ${meta.checks.length - failed.length}`,
    `- Failed: ${failed.length}`,
    '',
    '## Results',
    ''
  ];

  for (const entry of meta.checks) {
    const entryLines = [`- [${entry.ok ? 'PASS' : 'FAIL'}] ${entry.route} (${entry.viewport})`];
    if (!entry.ok && entry.error) {
      entryLines.push(`  - Error: ${entry.error}`);
    }
    if (entry.seo) {
      entryLines.push(
        `  - Title present: ${Boolean(entry.seo.title)}`,
        `  - H1 count: ${entry.seo.h1Count}`,
        `  - Canonical present: ${Boolean(entry.seo.canonical)}`,
        `  - Meta description present: ${Boolean(entry.seo.metaDescription)}`,
        `  - OG title+desc present: ${Boolean(entry.seo.ogTitle && entry.seo.ogDescription)}`,
        `  - Twitter title+desc present: ${Boolean(entry.seo.twitterTitle && entry.seo.twitterDescription)}`,
        `  - Horizontal overflow: ${entry.seo.hasHorizontalOverflow}`,
        `  - mainbackground visible: ${entry.seo.hasMainBackground}`,
        `  - boxbackground visible: ${entry.seo.hasBoxBackground}`
      );
    }
    entryLines.push(`  - Screenshot: ${entry.screenshotPath}`);
    lines.push(...entryLines);
  }
  lines.push('');

  const mdPath = path.join(OUTPUT_DIR, 'report.md');
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8');
};

const run = async () => {
  ensureOutputDir();
  const report = createRunMeta();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of VIEWPORTS) {
      for (const route of ROUTES) {
        const context = await browser.newContext(viewport.options);
        const page = await context.newPage();
        const routeSlug = slug(route);
        const screenshotPath = path.join('test-results', 'blackbox-live-qa', `${routeSlug}-${viewport.key}.png`);
        const absoluteScreenshotPath = path.join(__dirname, '..', screenshotPath);
        const targetUrl = `${BASE_URL}${route}`;

        const row = {
          route,
          viewport: viewport.key,
          url: targetUrl,
          screenshotPath,
          ok: false
        };

        try {
          const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(600);
          await page.screenshot({ path: absoluteScreenshotPath, fullPage: true });

          const seo = await readSeoAndLayoutState(page);
          const status = response ? response.status() : 0;

          row.status = status;
          row.seo = seo;
          row.ok = status >= 200 && status < 400 && !seo.hasHorizontalOverflow;
        } catch (error) {
          row.error = error instanceof Error ? error.message : String(error);
          row.ok = false;
        } finally {
          await context.close();
        }

        report.checks.push(row);
      }
    }
  } finally {
    await browser.close();
  }

  writeReports(report);

  const failed = report.checks.filter((entry) => !entry.ok);
  if (failed.length) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
