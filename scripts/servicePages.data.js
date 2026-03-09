const shared = require('./publicPages.shared');

const pages = [
  {
    fileName: 'premium-bathrooms-manchester.html',
    title: 'Bathrooms Manchester | Level Lines Studio',
    metaDescription:
      'Bathrooms, tiling and finish-led bathroom renovation across Manchester and the North West by Level Lines Studio.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/bathroom-main.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Bathrooms',
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
      title: 'Bathrooms planned, waterproofed and finished with measured detail.',
      lead:
        'The bathroom line on the studio card becomes a full delivery scope here: planning, waterproofing, tiling, fitting and final finish control.',
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Service Overview',
      title: 'A bathroom service built around detail control.',
      lead:
        'From strip-out and first-fix planning to tile setting, brassware alignment and final detailing, the bathroom scope is managed as one joined-up service.',
      detailListItems: [
        'Survey-led planning before demolition and first-fix.',
        'Feature tile layouts and stone-led finish palettes.',
        'Integrated carpentry and storage where the brief demands it.',
        'Clean handover standards with no rushed final detailing.'
      ]
    },
    priorities: {
      eyebrow: 'Service Priorities',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Layout discipline', body: 'Circulation, shower zones and storage are resolved before wet-zone work starts.' },
        { title: 'Material control', body: 'Every tile, trim and brass finish is coordinated for one visual language.' },
        { title: 'Craft execution', body: 'Setting out, waterproofing and finish alignment stay under close supervision.' }
      ]
    },
    feature: {
      eyebrow: 'Case Study',
      title: 'Didsbury ensuite rebuild',
      lead:
        'A compact ensuite upgraded into a darker, richer composition with aligned tile cuts, bespoke joinery and a controlled stone palette.',
      metrics: ['10-14 day programme', 'Stone and brass palette', 'Bespoke storage detailing'],
      image: '/Gallery/premium/bathroom-bathtub.jpg',
      imageAlt: 'Didsbury ensuite rebuild'
    },
    mediaStrip: {
      eyebrow: 'Material Language',
      title: 'Gallery references for this service line.',
      images: [
        { src: '/Gallery/premium/bathroom-main.jpg', alt: 'Bathrooms project detail' },
        { src: '/Gallery/premium/bathroom-tiles.jpg', alt: 'Bathrooms project detail' },
        { src: '/Gallery/premium/bathroom-bathtub.jpg', alt: 'Bathrooms project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Common questions before the brief is shaped.',
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
          a: 'Most premium bathroom briefs sit between £8,000 and £20,000 depending on layout change, materials and bespoke detailing.'
        }
      ]
    },
    contact: {
      title: 'Discuss bathrooms directly with the studio.',
      lead: 'The same direct phones and studio email from the business card are surfaced here so bathroom enquiries can move quickly.'
    },
    consultation: {
      title: 'Start your bathroom brief with a private consultation.',
      lead: 'Tell us where the project sits, what finish level you want and how soon you want to move.',
      formContext: 'Bathrooms',
      locationValue: 'Manchester',
      selectedProjectType: 'bathroom'
    }
  },
  {
    fileName: 'premium-kitchens-manchester.html',
    title: 'Kitchens Manchester | Level Lines Studio',
    metaDescription:
      'Kitchen renovation, fitting and finish-led installation across Manchester and the North West by Level Lines Studio.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/kitchen-panorama-main.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Kitchens',
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
        'The kitchen line from the studio card becomes a complete service here: layout planning, service coordination, fitting and premium finishing.',
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Service Overview',
      title: 'Kitchen work that feels designed, not assembled.',
      lead:
        'Kitchens are treated as complete rooms rather than cabinet-only jobs, so circulation, appliances, lighting and surfaces are resolved together.',
      detailListItems: [
        'Layout-led planning for islands, appliances and circulation.',
        'Cabinet, worktop and trim alignment checked as one system.',
        'Integrated carpentry and service coordination for a clean final read.',
        'A finish brief that prioritises lasting tone and texture.'
      ]
    },
    priorities: {
      eyebrow: 'Service Priorities',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Planning clarity', body: 'Appliance, lighting and work-zone decisions are resolved before fit-out starts.' },
        { title: 'Joinery precision', body: 'Cabinet lines, stone edges and reveals are treated as the core visual language.' },
        { title: 'Daily performance', body: 'Practical use is designed in without diluting the premium feel.' }
      ]
    },
    feature: {
      eyebrow: 'Case Study',
      title: 'Altrincham kitchen overhaul',
      lead:
        'A full kitchen reset centred on darker surfaces, warm lighting and tight cabinetry alignment for a quieter luxury read.',
      metrics: ['2-4 week programme', 'Custom joinery and lighting', 'Stone worktop coordination'],
      image: '/Gallery/premium/kitchen-panorama-main.jpg',
      imageAlt: 'Altrincham kitchen overhaul'
    },
    mediaStrip: {
      eyebrow: 'Material Language',
      title: 'Gallery references for this service line.',
      images: [
        { src: '/Gallery/premium/kitchen-panorama-main.jpg', alt: 'Kitchens project detail' },
        { src: '/Gallery/premium/kitchen-panorama-left.jpg', alt: 'Kitchens project detail' },
        { src: '/Gallery/premium/kitchen-panorama-right.jpg', alt: 'Kitchens project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Common questions before the brief is shaped.',
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
          a: 'Premium kitchen briefs are commonly in the £12,000 to £30,000+ range depending on cabinetry, surfaces and service complexity.'
        }
      ]
    },
    contact: {
      title: 'Discuss kitchens directly with the studio.',
      lead: 'The same direct phones and studio email from the business card are surfaced here so kitchen enquiries can move straight to the next step.'
    },
    consultation: {
      title: 'Start your kitchen brief with a private consultation.',
      lead: 'Tell us where the project sits, what finish level you want and how soon you want to move.',
      formContext: 'Kitchens',
      locationValue: 'Manchester',
      selectedProjectType: 'kitchen'
    }
  },
  {
    fileName: 'interior-renovations-manchester.html',
    title: 'Interior Renovations Manchester | Level Lines Studio',
    metaDescription:
      'Interior renovation, carpentry, tiling and internal wall system upgrades across Manchester and the North West by Level Lines Studio.',
    ogImage: 'https://levellines.co.uk/Gallery/premium/exterior-front.jpg',
    bodyClass: 'public-site page-service',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Interior & Wall Systems',
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
        'For selective whole-home upgrades, the studio combines tiling, carpentry and internal wall-system work into one coherent brief.',
      chips: [
        { label: 'Manchester' },
        { label: shared.region, isBrandRegion: true },
        { label: shared.claim, isBrandClaim: true }
      ]
    },
    intro: {
      eyebrow: 'Service Overview',
      title: 'A joined-up scope for interiors, carpentry and wall systems.',
      lead:
        'This service extends the studio beyond bathrooms and kitchens into broader interior work where carpentry, tiling and internal wall systems need to read as one package.',
      detailListItems: [
        'Joinery, trim and carpentry detail tied into the main design direction.',
        'Internal wall systems planned for straight lines and dependable performance.',
        'Exterior wall upgrades discussed where envelope and appearance overlap.',
        'Selective multi-room sequencing managed under one premium brief.'
      ]
    },
    priorities: {
      eyebrow: 'Service Priorities',
      title: 'How the studio keeps this scope premium.',
      pillars: [
        { title: 'Room-to-room continuity', body: 'Finishes and transitions are resolved as one composition rather than isolated upgrades.' },
        { title: 'Technical discipline', body: 'Wall build-ups, trims and service routes are considered before closing works begin.' },
        { title: 'Finish restraint', body: 'The goal is composed, durable spaces rather than decorative noise.' }
      ]
    },
    feature: {
      eyebrow: 'Case Study',
      title: 'North West interior refresh',
      lead:
        'A multi-room brief combining carpentry, internal wall work and surface refinements to create one calmer architectural language throughout the property.',
      metrics: ['Selective multi-room sequencing', 'Joinery and wall build-ups', 'Coordinated material palette'],
      image: '/Gallery/premium/exterior-wood-gables.jpg',
      imageAlt: 'North West interior refresh'
    },
    mediaStrip: {
      eyebrow: 'Material Language',
      title: 'Gallery references for this service line.',
      images: [
        { src: '/Gallery/premium/brick-detail-charcoal.jpg', alt: 'Interior & Wall Systems project detail' },
        { src: '/Gallery/premium/exterior-wood-gables.jpg', alt: 'Interior & Wall Systems project detail' },
        { src: '/Gallery/premium/exterior-front.jpg', alt: 'Interior & Wall Systems project detail' }
      ]
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Common questions before the brief is shaped.',
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
      lead: 'The same direct phones and studio email from the business card are surfaced here so broader interior enquiries can move without friction.'
    },
    consultation: {
      title: 'Start your interior & wall systems brief with a private consultation.',
      lead: 'Tell us where the project sits, what finish level you want and how soon you want to move.',
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
