const fs = require('fs');
const path = require('path');
const { readFolderGalleryProjectsSync } = require('../utils/folderGallery');
const { shared, pages } = require('./servicePages.data');
const {
  renderPublicPage,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderMediaStripSection,
  renderFaqSection,
  renderLinkClusterSection
} = require('./publicPageRenderer');
const { buildFaqJsonLd } = require('./publicPageBuild.shared');

const projectRoot = path.resolve(__dirname, '..');
const galleryPath = path.join(projectRoot, 'Gallery');

const buildServicePages = () => {
  const galleryProjects = readFolderGalleryProjectsSync(galleryPath);

  return pages.map((page) => ({
    fileName: page.fileName,
    html: renderPublicPage({
      shared,
      fileName: page.fileName,
      title: page.title,
      metaDescription: page.metaDescription,
      ogImage: page.ogImage,
      bodyClass: page.bodyClass,
      generatedBy: 'npm run generate:services',
      breadcrumbItems: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services.html' },
        { label: page.title.replace(` | ${shared.brandName}`, ''), href: `/${page.fileName}` }
      ],
      jsonLd: [
        {
          ...page.jsonLd,
          url: `${shared.siteUrl}/${page.fileName}`
        },
        buildFaqJsonLd(`${shared.siteUrl}/${page.fileName}`, page.faq.items)
      ],
      hero: page.hero,
      galleryProjects,
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
        renderLinkClusterSection({
          eyebrow: 'Service routes',
          title: 'Move between service, gallery and local intent.',
          groups: page.internalLinks || []
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
};

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
