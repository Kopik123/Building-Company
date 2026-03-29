const assetManifest = globalThis.LEVEL_LINES_ASSETS || {};
const brandAssets = assetManifest.brand || {};
const roleProfiles = {
  client: {
    label: 'Client',
    accountPath: '/client-dashboard.html'
  },
  employee: {
    label: 'Employee',
    accountPath: '/manager-dashboard.html',
    managerWorkspace: true
  },
  manager: {
    label: 'Manager',
    accountPath: '/manager-dashboard.html',
    managerWorkspace: true,
    canRunSeed: true
  },
  admin: {
    label: 'Admin',
    accountPath: '/manager-dashboard.html',
    managerWorkspace: true,
    canRunSeed: true
  }
};
const managerQuickAccess = [
  {
    key: 'createProject',
    label: 'Create Project',
    href: '/manager-dashboard.html#projects',
    roles: ['employee', 'manager', 'admin']
  },
  {
    key: 'projectManager',
    label: 'ProjectManager',
    href: '/manager-dashboard.html#projects',
    roles: ['employee', 'manager', 'admin']
  },
  {
    key: 'quotesReview',
    label: 'QuotesReview',
    href: '/manager-dashboard.html#quotes',
    roles: ['manager', 'admin']
  },
  {
    key: 'servicesManage',
    label: 'ServicesManage',
    href: '/manager-dashboard.html#services',
    roles: ['manager', 'admin']
  },
  {
    key: 'materialsTrack',
    label: 'MaterialsTrack',
    href: '/manager-dashboard.html#stock',
    roles: ['manager', 'admin']
  },
  {
    key: 'clients',
    label: 'Clients',
    href: '/manager-dashboard.html#crm',
    roles: ['manager', 'admin']
  },
  {
    key: 'staff',
    label: 'Staff',
    href: '/manager-dashboard.html#staff',
    roles: ['manager', 'admin']
  },
  {
    key: 'estimate',
    label: 'Estimate',
    href: '/manager-dashboard.html#estimates',
    roles: ['manager', 'admin']
  },
  {
    key: 'privateChat',
    label: 'PrivateChat',
    href: '/manager-dashboard.html#inbox:private',
    roles: ['employee', 'manager', 'admin']
  },
  {
    key: 'projectChat',
    label: 'ProjectChat',
    href: '/manager-dashboard.html#inbox:project',
    roles: ['employee', 'manager', 'admin']
  }
];

globalThis.LEVEL_LINES_BRAND = {
  name: 'Level Lines Studio',
  shortName: 'Level Lines',
  claim: 'Plan | Design | Craft',
  region: 'Manchester and the North West',
  headerIconPath: brandAssets.headerIcon?.fallback || '/logo.png',
  titleImagePath: brandAssets.title?.fallback || '/title.png',
  workspaceImagePath: brandAssets.workspace?.fallback || '/logo4.png',
  publicAuthLabel: 'Account',
  roleProfiles,
  consultationCtaLabel: 'Send Enquiry',
  footerCopy: 'A premium renovation studio for bathrooms, kitchens and interiors, shaped for quieter planning and finish control across Manchester and the North West.',
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
  budgetRanges: ['\u00A33,000-\u00A36,000', '\u00A36,000-\u00A38,000', '\u00A38,000-\u00A312,000', '\u00A312,000-\u00A320,000', '\u00A320,000-\u00A330,000', '\u00A330,000+'],
  copy: {
    home: {
      heroLead: 'Level Lines Studio shapes premium bathroom, kitchen and interior renovation briefs for homeowners who want cleaner scope, quieter planning and stronger finish control.',
      servicesTitle: 'A curated renovation scope held in one studio structure.',
      servicesLead: 'Bathrooms, kitchens, tiling, carpentry and wall systems stay aligned inside one service-led route.',
      processLead: 'Plan, design and craft stay connected from first survey to final handover.',
      areasLead: 'The studio footprint stays selective enough for direct oversight and controlled delivery.',
      contactLead: 'Direct studio contact stays visible because first conversations should feel clear and calm.',
      consultationTitle: 'Send Enquiry',
      consultationLead:
        'Share the rooms involved, finish level and timing. The studio replies with the right next step.'
    },
    about: {
      heroLead: 'A premium renovation studio shaped around clearer scope, restrained materials and deliberate execution.'
    },
    contact: {
      heroLead: 'Contact the studio directly when the brief calls for premium finish control and a cleaner route from enquiry to site.'
    },
    quote: {
      heroLead: 'Use one private enquiry route for bathroom, kitchen and interior briefs, then describe rooms, timing and finish level.'
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
  featuredLocationLinks: [
    {
      label: 'Didsbury',
      href: '/premium-renovations-didsbury.html'
    },
    {
      label: 'Altrincham',
      href: '/premium-renovations-altrincham.html'
    },
    {
      label: 'Stockport',
      href: '/premium-renovations-stockport.html'
    },
    {
      label: 'Sale',
      href: '/premium-renovations-sale.html'
    },
    {
      label: 'Chorlton',
      href: '/premium-renovations-chorlton.html'
    },
    {
      label: 'Wilmslow',
      href: '/premium-renovations-wilmslow.html'
    }
  ],
  managerQuickAccess,
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
      title: 'Tiling incl. Large Format / Wet Showers / Exterior',
      category: 'tiling',
      aliases: ['tiling', 'tiles', 'tile setting', 'tile installation', 'large format tiling', 'wet showers', 'exterior tiling', 'external tiling'],
      image: '/Gallery/premium/bathroom-tiles.jpg',
      href: '/quote.html',
      cta: 'Request consultation',
      description: 'Tiling for large-format surfaces, wet showers and exterior areas delivered with straight setting-out, aligned cuts and disciplined trims.'
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
      key: 'interior-exterior-wall',
      title: 'Interior and Exterior Wall',
      category: 'interior',
      aliases: ['interior', 'rendering', 'outdoor', 'interior wall systems', 'interior wall system', 'external wall systems', 'external wall system', 'internal wall systems', 'internal wall system', 'internal walls', 'external walls', 'wall systems', 'wall system', 'full interior refurbishment', 'full-interior-refurbishment'],
      image: '/Gallery/premium/brick-detail-charcoal.jpg',
      href: '/quote.html?projectType=interior#quote-card',
      cta: 'Discuss wall systems',
      description: 'Interior and external wall systems scoped with correct build-ups, sequencing and finish consistency.'
    }
  ]
};



