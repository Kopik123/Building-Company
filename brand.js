const assetManifest = window.LEVEL_LINES_ASSETS || {};
const brandAssets = assetManifest.brand || {};

window.LEVEL_LINES_BRAND = {
  name: 'Level Lines Studio',
  shortName: 'Level Lines',
  claim: 'Plan | Design | Craft',
  region: 'North West - Lancashire',
  headerIconPath: brandAssets.headerIcon?.fallback || '/logo.png',
  titleImagePath: brandAssets.title?.fallback || '/title.png',
  workspaceImagePath: brandAssets.workspace?.fallback || '/logo4.png',
  publicAuthLabel: 'Account',
  consultationCtaLabel: 'Send Enquiry',
  footerCopy: 'A premium renovation studio for bathrooms, kitchens and interiors, shaped with quiet planning, material restraint and finish control across the North West.',
  email: 'LevelLineStudioMCR@gmail.com',
  phones: [
    {
      label: 'Studio line 1',
      display: '+44 7942 874 446',
      href: 'tel:+447942874446'
    },
    {
      label: 'Studio line 2',
      display: '+44 7304 506 391',
      href: 'tel:+447304506391'
    }
  ],
  budgetRanges: ['\u00A38,000-\u00A312,000', '\u00A312,000-\u00A320,000', '\u00A320,000-\u00A330,000', '\u00A330,000+'],
  copy: {
    home: {
      heroLead: 'Level Lines Studio shapes premium bathroom, kitchen and interior renovation briefs for homeowners who expect strong line quality, quieter luxury and a controlled building process.',
      servicesTitle: 'A curated renovation scope held in one premium studio structure.',
      servicesLead: 'Bathrooms, kitchens, large-format tiling, carpentry, wall systems and flooring are held in one composed scope, so layout logic, detailing and finish control stay aligned.',
      processLead: 'Plan, design and craft are treated as one disciplined sequence: define the brief properly, shape the material language and execute without noise.',
      areasLead: 'The studio keeps its footprint close enough for direct oversight, tighter sequencing and more controlled communication.',
      contactLead: 'Direct studio numbers and email remain visible because first conversations should feel precise, calm and uncomplicated.',
      consultationTitle: 'Send Enquiry',
      consultationLead:
        'Share the rooms involved, the finish ambition and your timing. The studio replies with a measured next step.'
    },
    about: {
      heroLead: 'A premium renovation studio shaped around line quality, restrained materials and execution that feels deliberate rather than improvised.'
    },
    contact: {
      heroLead: 'Contact the studio directly when the brief calls for premium finish control, cleaner planning and a quieter route from enquiry to site.'
    },
    quote: {
      heroLead: 'Use one private enquiry route for bathroom, kitchen and interior briefs, then describe the rooms, timing and finish ambition.'
    }
  },
  serviceAreas: [
    'Manchester',
    'Liverpool',
    'Preston',
    'Sheffield',
    'Rochdale',
    'Leeds',
    'Oldham',
    'Macclesfield',
    'Stockport',
    'Northwich',
    'Warrington'
  ],
  pillars: ['Plan', 'Design', 'Craft'],
  services: [
    {
      key: 'bathrooms',
      title: 'Full Bathroom Renovations',
      category: 'bathroom',
      aliases: ['bathroom', 'bathrooms', 'full bathroom renovations', 'premium bathroom', 'premium bathroom renovation', 'premium-bathroom-renovation'],
      image: '/Gallery/premium/bathroom-main.jpg',
      href: '/premium-bathrooms-manchester.html',
      cta: 'Explore bathrooms',
      description: 'Full bathroom renovations with measured planning, waterproof detailing, premium tiling and clean final finishing.'
    },
    {
      key: 'kitchens',
      title: 'Kitchen Installation and Refurbishment',
      category: 'kitchen',
      aliases: ['kitchen', 'kitchens', 'kitchen installation and refurbishment', 'bespoke kitchen', 'bespoke kitchen renovation', 'kitchen renovation', 'bespoke-kitchen-renovation'],
      image: '/Gallery/premium/kitchen-panorama-main.jpg',
      href: '/premium-kitchens-manchester.html',
      cta: 'Explore kitchens',
      description: 'Kitchen installation and refurbishment shaped around layout logic, storage planning, coordinated services and precise fitting.'
    },
    {
      key: 'tiling',
      title: 'Tiling incl. Large Format / Wet Showers',
      category: 'tiling',
      aliases: ['tiling', 'tiles', 'tile setting', 'tile installation', 'large format tiling', 'wet showers'],
      image: '/Gallery/premium/bathroom-tiles.jpg',
      href: '/quote.html',
      cta: 'Request consultation',
      description: 'Tiling for large-format surfaces and wet showers delivered with straight setting-out, aligned cuts and disciplined trims.'
    },
    {
      key: 'carpentry',
      title: 'Carpentry',
      category: 'joinery',
      aliases: ['carpentry', 'joinery', 'bespoke joinery', 'trim work'],
      image: '/Gallery/premium/exterior-wood-gables.jpg',
      href: '/quote.html',
      cta: 'Discuss carpentry',
      description: 'Carpentry and joinery delivered with clean reveals, storage detailing, trim precision and a finish standard that matches the wider brief.'
    },
    {
      key: 'external-wall-systems',
      title: 'External Wall Systems',
      category: 'rendering',
      aliases: ['rendering', 'outdoor', 'external wall systems', 'external wall system', 'external walls', 'facade enhancement'],
      image: '/Gallery/premium/exterior-front.jpg',
      href: '/quote.html',
      cta: 'Discuss exterior scope',
      description: 'External wall systems delivered with envelope awareness, finish consistency and disciplined site sequencing.'
    },
    {
      key: 'interior-wall-systems',
      title: 'Interior Wall Systems',
      category: 'interior',
      aliases: ['interior', 'interior wall systems', 'interior wall system', 'internal wall systems', 'internal wall system', 'internal walls', 'full interior refurbishment', 'full-interior-refurbishment'],
      image: '/Gallery/premium/brick-detail-charcoal.jpg',
      href: '/quote.html',
      cta: 'Discuss wall systems',
      description: 'Interior wall systems planned for clean lines, correct build-ups, service coordination and durable performance.'
    },
    {
      key: 'flooring-installation',
      title: 'Flooring Installation',
      category: 'other',
      aliases: ['flooring', 'flooring installation', 'floor installation', 'floor fit-out'],
      image: '/Gallery/premium/brick-dark-main.jpg',
      href: '/quote.html',
      cta: 'Discuss flooring',
      description: 'Flooring installation delivered with level preparation, careful setting-out and a finish standard that matches the wider brief.'
    }
  ]
};



