const fs = require('fs');
const path = require('path');
const { readFolderGalleryProjectsSync } = require('../utils/folderGallery');
const { shared, pages } = require('./locationPages.data');
const {
  renderPublicPage,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderFaqSection,
  renderLinkClusterSection
} = require('./publicPageRenderer');
const { buildFaqJsonLd } = require('./publicPageBuild.shared');

const projectRoot = path.resolve(__dirname, '..');
const galleryPath = path.join(projectRoot, 'Gallery');

const buildLocationPages = () => {
  const galleryProjects = readFolderGalleryProjectsSync(galleryPath);

  return pages.map((page) => ({
    fileName: page.fileName,
    html: renderPublicPage({
      shared,
      fileName: page.fileName,
      title: `Premium Renovations in ${page.location} | ${shared.brandName}`,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      bodyClass: 'public-site page-location',
      generatedBy: 'npm run generate:locations',
      breadcrumbItems: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services.html' },
        { label: `Renovations in ${page.location}`, href: `/${page.fileName}` }
      ],
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
        eyebrow: `Renovations | ${page.location}`,
        title: page.heroTitle,
        lead: page.heroLead,
        chips: [
          { label: page.location },
          { label: shared.region, isBrandRegion: true },
          { label: shared.claim, isBrandClaim: true }
        ]
      },
      galleryProjects,
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
        renderLinkClusterSection({
          eyebrow: 'Local routes',
          title: `Service and quote routes for ${page.location}.`,
          groups: page.internalLinks || []
        }),
        renderFaqSection({
          eyebrow: 'FAQ',
          title: `Questions we usually answer before a ${page.location} brief starts.`,
          items: page.faq
        })
      ],
      contact: {
        title: `Discuss premium renovations in ${page.location} directly with the studio.`,
        lead: 'Every local brief keeps the same direct contact route so scope, finish ambition and sequencing can be clarified without delay.'
      },
      consultation: {
        title: shared.enquiryTitle,
        lead: shared.enquiryLead,
        formContext: `Location | ${page.location}`,
        locationValue: page.location,
        selectedProjectType: ''
      }
    })
  }));
};

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
