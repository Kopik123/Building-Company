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
const {
  buildAreaItems,
  buildFaqJsonLd,
  buildLinksByLabel
} = require('./publicPageBuild.shared');

const projectRoot = path.resolve(__dirname, '..');

const LOCATION_BOARD_CONFIG = {
  'premium-renovations-didsbury.html': {
    headingTitle: 'Didsbury Renovations',
    projects: [
      {
        name: 'Didsbury Ensuite Reset',
        images: [
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      },
      {
        name: 'Kitchen and Utility Continuity',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg'
        ]
      },
      {
        name: 'Interior Detail and Carpentry',
        images: [
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg',
          '/Gallery/premium/brick-dark-main.jpg'
        ]
      }
    ]
  },
  'premium-renovations-altrincham.html': {
    headingTitle: 'Altrincham Renovations',
    projects: [
      {
        name: 'Altrincham Kitchen Overhaul',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg'
        ]
      },
      {
        name: 'Bathroom Finish Control',
        images: [
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      },
      {
        name: 'Joinery and Surface Tone',
        images: [
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/brick-detail-red.jpg',
          '/Gallery/premium/brick-dark-main.jpg'
        ]
      }
    ]
  },
  'premium-renovations-stockport.html': {
    headingTitle: 'Stockport Renovations',
    projects: [
      {
        name: 'Exterior-Linked Renovation Package',
        images: [
          '/Gallery/premium/exterior-front.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg',
          '/Gallery/premium/exterior-chimney.jpg'
        ]
      },
      {
        name: 'Kitchen and Interior Continuity',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg'
        ]
      },
      {
        name: 'Bathroom and Wall-System Detail',
        images: [
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      }
    ]
  },
  'premium-renovations-sale.html': {
    headingTitle: 'Sale Renovations',
    projects: [
      {
        name: 'Material-Led Renovation Detail',
        images: [
          '/Gallery/premium/brick-dark-main.jpg',
          '/Gallery/premium/brick-detail-red.jpg',
          '/Gallery/premium/brick-detail-charcoal.jpg'
        ]
      },
      {
        name: 'Bathroom Palette Discipline',
        images: [
          '/Gallery/premium/bathroom-tiles.jpg',
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg'
        ]
      },
      {
        name: 'Kitchen and Dining Sequence',
        images: [
          '/Gallery/premium/kitchen-panorama-right.jpg',
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg'
        ]
      }
    ]
  },
  'premium-renovations-chorlton.html': {
    headingTitle: 'Chorlton Renovations',
    projects: [
      {
        name: 'Graphic Stone-Detail Renovation',
        images: [
          '/Gallery/premium/brick-detail-charcoal.jpg',
          '/Gallery/premium/brick-dark-main.jpg',
          '/Gallery/premium/brick-detail-red.jpg'
        ]
      },
      {
        name: 'Bathroom Contrast and Brass',
        images: [
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-tiles.jpg',
          '/Gallery/premium/bathroom-main.jpg'
        ]
      },
      {
        name: 'Kitchen and Joinery Continuity',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg'
        ]
      }
    ]
  },
  'premium-renovations-wilmslow.html': {
    headingTitle: 'Wilmslow Renovations',
    projects: [
      {
        name: 'Quiet-Luxury Exterior and Interior Pairing',
        images: [
          '/Gallery/premium/exterior-chimney.jpg',
          '/Gallery/premium/exterior-front.jpg',
          '/Gallery/premium/exterior-wood-gables.jpg'
        ]
      },
      {
        name: 'Kitchen Precision and Lighting',
        images: [
          '/Gallery/premium/kitchen-panorama-main.jpg',
          '/Gallery/premium/kitchen-panorama-left.jpg',
          '/Gallery/premium/kitchen-panorama-right.jpg'
        ]
      },
      {
        name: 'Bathroom Refinement and Stone',
        images: [
          '/Gallery/premium/bathroom-main.jpg',
          '/Gallery/premium/bathroom-bathtub.jpg',
          '/Gallery/premium/bathroom-tiles.jpg'
        ]
      }
    ]
  }
};

const CORE_SERVICE_LABELS = [
  'Full Bathroom Renovations',
  'Kitchen Installation and Refurbishment',
  'Interior Wall Systems'
];

const buildLocationBoard = (page) => {
  const config = LOCATION_BOARD_CONFIG[page.fileName];

  return {
    boardVariant: 'studio-board',
    boardHeading: {
      eyebrow: `Premium renovations | ${page.location}`,
      title: config.headingTitle,
      lead: page.heroTitle
    },
    boardClaim: {
      eyebrow: 'Plan | Design | Craft',
      title: shared.claim,
      lead: page.heroLead
    },
    galleryProjects: config.projects,
    summarySections: [
      {
        type: 'areas',
        eyebrow: 'Coverage',
        title: 'The local brief sits inside the same direct North West coverage pattern.',
        region: shared.region,
        items: buildAreaItems(shared.serviceAreas, page.location)
      },
      {
        type: 'links',
        eyebrow: 'Services',
        title: 'Bathroom, kitchen and interior scopes stay inside one refined studio offer.',
        links: buildLinksByLabel(shared.serviceLinks, CORE_SERVICE_LABELS)
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
      formContext: page.location,
      locationValue: page.location,
      selectedProjectType: ''
    },
    galleryEyebrow: 'Selected Project',
    galleryTitle: 'Selected image',
    projectsEyebrow: 'Projects',
    projectsTitle: config.projects[0]?.name || `${page.location} project`,
    projectsLead: '',
    galleryCtaHref: '#consultation',
    galleryCtaLabel: shared.consultationCtaLabel,
    motionProfile: 'subtle'
  };
};

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
