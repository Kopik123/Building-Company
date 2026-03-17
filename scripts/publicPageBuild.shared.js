const buildLinksByLabel = (availableLinks, labels = []) =>
  labels
    .map((label) => availableLinks.find((link) => link.label === label))
    .filter(Boolean);

const buildAreaItems = (availableAreas, primaryArea) => [
  primaryArea,
  ...availableAreas.filter((area) => area !== primaryArea)
];

const normalizeFaqItems = (items = []) =>
  items
    .map((item) => ({
      q: String(item?.q || '').trim(),
      a: String(item?.a || '').trim()
    }))
    .filter((item) => item.q && item.a);

const buildFaqJsonLd = (pageUrl, items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: normalizeFaqItems(items).map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a
    }
  })),
  url: pageUrl
});

module.exports = {
  buildAreaItems,
  buildFaqJsonLd,
  buildLinksByLabel
};
