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

const buildLocationPages = () =>
  pages.map((page) => ({
    fileName: page.fileName,
    html: renderPublicPage({
      shared,
      fileName: page.fileName,
      title: `Premium Renovations in ${page.location} | ${shared.brandName}`,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      bodyClass: 'public-site page-location',
      generatedBy: 'npm run generate:locations',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `Premium Renovations in ${page.location}`,
          description: page.metaDescription,
          serviceType: 'Premium bathroom, kitchen and interior renovations',
          image: page.ogImage,
          provider: {
            '@type': 'LocalBusiness',
            name: shared.brandName,
            telephone: shared.phones.map((phone) => phone.display),
            email: shared.email
          },
          areaServed: [page.location, shared.region],
          url: `${shared.siteUrl}/${page.fileName}`
        },
        buildFaqJsonLd(`${shared.siteUrl}/${page.fileName}`, page.faq)
      ],
      hero: {
        image: page.heroImage,
        eyebrow: page.location,
        title: page.heroTitle,
        lead: page.heroLead,
        chips: [
          { label: shared.serviceLineLabel },
          { label: shared.region, isBrandRegion: true },
          { label: shared.privateConsultationLabel }
        ]
      },
      sections: [
        renderIntroSection({
          eyebrow: 'Location Focus',
          title: page.localTitle,
          lead: page.localLead,
          useAreaCard: true
        }),
        renderPillarSection({
          eyebrow: 'Curated Scope',
          title: `How the studio tends to shape work in ${page.location}.`,
          pillars: page.pillars
        }),
        renderFeatureSection({
          eyebrow: 'Selected Project',
          title: page.caseStudy.title,
          lead: page.caseStudy.lead,
          metrics: page.caseStudy.metrics,
          image: page.caseStudy.image,
          imageAlt: page.caseStudy.imageAlt
        }),
        renderFaqSection({
          eyebrow: 'FAQ',
          title: `Questions we usually answer before a ${page.location} brief starts.`,
          items: page.faq
        })
      ],
      contact: {
        title: `Discuss your ${page.location} renovation directly with the studio.`,
        lead: shared.contactLead
      },
      consultation: {
        title: `Bring your ${page.location} brief to a private consultation.`,
        lead: `Tell us the rooms involved in ${page.location}, the finish ambition and the timing you are working to. The studio replies with a measured next step.`,
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
