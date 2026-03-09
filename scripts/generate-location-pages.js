const fs = require('fs');
const path = require('path');
const { shared, pages } = require('./locationPages.data');
const {
  renderPublicPage,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderFaqSection
} = require('./publicPageRenderer');

const projectRoot = path.resolve(__dirname, '..');

const buildLocationPages = () =>
  pages.map((page) => ({
    fileName: page.fileName,
    html: renderPublicPage({
      shared,
      fileName: page.fileName,
      title: `Premium Renovations ${page.location} | ${shared.brandName}`,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      bodyClass: 'public-site page-location',
      generatedBy: 'npm run generate:locations',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: `Premium renovation services in ${page.location}`,
        provider: {
          '@type': 'LocalBusiness',
          name: shared.brandName,
          telephone: shared.phones.map((phone) => phone.display),
          email: shared.email
        },
        areaServed: [page.location, shared.region],
        url: `${shared.siteUrl}/${page.fileName}`
      },
      hero: {
        image: page.heroImage,
        eyebrow: page.location,
        title: page.heroTitle,
        lead: page.heroLead,
        chips: [
          { label: 'Seven studio service lines' },
          { label: shared.region, isBrandRegion: true },
          { label: 'Private consultation first' }
        ]
      },
      sections: [
        renderIntroSection({
          eyebrow: 'Local Focus',
          title: page.localTitle,
          lead: page.localLead,
          useAreaCard: true
        }),
        renderPillarSection({
          eyebrow: 'Service Mix',
          title: `How the studio typically works in ${page.location}.`,
          pillars: page.pillars
        }),
        renderFeatureSection({
          eyebrow: 'Case Study Lens',
          title: page.caseStudy.title,
          lead: page.caseStudy.lead,
          metrics: page.caseStudy.metrics,
          image: page.caseStudy.image,
          imageAlt: page.caseStudy.imageAlt
        }),
        renderFaqSection({
          eyebrow: 'FAQ',
          title: `Questions we usually answer before starting in ${page.location}.`,
          items: page.faq
        })
      ],
      contact: {
        title: `Planning your ${page.location} project? Speak to the studio.`,
        lead: shared.contactLead
      },
      consultation: {
        title: `Start your ${page.location} renovation brief.`,
        lead: `Tell us what you want to change in ${page.location}, which service line matters most and what finish level you expect.`,
        formContext: page.location,
        locationValue: page.location,
        selectedProjectType: 'bathroom'
      }
    })
  }));

const writeLocationPages = () => {
  const outputs = buildLocationPages();
  outputs.forEach(({ fileName, html }) => {
    fs.writeFileSync(path.join(projectRoot, fileName), html, 'utf8');
  });
  return outputs.length;
};

if (require.main === module) {
  console.log(`Generated ${writeLocationPages()} location pages.`);
}

module.exports = {
  buildLocationPages,
  writeLocationPages
};
