const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadRoute, mock, mockModels } = require('./_helpers');

const repoRoot = path.resolve(__dirname, '..', '..');

const createModelsStub = () => ({
  Project: {},
  ProjectMedia: {},
  ServiceOffering: {},
  User: {},
  SessionRefreshToken: {},
  Quote: {},
  QuoteClaimToken: {},
  Notification: {},
  MessageThread: {},
  Message: {},
  MaterialInventory: {},
  ProjectTimelineEvent: {},
  ProjectDocument: {},
  ProjectAssignment: {},
  DevicePushToken: {}
});

const readHtml = (fileName) => fs.readFileSync(path.join(repoRoot, fileName), 'utf8');

const captureCacheControl = (setStaticCacheHeaders, filePath) => {
  const headers = new Map();
  setStaticCacheHeaders({
    setHeader(name, value) {
      headers.set(name, value);
    }
  }, filePath);
  return headers.get('Cache-Control');
};

test('brochure pages only load the surface CSS they need', { concurrency: false }, () => {
  const brochurePages = ['about.html', 'contact.html', 'cookie-policy.html', 'privacy.html', 'services.html', 'terms.html'];
  brochurePages.forEach((fileName) => {
    const html = readHtml(fileName);
    assert.equal(html.includes('/styles/workspace.css'), false, `${fileName} should not load workspace.css`);
    assert.equal(html.includes('/styles/gallery.css'), false, `${fileName} should not load gallery.css`);
    assert.equal(html.includes('/styles/quote-flow.css'), false, `${fileName} should not load quote-flow.css`);
  });

  const homeHtml = readHtml('index.html');
  assert.equal(homeHtml.includes('/styles/quote-flow.css'), true, 'index.html should load quote-flow.css');
  assert.equal(homeHtml.includes('/styles/workspace.css'), false, 'index.html should not load workspace.css');

  const quoteHtml = readHtml('quote.html');
  assert.equal(quoteHtml.includes('/styles/quote-flow.css'), true, 'quote.html should load quote-flow.css');
  assert.equal(quoteHtml.includes('/styles/workspace.css'), false, 'quote.html should not load workspace.css');

  const galleryHtml = readHtml('gallery.html');
  assert.equal(galleryHtml.includes('/styles/gallery.css'), true, 'gallery.html should load gallery.css');
  assert.equal(galleryHtml.includes('/styles/workspace.css'), false, 'gallery.html should not load workspace.css');

  const generatedHtml = readHtml('premium-bathrooms-manchester.html');
  assert.equal(generatedHtml.includes('/styles/gallery.css'), true, 'generated service pages should load gallery.css');
  assert.equal(generatedHtml.includes('/styles/quote-flow.css'), true, 'generated service pages should load quote-flow.css');
  assert.equal(generatedHtml.includes('/styles/workspace.css'), false, 'generated service pages should not load workspace.css');

  const authHtml = readHtml('auth.html');
  assert.equal(authHtml.includes('/styles/workspace.css'), true, 'auth.html should keep workspace.css');

  const managerHtml = readHtml('manager-dashboard.html');
  assert.equal(managerHtml.includes('/styles/workspace.css'), true, 'manager-dashboard.html should keep workspace.css');
  assert.equal(managerHtml.includes('/dashboard-accordions.js'), true, 'manager-dashboard.html should load dashboard-accordions.js');
});

test('static cache headers separate HTML, mutable media and versioned frontend assets', { concurrency: false }, () => {
  mockModels(createModelsStub());
  const { setStaticCacheHeaders } = loadRoute('app.js');

  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'index.html')), 'no-store');
  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'styles', 'public.css')), 'public, max-age=31536000, immutable');
  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'site.js')), 'public, max-age=31536000, immutable');
  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'uploads', 'quotes', 'example.jpg')), 'no-store');
  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'Gallery', 'premium', 'bathroom-main.jpg')), 'no-store');
  assert.equal(captureCacheControl(setStaticCacheHeaders, path.join(repoRoot, 'assets', 'optimized', 'brand', 'title.webp')), 'public, max-age=604800, stale-while-revalidate=86400');
});


test.afterEach(() => {
  mock.stopAll();
});
