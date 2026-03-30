const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { buildLocationPages } = require('../../scripts/generate-location-pages');
const { buildServicePages } = require('../../scripts/generate-service-pages');

const rootDir = path.join(__dirname, '..', '..');
const siteUrl = 'https://levellines.co.uk';

const manualIndexablePages = [
  'index.html',
  'about.html',
  'services.html',
  'gallery.html',
  'quote.html',
  'contact.html',
  'privacy.html',
  'cookie-policy.html',
  'terms.html'
];

const generatedIndexablePages = [
  ...buildServicePages().map(({ fileName }) => fileName),
  ...buildLocationPages().map(({ fileName }) => fileName)
];

const indexablePages = [...manualIndexablePages, ...generatedIndexablePages];
const noindexPages = ['auth.html', 'client-dashboard.html', 'manager-dashboard.html'];

const bannedHelperPhrases = [
  'How to use this page',
  'How To Browse',
  'Before you send',
  'This is the main conversion route',
  'What happens next',
  'When account matters',
  'Need Direct Contact?',
  'Best use of contact'
];

const readHtml = (fileName) =>
  fs.readFileSync(path.join(rootDir, fileName), 'utf8');

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractSingleMatch = (html, regex, label) => {
  const match = html.match(regex);
  assert.ok(match, `${label} should exist`);
  return match[1].trim();
};

const extractMetaContent = (html, attribute, value) => {
  const escapedValue = escapeRegExp(value);
  const direct = new RegExp(
    `<meta\\b[^>]*\\b${attribute}=["']${escapedValue}["'][^>]*\\bcontent=["']([^"']+)["'][^>]*>`,
    'i'
  );
  const reversed = new RegExp(
    `<meta\\b[^>]*\\bcontent=["']([^"']+)["'][^>]*\\b${attribute}=["']${escapedValue}["'][^>]*>`,
    'i'
  );

  const match = html.match(direct) || html.match(reversed);
  assert.ok(match, `<meta ${attribute}="${value}"> should exist`);
  return match[1].trim();
};

const extractCanonical = (html) =>
  extractSingleMatch(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i, 'canonical');

const extractTitle = (html) =>
  extractSingleMatch(html, /<title>([^<]+)<\/title>/i, 'title');

const countH1 = (html) => (html.match(/<h1\b/gi) || []).length;

const expectedCanonical = (fileName) =>
  fileName === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${fileName}`;

test('indexable public pages keep unique launch-ready SEO primitives', () => {
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  indexablePages.forEach((fileName) => {
    const html = readHtml(fileName);
    const title = extractTitle(html);
    const description = extractMetaContent(html, 'name', 'description');
    const robots = extractMetaContent(html, 'name', 'robots');
    const canonical = extractCanonical(html);
    const ogTitle = extractMetaContent(html, 'property', 'og:title');
    const ogDescription = extractMetaContent(html, 'property', 'og:description');
    const ogUrl = extractMetaContent(html, 'property', 'og:url');
    const ogImage = extractMetaContent(html, 'property', 'og:image');
    const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
    const twitterDescription = extractMetaContent(html, 'name', 'twitter:description');
    const twitterImage = extractMetaContent(html, 'name', 'twitter:image');
    const twitterCard = extractMetaContent(html, 'name', 'twitter:card');
    const h1Count = countH1(html);
    const jsonLdCount = (html.match(/<script type=["']application\/ld\+json["']>/gi) || []).length;

    assert.match(robots, /index,follow/i, `${fileName} should stay indexable`);
    assert.equal(canonical, expectedCanonical(fileName), `${fileName} canonical should match expected URL`);
    assert.equal(h1Count, 1, `${fileName} should contain exactly one H1`);
    assert.ok(jsonLdCount >= 1, `${fileName} should include JSON-LD`);
    assert.equal(ogTitle, title, `${fileName} should align og:title with <title>`);
    assert.equal(ogDescription, description, `${fileName} should align og:description with meta description`);
    assert.equal(ogUrl, expectedCanonical(fileName), `${fileName} should align og:url with canonical`);
    assert.ok(ogImage.startsWith(siteUrl), `${fileName} og:image should use an absolute site URL`);
    assert.equal(twitterTitle, title, `${fileName} should align twitter:title with <title>`);
    assert.equal(twitterDescription, description, `${fileName} should align twitter:description with meta description`);
    assert.ok(twitterImage.startsWith(siteUrl), `${fileName} twitter:image should use an absolute site URL`);
    assert.equal(twitterCard, 'summary_large_image', `${fileName} should use summary_large_image cards`);

    const titleKey = title.toLowerCase();
    const descriptionKey = description.toLowerCase();

    assert.ok(!seenTitles.has(titleKey), `${fileName} duplicates title from ${seenTitles.get(titleKey)}`);
    assert.ok(!seenDescriptions.has(descriptionKey), `${fileName} duplicates meta description from ${seenDescriptions.get(descriptionKey)}`);

    seenTitles.set(titleKey, fileName);
    seenDescriptions.set(descriptionKey, fileName);
  });
});

test('protected account and workspace pages stay noindex', () => {
  noindexPages.forEach((fileName) => {
    const html = readHtml(fileName);
    const robots = extractMetaContent(html, 'name', 'robots');

    assert.match(robots, /noindex,follow/i, `${fileName} should stay noindex,follow`);
  });
});

test('sitemap contains only indexable public pages', () => {
  const sitemap = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
  const urlMatches = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  const sitemapUrls = new Set(urlMatches);
  const expectedUrls = new Set(indexablePages.map(expectedCanonical));

  expectedUrls.forEach((url) => {
    assert.ok(sitemapUrls.has(url), `sitemap should include ${url}`);
  });

  noindexPages.map(expectedCanonical).forEach((url) => {
    assert.ok(!sitemapUrls.has(url), `sitemap should exclude ${url}`);
  });

  sitemapUrls.forEach((url) => {
    assert.ok(expectedUrls.has(url), `sitemap should not include unexpected URL ${url}`);
  });
});

test('launch-ready public pages no longer ship helper-copy filler', () => {
  indexablePages.forEach((fileName) => {
    const html = readHtml(fileName);

    bannedHelperPhrases.forEach((phrase) => {
      assert.equal(
        html.toLowerCase().includes(phrase.toLowerCase()),
        false,
        `${fileName} should not include helper phrase "${phrase}"`
      );
    });
  });
});
