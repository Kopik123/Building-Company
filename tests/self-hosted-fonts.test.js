const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

const htmlFiles = [
  'about.html',
  'auth.html',
  'client-dashboard.html',
  'client-review.html',
  'contact.html',
  'cookie-policy.html',
  'gallery.html',
  'index.html',
  'interior-renovations-manchester.html',
  'manager-dashboard.html',
  'manager-review.html',
  'premium-bathrooms-manchester.html',
  'premium-kitchens-manchester.html',
  'premium-renovations-altrincham.html',
  'premium-renovations-chorlton.html',
  'premium-renovations-didsbury.html',
  'premium-renovations-sale.html',
  'premium-renovations-stockport.html',
  'premium-renovations-wilmslow.html',
  'privacy.html',
  'quote.html',
  'terms.html'
];

test('tracked pages load local fonts stylesheet and do not reference Google Fonts', () => {
  htmlFiles.forEach((relativePath) => {
    const content = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.match(content, /<link rel="stylesheet" href="\/styles\/fonts\.css" \/>/);
    assert.doesNotMatch(content, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });
});

test('public page renderer and CSP no longer allow external Google Fonts', () => {
  const renderer = fs.readFileSync(path.join(repoRoot, 'scripts/publicPageRenderer.js'), 'utf8');
  const app = fs.readFileSync(path.join(repoRoot, 'app.js'), 'utf8');

  assert.match(renderer, /<link rel="stylesheet" href="\/styles\/fonts\.css" \/>/);
  assert.doesNotMatch(renderer, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(app, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});
