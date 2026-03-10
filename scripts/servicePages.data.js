const shared = require('./publicPages.shared');

const coreServiceOffer = shared.coreServiceOffer;
const consultationRouteLead =
  'Tell us the rooms involved, the finish ambition and the timing you are aiming for. The studio replies with a measured next step rather than a generic sales response.';

const pages = [
  {
    fileName: 'premium-bathrooms-manchester.html',
    title: 'Premium Bathroom Renovations Manchester | Level Lines Studio',
    metaDescription:
      'Premium bathroom renovations in Manchester by Level Lines Studio for homeowners who value waterproofing discipline, finish control and a calmer build sequence.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/bathroom-main.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Premium Bathroom Renovations in Manchester',
      description:
        'Premium bathroom renovations in Manchester with measured planning, waterproofing discipline and finish control by Level Lines Studio.',
      serviceType: 'Premium bathroom renovations',
      image: 'https://levellines.co.uk/Gallery/premium/bathroom-main.jpg',
      provider: {
        '@type': 'LocalBusiness',
        name: shared.brandName,
        telephone: shared.phones.map((phone) => phone.display),
        email: shared.email
      },
      areaServed: ['Manchester', shared.region]
    },
    hero: {
      image: '/Gallery/premium/bathroom-main.jpg',
      eyebrow: 'Bathrooms',
      title: 'Bathrooms designed for calm, waterproofed and finished with measured detail.',
      lead:
        `Bathrooms are delivered as part of a quieter ${coreServiceOffer} studio scope, where planning, waterproofing, tiling and finish control stay aligned from the first survey to handover.`,
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Studio Scope',
      title: 'A bathroom service built around detail control.',
      lead:
        'The bathroom line is delivered as one service inside that joined-up studio offer, so survey planning, waterproofing, tile setting, carpentry support and final detailing stay tightly coordinated.',
      detailListItems: [
        'Survey-led planning before demolition and first-fix.',
        'Feature tile layouts and stone-led finish palettes.',
        'Integrated carpentry and storage where the brief demands it.',
        'Clean handover standards with no rushed final detailing.'
      ]
    },
    priorities: {
      eyebrow: 'Studio Method',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Layout discipline', body: 'Circulation, shower zones and storage are resolved before wet-zone work starts.' },
        { title: 'Material control', body: 'Every tile, trim and brass finish is coordinated for one visual language.' },
        { title: 'Craft execution', body: 'Setting out, waterproofing and finish alignment stay under close supervision.' }
      ]
    },
    feature: {
      eyebrow: 'Selected Project',
      title: 'Didsbury ensuite rebuild',
      lead:
        'A compact ensuite upgraded into a darker, richer composition with aligned tile cuts, bespoke joinery and a controlled stone palette.',
      metrics: ['10-14 day programme', 'Stone and brass palette', 'Bespoke storage detailing'],
      image: '/Gallery/premium/bathroom-bathtub.jpg',
      imageAlt: 'Didsbury ensuite rebuild'
    },
    mediaStrip: {
      eyebrow: 'Finish Language',
      title: 'Material references for this service line.',
      images: [
        { src: '/Gallery/premium/bathroom-main.jpg', alt: 'Bathrooms project detail' },
        { src: '/Gallery/premium/bathroom-tiles.jpg', alt: 'Bathrooms project detail' },
        { src: '/Gallery/premium/bathroom-bathtub.jpg', alt: 'Bathrooms project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions homeowners ask before the brief is shaped.',
      items: [
        {
          q: 'Do you handle full strip-out bathroom projects?',
          a: 'Yes. We manage strip-out, preparation, waterproofing, installation and final finishing as one controlled sequence.'
        },
        {
          q: 'Can you help refine the material palette?',
          a: 'Yes. Stone tone, metal finish and tile format decisions are part of the design phase, not an afterthought.'
        },
        {
          q: 'What budget range suits this service?',
          a: 'Most premium bathroom briefs sit between GBP 8,000 and GBP 20,000 depending on layout change, materials and bespoke detailing.'
        }
      ]
    },
    contact: {
      title: 'Discuss bathrooms directly with the studio.',
      lead:
        'Bathroom enquiries move through the same direct studio contact route, so early decisions stay precise and the brief stays measured from the start.'
    },
    consultation: {
      title: 'Start your bathroom brief with a private consultation.',
      lead: consultationRouteLead,
      formContext: 'Bathrooms',
      locationValue: 'Manchester',
      selectedProjectType: 'bathroom'
    }
  },
  {
    fileName: 'premium-kitchens-manchester.html',
    title: 'Premium Kitchen Renovations Manchester | Level Lines Studio',
    metaDescription:
      'Premium kitchen renovations in Manchester by Level Lines Studio for homeowners who want layout clarity, joinery precision and tighter finish control.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/kitchen-panorama-main.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Premium Kitchen Renovations in Manchester',
      description:
        'Premium kitchen renovations in Manchester with layout-led planning, joinery precision and calm finish control by Level Lines Studio.',
      serviceType: 'Premium kitchen renovations',
      image: 'https://levellines.co.uk/Gallery/premium/kitchen-panorama-main.jpg',
      provider: {
        '@type': 'LocalBusiness',
        name: shared.brandName,
        telephone: shared.phones.map((phone) => phone.display),
        email: shared.email
      },
      areaServed: ['Manchester', shared.region]
    },
    hero: {
      image: '/Gallery/premium/kitchen-panorama-right.jpg',
      eyebrow: 'Kitchens',
      title: 'Kitchens planned around layout logic, storage and finish control.',
      lead:
        `Kitchens sit inside the wider ${coreServiceOffer} studio scope, with layout planning, service coordination, fitting and finishing kept in one joined-up sequence.`,
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Studio Scope',
      title: 'Kitchen work that feels designed, not assembled.',
      lead:
        'The kitchen line is delivered as one service inside that joined-up studio offer, so cabinetry, lighting, worktops, carpentry touchpoints and final finishing are resolved together.',
      detailListItems: [
        'Layout-led planning for islands, appliances and circulation.',
        'Cabinet, worktop and trim alignment checked as one system.',
        'Integrated carpentry and service coordination for a clean final read.',
        'A finish brief that prioritises lasting tone and texture.'
      ]
    },
    priorities: {
      eyebrow: 'Studio Method',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Planning clarity', body: 'Appliance, lighting and work-zone decisions are resolved before fit-out starts.' },
        { title: 'Joinery precision', body: 'Cabinet lines, stone edges and reveals are treated as the core visual language.' },
        { title: 'Daily performance', body: 'Practical use is designed in without diluting the premium feel.' }
      ]
    },
    feature: {
      eyebrow: 'Selected Project',
      title: 'Altrincham kitchen overhaul',
      lead:
        'A full kitchen reset centred on darker surfaces, warm lighting and tight cabinetry alignment for a quieter luxury read.',
      metrics: ['2-4 week programme', 'Custom joinery and lighting', 'Stone worktop coordination'],
      image: '/Gallery/premium/kitchen-panorama-main.jpg',
      imageAlt: 'Altrincham kitchen overhaul'
    },
    mediaStrip: {
      eyebrow: 'Finish Language',
      title: 'Material references for this service line.',
      images: [
        { src: '/Gallery/premium/kitchen-panorama-main.jpg', alt: 'Kitchens project detail' },
        { src: '/Gallery/premium/kitchen-panorama-left.jpg', alt: 'Kitchens project detail' },
        { src: '/Gallery/premium/kitchen-panorama-right.jpg', alt: 'Kitchens project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions homeowners ask before the brief is shaped.',
      items: [
        {
          q: 'Do you work on complete kitchen transformations?',
          a: 'Yes. We take on full layout, fit-out and finish scopes where design and installation need to stay tightly coordinated.'
        },
        {
          q: 'Can kitchens be paired with other rooms?',
          a: 'Yes. Kitchen-led projects often extend into utility, dining or wider interior works when continuity matters.'
        },
        {
          q: 'What budget range is typical?',
          a: 'Premium kitchen briefs are commonly in the GBP 12,000 to GBP 30,000+ range depending on cabinetry, surfaces and service complexity.'
        }
      ]
    },
    contact: {
      title: 'Discuss kitchens directly with the studio.',
      lead:
        'Kitchen enquiries move through the same direct studio contact route, so layout decisions and finish expectations are discussed without noise.'
    },
    consultation: {
      title: 'Start your kitchen brief with a private consultation.',
      lead: consultationRouteLead,
      formContext: 'Kitchens',
      locationValue: 'Manchester',
      selectedProjectType: 'kitchen'
    }
  },
  {
    fileName: 'interior-renovations-manchester.html',
    title: 'Premium Interior Renovations Manchester | Level Lines Studio',
    metaDescription:
      'Premium interior renovations in Manchester by Level Lines Studio for homeowners seeking carpentry precision, wall-system discipline and one calm finish language.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/exterior-front.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Premium Interior Renovations in Manchester',
      description:
        'Premium interior renovations in Manchester with carpentry precision, wall-system discipline and coordinated finish control by Level Lines Studio.',
      serviceType: 'Premium interior renovations',
      image: 'https://levellines.co.uk/Gallery/premium/exterior-front.jpg',
      provider: {
        '@type': 'LocalBusiness',
        name: shared.brandName,
        telephone: shared.phones.map((phone) => phone.display),
        email: shared.email
      },
      areaServed: ['Manchester', shared.region]
    },
    hero: {
      image: '/Gallery/premium/brick-detail-charcoal.jpg',
      eyebrow: 'Interior & Wall Systems',
      title: 'Interior renovations that keep one finish language from room to room.',
      lead:
        `Interior and wall-system work extend the same ${coreServiceOffer} studio scope beyond bathrooms and kitchens, giving broader renovation briefs one plan / design / craft structure from room to room.`,
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Studio Scope',
      title: 'A joined-up scope for interiors, carpentry and wall systems.',
      lead:
        'This service carries the joined-up studio offer beyond bathrooms and kitchens, so carpentry, tiling, wall-system build-ups and flooring decisions can read as one coordinated brief.',
      detailListItems: [
        'Joinery, trim and carpentry detail tied into the main design direction.',
        'Internal wall systems and flooring transitions planned for clean lines and dependable performance.',
        'Large-format tiling and envelope-adjacent upgrades discussed where broader scopes overlap.',
        'Selective multi-room sequencing managed under one premium brief.'
      ]
    },
    priorities: {
      eyebrow: 'Studio Method',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Room-to-room continuity', body: 'Finishes and transitions are resolved as one composition rather than isolated upgrades.' },
        { title: 'Technical discipline', body: 'Wall build-ups, trims and service routes are considered before closing works begin.' },
        { title: 'Finish restraint', body: 'The goal is composed, durable spaces rather than decorative noise.' }
      ]
    },
    feature: {
      eyebrow: 'Selected Project',
      title: 'North West interior refresh',
      lead:
        'A multi-room brief combining carpentry, internal wall work and surface refinements to create one calmer architectural language throughout the property.',
      metrics: ['Selective multi-room sequencing', 'Joinery and wall build-ups', 'Coordinated material palette'],
      image: '/Gallery/premium/exterior-wood-gables.jpg',
      imageAlt: 'North West interior refresh'
    },
    mediaStrip: {
      eyebrow: 'Finish Language',
      title: 'Material references for this service line.',
      images: [
        { src: '/Gallery/premium/brick-detail-charcoal.jpg', alt: 'Interior & Wall Systems project detail' },
        { src: '/Gallery/premium/exterior-wood-gables.jpg', alt: 'Interior & Wall Systems project detail' },
        { src: '/Gallery/premium/exterior-front.jpg', alt: 'Interior & Wall Systems project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions homeowners ask before the brief is shaped.',
      items: [
        {
          q: 'Do you take on work beyond bathrooms and kitchens?',
          a: 'Yes. We handle selected interior scopes where carpentry, tiling and wall systems are central to the outcome.'
        },
        {
          q: 'Are internal and external wall systems quoted separately?',
          a: 'They can be scoped separately or folded into a broader interior brief depending on the project.'
        },
        {
          q: 'Who is this service for?',
          a: 'Clients who want a consistent premium language across more than one room or across the building fabric itself.'
        }
      ]
    },
    contact: {
      title: 'Discuss interior & wall systems directly with the studio.',
      lead:
        'Broader interior enquiries move through the same direct studio contact route, so multi-room scope and finish continuity can be shaped early.'
    },
    consultation: {
      title: 'Start your interior & wall systems brief with a private consultation.',
      lead: consultationRouteLead,
      formContext: 'Interior & Wall Systems',
      locationValue: 'Manchester',
      selectedProjectType: 'interior'
    }
  }
];

module.exports = {
  shared,
  pages
};
