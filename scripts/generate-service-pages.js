const fs = require('fs');
const path = require('path');
const { shared, pages } = require('./servicePages.data');
const {
  renderPublicPage,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderMediaStripSection,
  renderFaqSection
} = require('./publicPageRenderer');

const projectRoot = path.resolve(__dirname, '..');

const buildFaqJsonLd = (pageUrl, items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a
    }
  })),
  url: pageUrl
});

const buildServicePages = () =>
  pages.map((page) => ({
    fileName: page.fileName,
    html: renderPublicPage({
      shared,
      fileName: page.fileName,
      title: page.title,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      bodyClass: page.bodyClass,
      generatedBy: 'npm run generate:services',
      jsonLd: [
        {
          ...page.jsonLd,
          url: `${shared.siteUrl}/${page.fileName}`
        },
        buildFaqJsonLd(`${shared.siteUrl}/${page.fileName}`, page.faq.items)
      ],
      hero: page.hero,
      sections: [
        renderIntroSection({
          eyebrow: page.intro.eyebrow,
          title: page.intro.title,
          lead: page.intro.lead,
          detailListItems: page.intro.detailListItems
        }),
        renderPillarSection({
          eyebrow: page.priorities.eyebrow,
          title: page.priorities.title,
          pillars: page.priorities.pillars
        }),
        renderFeatureSection({
          eyebrow: page.feature.eyebrow,
          title: page.feature.title,
          lead: page.feature.lead,
          metrics: page.feature.metrics,
          image: page.feature.image,
          imageAlt: page.feature.imageAlt
        }),
        renderMediaStripSection({
          eyebrow: page.mediaStrip.eyebrow,
          title: page.mediaStrip.title,
          images: page.mediaStrip.images
        }),
        renderFaqSection(page.faq)
      ],
      contact: page.contact,
      consultation: page.consultation
    })
  }));

const writeServicePages = () => {
  const outputs = buildServicePages();
  outputs.forEach(({ fileName, html }) => {
    fs.writeFileSync(path.join(projectRoot, fileName), html, 'utf8');
  });
  return outputs.length;
};

if (require.main === module) {
  console.log(`Generated ${writeServicePages()} service pages.`);
}

module.exports = {
  buildServicePages,
  writeServicePages
};
