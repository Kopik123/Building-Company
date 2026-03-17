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
const {
  buildAreaItems,
  buildFaqJsonLd,
  buildLinksByLabel
} = require('./publicPageBuild.shared');

const projectRoot = path.resolve(__dirname, '..');

const SERVICE_BOARD_CONFIG = {
  'premium-bathrooms-manchester.html': {
    headingTitle: 'Bathrooms',
    relatedLabels: [
      'Full Bathroom Renovations',
      'Tiling incl. Large Format / Wet Showers',
      'Carpentry',
      'Interior Wall Systems'
    ],
    projects: [
      {
        name: 'Didsbury Ensuite Rebuild',
        images: [
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      },
      {
        name: 'Wet-Room Tile Detail',
        images: [
          '/Gallery/premium/bathroom-tiles.jpg',
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg'
        ]
      },
      {
        name: 'Brass and Storage Composition',
        images: [
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      }
    ]
  },
  'premium-kitchens-manchester.html': {
    headingTitle: 'Kitchens',
    relatedLabels: [
      'Kitchen Installation and Refurbishment',
      'Carpentry',
      'Flooring Installation',
      'Interior Wall Systems'
    ],
    projects: [
      {
        name: 'Altrincham Kitchen Overhaul',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg'
        ]
      },
      {
        name: 'Island and Lighting Composition',
        images: [
          '/Gallery/premium/kitchen-panorama-right.jpg',
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg'
        ]
      },
      {
        name: 'Cabinet Alignment Detail',
        images: [
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg'
        ]
      }
    ]
  },
  'interior-renovations-manchester.html': {
    headingTitle: 'Interiors | Wall Systems',
    relatedLabels: [
      'Carpentry',
      'Interior Wall Systems',
      'External Wall Systems',
      'Flooring Installation'
    ],
    projects: [
      {
        name: 'North West Interior Refresh',
        images: [
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg',
          '/Gallery/premium/exterior-front.jpg'
        ]
      },
      {
        name: 'Envelope and Material Pairing',
        images: [
          '/Gallery/premium/exterior-front.jpg',
          '/Gallery/premium/exterior-chimney.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg'
        ]
      },
      {
        name: 'Joinery and Surface Control',
        images: [
          '/Gallery/premium/brick-dark-main.jpg',
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/brick-detail-red.jpg'
        ]
      }
    ]
  }
};

const buildServiceBoard = (page) => {
  const config = SERVICE_BOARD_CONFIG[page.fileName];

  return {
    boardVariant: 'studio-board',
    boardHeading: {
      eyebrow: `Premium service | ${page.consultation.locationValue}`,
      title: config.headingTitle,
      lead: page.hero.title
    },
    boardClaim: {
      eyebrow: 'Plan | Design | Craft',
      title: shared.claim,
      lead: page.hero.lead
    },
    galleryProjects: config.projects,
    summarySections: [
      {
        type: 'areas',
        eyebrow: 'Coverage',
        title: 'North West coverage kept close enough for direct studio oversight.',
        region: shared.region,
        items: buildAreaItems(shared.serviceAreas, page.consultation.locationValue)
      },
      {
        type: 'links',
        eyebrow: 'Services',
        title: 'Connected scopes handled inside the same premium studio offer.',
        links: buildLinksByLabel(shared.serviceLinks, config.relatedLabels)
      },
      {
        type: 'contact',
        eyebrow: 'Contact Details',
        title: 'Direct studio contact'
      }
    ],
    fastQuoteDefaults: {
      eyebrow: 'Private Consultation',
      title: shared.enquiryTitle,
      lead: shared.enquiryLead,
      formContext: page.consultation.formContext,
      locationValue: page.consultation.locationValue,
      selectedProjectType: page.consultation.selectedProjectType
    },
    galleryEyebrow: 'Selected Project',
    galleryTitle: 'Selected image',
    projectsEyebrow: 'Projects',
    projectsTitle: config.projects[0]?.name || 'Selected project',
    projectsLead: '',
    galleryCtaHref: '#consultation',
    galleryCtaLabel: shared.consultationCtaLabel,
    motionProfile: 'subtle'
  };
};

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
