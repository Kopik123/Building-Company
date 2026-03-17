const assetManifest = require('../asset-manifest');
const brandAssets = assetManifest.brand || {};

module.exports = {
  siteUrl: 'https://levellines.co.uk',
  brandName: 'Level Lines Studio',
  claim: 'Plan | Design | Craft',
  region: 'North West - Lancashire',
  headerIconPath: brandAssets.headerIcon?.fallback || '/logo.png',
  email: 'LevelLineStudioMCR@gmail.com',
  logoPath: brandAssets.title?.fallback || '/title.png',
  titleImagePath: brandAssets.title?.fallback || '/title.png',
  workspaceLogoPath: brandAssets.workspace?.fallback || '/logo4.png',
  publicAuthLabel: 'Account',
  consultationCtaLabel: 'Send Enquiry',
  enquiryTitle: 'Send Enquiry',
  enquiryLead:
    'Share the rooms involved, the finish ambition and your timing. The studio replies with a measured next step.',
  coreServiceOffer:
    'full bathroom renovations, kitchen installation and refurbishment, large-format tiling, carpentry, wall systems and flooring installation',
  joinedUpOfferLead:
    'Bathrooms, kitchens and interior upgrades are handled as one refined studio scope, with planning, detailing and finish control staying aligned from the first survey.',
  serviceLineLabel: 'Curated premium scope',
  privateConsultationLabel: 'Private consultation',
  footerCopy:
    'A premium renovation studio for bathrooms, kitchens and interiors, shaped with quiet planning, material restraint and finish control across the North West.',
  phones: [
    { href: 'tel:+447942874446', display: '+44 7942 874 446', label: 'Studio line 1' },
    { href: 'tel:+447304506391', display: '+44 7304 506 391', label: 'Studio line 2' }
  ],
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
  navLinks: [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About' },
    { href: '/services.html', label: 'Services' },
    { href: '/gallery.html', label: 'Gallery' },
    { href: '/quote.html', label: 'Quote' },
    { href: '/contact.html', label: 'Contact' },
    { href: '/auth.html', label: 'Account', isAuthLink: true }
  ],
  serviceLinks: [
    { href: '/premium-bathrooms-manchester.html', label: 'Full Bathroom Renovations' },
    { href: '/premium-kitchens-manchester.html', label: 'Kitchen Installation and Refurbishment' },
    { href: '/quote.html', label: 'Tiling incl. Large Format / Wet Showers' },
    { href: '/quote.html', label: 'Carpentry' },
    { href: '/quote.html', label: 'External Wall Systems' },
    { href: '/quote.html', label: 'Interior Wall Systems' },
    { href: '/quote.html', label: 'Flooring Installation' }
  ],
  studioLinks: [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About' },
    { href: '/services.html', label: 'Services' },
    { href: '/gallery.html', label: 'Gallery' },
    { href: '/contact.html', label: 'Contact' },
    { href: '/quote.html', label: 'Quote' },
    { href: '/auth.html', label: 'Account' },
    { href: '/privacy.html', label: 'Privacy' },
    { href: '/cookie-policy.html', label: 'Cookie Policy' },
    { href: '/terms.html', label: 'Terms' }
  ]
};

