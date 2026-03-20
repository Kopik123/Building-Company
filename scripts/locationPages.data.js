const shared = require('./publicPages.shared');
const coreServiceOffer = shared.coreServiceOffer;
const buildLocationMetaDescription = (location) =>
  `Selective bathroom, kitchen and interior renovation briefs in ${location} by Level Lines Studio for homeowners who value finish control, quieter luxury and a calmer build process.`;

const pages = [
  {
    fileName: 'premium-renovations-didsbury.html',
    location: 'Didsbury',
    primaryKeyword: 'premium renovations didsbury',
    searchIntent: 'location',
    summaryLine: 'Didsbury bathroom, kitchen and interior briefs shaped through one premium studio route.',
    proofPoints: ['Bathrooms and kitchens', 'Character-property fit', 'Quote-first intake'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/bathroom-main.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/bathroom-main.jpg',
    metaDescription: buildLocationMetaDescription('Didsbury'),
    heroTitle: 'Didsbury renovations with measured bathroom, kitchen and interior detail.',
    heroLead:
      `Didsbury homes respond well to a quieter ${coreServiceOffer} studio scope, delivered with calmer finishes, exact tile lines and private consultation-led sequencing.`,
    localTitle: 'Didsbury projects shaped by detail, not generic packages.',
    localLead:
      `Character properties and design-conscious refurbishments in Didsbury benefit from a joined-up ${coreServiceOffer} brief shaped into one coherent finish language.`,
    pillars: [
      { title: 'Bathrooms', body: 'Stone-led bathroom upgrades with clean tile setting and storage integration.' },
      { title: 'Kitchens', body: 'Measured kitchen reworking with calm proportions and precise fitting.' },
      { title: 'Interior scope', body: 'Selective carpentry and wall-system work where continuity matters beyond one room.' }
    ],
    caseStudy: {
      title: 'Victorian ensuite reset',
      lead:
        'A darker, more composed ensuite build with tile alignment and brass detailing doing the visual work instead of decorative clutter.',
      metrics: ['Victorian property context', 'Premium bathroom finish', 'Joinery-led storage'],
      image: '/Gallery/premium/bathroom-bathtub.jpg',
      imageAlt: 'Victorian ensuite reset'
    },
    faq: [
      {
        q: 'Do you take on character properties in Didsbury?',
        a: 'Yes. Older properties benefit from slower, more thoughtful sequencing and we plan accordingly.'
      },
      {
        q: 'Can you phase work around occupancy?',
        a: 'Where the brief allows, we can structure phases to minimise disruption while keeping quality under control.'
      },
      {
        q: 'What kind of finish level do you target?',
        a: 'The goal is calm, premium detail with strong alignment, durable materials and a cohesive palette.'
      }
    ]
  },
  {
    fileName: 'premium-renovations-altrincham.html',
    location: 'Altrincham',
    primaryKeyword: 'premium renovations altrincham',
    searchIntent: 'location',
    summaryLine: 'Altrincham renovation briefs delivered with kitchen-led planning and measured finish control.',
    proofPoints: ['Kitchen-led briefs', 'Bathroom upgrades', 'Joinery support'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/kitchen-panorama-right.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/kitchen-panorama-right.jpg',
    metaDescription: buildLocationMetaDescription('Altrincham'),
    heroTitle: 'Altrincham renovations with kitchen-led planning and measured finish control.',
    heroLead:
      `Altrincham projects often start with kitchens, but the same ${coreServiceOffer} studio scope extends cleanly into the rest of the brief.`,
    localTitle: 'Altrincham projects shaped by detail, not generic packages.',
    localLead:
      `The strongest Altrincham briefs treat ${coreServiceOffer} as one coordinated premium scope instead of a disconnected set of trades.`,
    pillars: [
      { title: 'Kitchen focus', body: 'Cabinet lines, worktops and lighting planned as one architectural layer.' },
      { title: 'Bathroom detail', body: 'Wet-zone planning and tile setting delivered without rushed finishing.' },
      { title: 'Carpentry support', body: 'Joinery and trim work refine the whole interior, not just one room.' }
    ],
    caseStudy: {
      title: 'Contemporary kitchen overhaul',
      lead: 'A clean, darker kitchen composition with precise cabinetry and material control carrying the brief.',
      metrics: ['Contemporary family home', 'Kitchen-led scope', 'Lighting and stone coordination'],
      image: '/Gallery/premium/kitchen-panorama-main.jpg',
      imageAlt: 'Contemporary kitchen overhaul'
    },
    faq: [
      {
        q: 'Can you renovate just one premium room?',
        a: 'Yes. Single-room scopes are viable when the finish brief and budget match the studio threshold.'
      },
      {
        q: 'Do you work with supplied design ideas?',
        a: 'Yes. We can refine an existing direction and strengthen it technically before site work begins.'
      },
      {
        q: 'Are Altrincham projects handled locally?',
        a: 'Yes. Altrincham sits inside the direct service footprint shown across the new site.'
      }
    ]
  },
  {
    fileName: 'premium-renovations-stockport.html',
    location: 'Stockport',
    primaryKeyword: 'premium renovations stockport',
    searchIntent: 'location',
    summaryLine: 'Stockport renovation briefs held together by stronger carpentry, wall-system and finish discipline.',
    proofPoints: ['Interior and exterior scope', 'Wall-system discipline', 'Finish-first sequencing'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/exterior-wood-gables.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/exterior-wood-gables.jpg',
    metaDescription: buildLocationMetaDescription('Stockport'),
    heroTitle: 'Stockport renovations with stronger carpentry, wall-system and finish discipline.',
    heroLead:
      `Stockport briefs often need the studio's ${coreServiceOffer} scope to keep practical upgrades and premium detailing aligned.`,
    localTitle: 'Stockport projects shaped by detail, not generic packages.',
    localLead:
      `The studio approach suits Stockport properties that need robust sequencing, envelope awareness and a more composed finish language across ${coreServiceOffer}.`,
    pillars: [
      { title: 'Bathrooms', body: 'Waterproofing, tile lines and trim details handled with premium discipline.' },
      { title: 'Kitchens', body: 'Storage logic and finish tone resolved before fit-out.' },
      { title: 'Wall systems', body: 'Internal or external wall packages discussed as part of a whole brief.' }
    ],
    caseStudy: {
      title: 'Exterior-linked renovation package',
      lead: 'A scope where exterior carpentry and envelope detail had to sit cleanly alongside premium interior work.',
      metrics: ['Exterior and interior coordination', 'Wall-system scope', 'Finish-first sequencing'],
      image: '/Gallery/premium/exterior-front.jpg',
      imageAlt: 'Exterior-linked renovation package'
    },
    faq: [
      {
        q: 'Do you handle external envelope details?',
        a: 'Yes, where exterior wall and finish work need to be integrated into the full project brief.'
      },
      {
        q: 'Is this only for large projects?',
        a: 'No. The real threshold is design fit and finish ambition, not simply project size.'
      },
      {
        q: 'Can you coordinate multiple trades?',
        a: 'Yes. The studio structure is designed specifically to keep multi-trade work coherent.'
      }
    ]
  },
  {
    fileName: 'premium-renovations-sale.html',
    location: 'Sale',
    primaryKeyword: 'premium renovations sale manchester',
    searchIntent: 'location',
    summaryLine: 'Sale renovation briefs shaped through restrained palettes and tighter material control.',
    proofPoints: ['Material restraint', 'Selective room upgrades', 'Premium finish control'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/brick-detail-red.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/brick-detail-red.jpg',
    metaDescription: buildLocationMetaDescription('Sale'),
    heroTitle: 'Sale renovations with calmer palettes and tighter material control.',
    heroLead:
      `Sale projects respond well to a ${coreServiceOffer} studio scope delivered with restrained palettes and tighter detailing.`,
    localTitle: 'Sale projects shaped by detail, not generic packages.',
    localLead:
      `For Sale properties, the strongest results come from shaping ${coreServiceOffer} into one quieter, more deliberate finish language.`,
    pillars: [
      { title: 'Material restraint', body: 'Tones and finishes are selected to feel composed rather than busy.' },
      { title: 'Craft control', body: 'Tile lines, trims and interfaces stay visually tight.' },
      { title: 'Broader scope', body: 'Bathrooms, kitchens and adjacent interior work can be planned together.' }
    ],
    caseStudy: {
      title: 'Material-led renovation detail',
      lead: 'A finish-first scope where brick, tile and trim choices needed to feel richer without becoming loud.',
      metrics: ['Material palette discipline', 'Selective room upgrades', 'Premium finish control'],
      image: '/Gallery/premium/brick-dark-main.jpg',
      imageAlt: 'Material-led renovation detail'
    },
    faq: [
      {
        q: 'Can you work with an existing palette?',
        a: 'Yes. We can refine a starting palette so the finished space reads more deliberate.'
      },
      {
        q: 'Do you only do full-home projects?',
        a: 'No. We also take on focused room scopes where the detail standard is right.'
      },
      {
        q: 'How do we start in Sale?',
        a: 'Use the same private consultation route and we will shape the brief from there.'
      }
    ]
  },
  {
    fileName: 'premium-renovations-chorlton.html',
    location: 'Chorlton',
    primaryKeyword: 'premium renovations chorlton',
    searchIntent: 'location',
    summaryLine: 'Chorlton renovation briefs delivered with graphic materials and disciplined detailing.',
    proofPoints: ['Stone and tile detail', 'Joinery control', 'Craft-focused delivery'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/brick-dark-main.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/brick-dark-main.jpg',
    metaDescription: buildLocationMetaDescription('Chorlton'),
    heroTitle: 'Chorlton renovations with graphic materials and disciplined detailing.',
    heroLead:
      `Chorlton projects suit the studio's ${coreServiceOffer} scope when the brief calls for a darker, more graphic finish language.`,
    localTitle: 'Chorlton projects shaped by detail, not generic packages.',
    localLead:
      'Whether the brief starts with bathrooms, kitchens or carpentry, the studio keeps the wider offer aligned in one controlled line.',
    pillars: [
      { title: 'Stone and tile', body: 'Graphic surface treatments are handled with clean set-out and disciplined contrast.' },
      { title: 'Joinery detail', body: 'Carpentry and trim choices hold the composition together.' },
      { title: 'Premium process', body: 'Site work is sequenced to protect finish quality instead of chasing speed.' }
    ],
    caseStudy: {
      title: 'Graphic stone-detail renovation',
      lead:
        'A darker material scheme where the success of the project depended on line quality, contrast and careful interface detailing.',
      metrics: ['Stone-led palette', 'High-contrast finish', 'Craft-focused execution'],
      image: '/Gallery/premium/brick-detail-charcoal.jpg',
      imageAlt: 'Graphic stone-detail renovation'
    },
    faq: [
      {
        q: 'Can darker palettes still feel premium and calm?',
        a: 'Yes. With the right line work and material balance, darker schemes feel composed rather than heavy.'
      },
      {
        q: 'Do you advise on contrast and metals?',
        a: 'Yes. Metal tone, stone value and trim detail are all part of the design phase.'
      },
      {
        q: 'Is Chorlton in direct coverage?',
        a: 'Yes. It sits within the core coverage pattern already shown across the site.'
      }
    ]
  },
  {
    fileName: 'premium-renovations-wilmslow.html',
    location: 'Wilmslow',
    primaryKeyword: 'premium renovations wilmslow',
    searchIntent: 'location',
    summaryLine: 'Wilmslow renovation briefs shaped for quieter luxury and stronger finish discipline.',
    proofPoints: ['Quiet-luxury finish', 'Kitchen and bathroom scope', 'Interior continuity'],
    internalLinks: [
      {
        eyebrow: 'Service routes',
        title: 'Core service pages',
        lead: 'Start with the service line that leads the brief, then move into quote.',
        links: [
          { href: '/premium-bathrooms-manchester.html', label: 'Bathroom service' },
          { href: '/premium-kitchens-manchester.html', label: 'Kitchen service' },
          { href: '/interior-renovations-manchester.html', label: 'Interior service' }
        ]
      },
      {
        eyebrow: 'Next step',
        title: 'Move into the brief',
        lead: 'Use the direct route when the rooms, timing and finish level are known.',
        links: [
          { href: '/quote.html', label: 'Start Quote' },
          { href: '/services.html', label: 'Services hub' },
          { href: '/gallery.html', label: 'View Gallery' }
        ]
      }
    ],
    suppressHelperCopy: true,
    heroImage: '/Gallery/premium/exterior-front.jpg',
    ogImage: 'https://levellines.co.uk/Gallery/premium/exterior-front.jpg',
    metaDescription: buildLocationMetaDescription('Wilmslow'),
    heroTitle: 'Wilmslow renovations with quieter luxury and stronger finish discipline.',
    heroLead:
      `Wilmslow briefs often call for the same ${coreServiceOffer} scope, delivered through the studio's plan / design / craft structure.`,
    localTitle: 'Wilmslow projects shaped by detail, not generic packages.',
    localLead:
      `The studio approach fits Wilmslow particularly well when ${coreServiceOffer} needs to read as one premium scope without visual excess.`,
    pillars: [
      { title: 'Bathroom refinement', body: 'Stone, glass and brass details are balanced for a calmer premium read.' },
      { title: 'Kitchen precision', body: 'Cabinet and worktop alignment drive the quality impression.' },
      { title: 'Interior continuity', body: 'Additional carpentry and wall work extend the same language across the property.' }
    ],
    caseStudy: {
      title: 'Quiet-luxury exterior and interior pairing',
      lead: 'An architectural brief where the envelope and the interior finish language needed to read as one premium whole.',
      metrics: ['Quiet luxury brief', 'Interior/exterior continuity', 'Selective premium detailing'],
      image: '/Gallery/premium/exterior-chimney.jpg',
      imageAlt: 'Quiet-luxury exterior and interior pairing'
    },
    faq: [
      {
        q: 'Do you work on high-spec finish upgrades?',
        a: 'Yes. Many Wilmslow enquiries are finish-led projects rather than purely functional refurbishments.'
      },
      {
        q: 'Can you match an architect or designer vision?',
        a: 'Yes. The studio is comfortable translating an existing visual direction into buildable detail.'
      },
      {
        q: 'Do you cover surrounding areas too?',
        a: 'Yes. Wilmslow sits within a wider North West footprint that includes Stockport, Macclesfield and Manchester.'
      }
    ]
  }
];

module.exports = {
  shared,
  pages
};
