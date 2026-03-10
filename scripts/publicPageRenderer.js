const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderJsonLdScripts = (jsonLd) => {
  const nodes = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd].filter(Boolean);
  return nodes
    .map((node) => `  <script type="application/ld+json">${JSON.stringify(node)}</script>`)
    .join('\n');
};

const renderBrandLockup = (shared) => `      <a class="brand" href="/index.html" aria-label="${escapeHtml(shared.brandName)} home">
        <img src="${escapeHtml(shared.logoPath)}" alt="${escapeHtml(shared.brandName)} logo" class="brand-logo" />
        <img src="${escapeHtml(shared.titleImagePath || '/title.png')}" alt="${escapeHtml(shared.brandName)}" class="brand-title-image" />
      </a>`;

const renderNavLinks = (shared, contactHref = '#consultation') =>
  shared.navLinks
    .map((link) => {
      const href = link.label === 'Contact' ? contactHref : link.href;
      const authAttr = link.isAuth ? ` data-auth-guest-label="${escapeHtml(shared.publicAuthLabel || link.label)}"` : '';
      return `          <a href="${escapeHtml(href)}" data-nav-link${authAttr}>${escapeHtml(link.label)}</a>`;
    })
    .join('\n');

const renderLinks = (links, className = '') =>
  links
    .map((link) => {
      const classAttr = className ? ` class="${className}"` : '';
      return `          <a${classAttr} href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
    })
    .join('\n');

const renderHeroChips = (chips) =>
  chips
    .map((chip) => {
      const attrs = chip.isBrandRegion ? ' class="stat-chip" data-brand-region' : chip.isBrandClaim ? ' class="stat-chip" data-brand-claim' : ' class="stat-chip"';
      return `          <span${attrs}>${escapeHtml(chip.label)}</span>`;
    })
    .join('\n');

const renderPillars = (pillars) =>
  pillars
    .map(
      (pillar, index) => `          <article class="surface-card surface-card--dark pillar-card">
            <p class="pillar-index">${String(index + 1).padStart(2, '0')}</p>
            <h3>${escapeHtml(pillar.title)}</h3>
            <p>${escapeHtml(pillar.body)}</p>
          </article>`
    )
    .join('\n');

const renderMetrics = (metrics) =>
  metrics.map((metric) => `            <span class="metric-chip">${escapeHtml(metric)}</span>`).join('');

const renderFaq = (items) =>
  items
    .map(
      (item) =>
        `          <details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`
    )
    .join('');

const renderMediaStrip = (images) =>
  images
    .map(
      (image) =>
        `          <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" />`
    )
    .join('');

const renderDetailList = (items) =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const renderAreaCard = () => `        <div class="surface-card surface-card--light detail-card">
          <div class="area-list" data-brand-area-list></div>
        </div>`;

const renderDetailCard = (items) => `        <div class="surface-card surface-card--light detail-card">
          <ul class="detail-list">
            ${renderDetailList(items)}
          </ul>
        </div>`;

const renderIntroSection = ({ eyebrow, title, lead, detailListItems, useAreaCard = false }) => `    <section class="section section--light">
      <div class="container intro-grid">
        <div>
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
          <p class="section-lead">${escapeHtml(lead)}</p>
        </div>
${useAreaCard ? renderAreaCard() : renderDetailCard(detailListItems)}
      </div>
    </section>`;

const renderPillarSection = ({ eyebrow, title, pillars }) => `    <section class="section section--dark">
      <div class="container section-shell">
        <div class="section-heading">
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="pillar-grid">
${renderPillars(pillars)}
        </div>
      </div>
    </section>`;

const renderFeatureSection = ({ eyebrow, title, lead, metrics, image, imageAlt }) => `    <section class="section section--light">
      <div class="container feature-split">
        <div>
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
          <p class="section-lead">${escapeHtml(lead)}</p>
          <div class="metric-list">
${renderMetrics(metrics)}
          </div>
        </div>
        <img class="feature-image" src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" loading="lazy" />
      </div>
    </section>`;

const renderMediaStripSection = ({ eyebrow, title, images }) => `    <section class="section section--dark">
      <div class="container section-shell">
        <div class="section-heading">
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="media-strip">
${renderMediaStrip(images)}
        </div>
      </div>
    </section>`;

const renderFaqSection = ({ eyebrow, title, items }) => `    <section class="section section--light" id="faq">
      <div class="container faq-grid">
        <div>
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="faq-list">
${renderFaq(items)}
        </div>
      </div>
    </section>`;

const renderContactSection = ({ title, lead, shared }) => `  <section class="section section--dark contact-band-shell">
    <div class="container contact-band surface-card surface-card--dark">
      <div class="contact-band-copy">
        <p class="section-eyebrow section-eyebrow--compact">Studio Contact</p>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(lead)}</p>
      </div>
      <address class="contact-band-links" aria-label="${escapeHtml(shared.brandName)} contact details">
        <a class="contact-band-link" data-brand-phone="0" href="${escapeHtml(shared.phones[0].href)}">${escapeHtml(shared.phones[0].display)}</a>
        <a class="contact-band-link" data-brand-phone="1" href="${escapeHtml(shared.phones[1].href)}">${escapeHtml(shared.phones[1].display)}</a>
        <a class="contact-band-link" data-brand-email href="mailto:${escapeHtml(shared.email)}">${escapeHtml(shared.email)}</a>
      </address>
    </div>
  </section>`;

const renderConsultationSection = ({ title, lead, formContext, locationValue, selectedProjectType, shared }) => `  <section class="section section--light" id="consultation">
    <div class="container consultation-shell">
      <div class="consultation-copy">
        <p class="section-eyebrow">Private Consultation</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="section-lead">${escapeHtml(lead)}</p>
        <div class="consultation-points">
          <p><strong data-brand-region>${escapeHtml(shared.region)}</strong></p>
          <p>Selective briefs, direct studio access and a measured intake process.</p>
        </div>
      </div>
      <form class="quote-form surface-card surface-card--light js-quote-form" data-form-context="${escapeHtml(formContext)}" novalidate>
        <input type="hidden" name="location" value="${escapeHtml(locationValue)}" />
        <div class="form-grid">
          <label>Name<input type="text" name="name" autocomplete="name" required /></label>
          <label>Phone<input type="tel" name="phone" autocomplete="tel" /></label>
          <label>Email<input type="email" name="email" autocomplete="email" /></label>
          <label>Project type
            <select name="projectType" required data-brand-project-type-select data-default-label="Select" data-selected-value="${escapeHtml(selectedProjectType)}"></select>
          </label>
          <label>Budget
            <select name="budget" data-brand-budget-select data-default-label="Select"></select>
          </label>
          <label class="span-2">Project brief<textarea name="message" rows="5" required placeholder="Tell us about your scope, finish expectations and timing."></textarea></label>
        </div>
        <button class="btn btn-gold btn-block" type="submit">${escapeHtml(shared.consultationCtaLabel || 'Request Private Consultation')}</button>
        <p class="form-status" aria-live="polite"></p>
      </form>
    </div>
  </section>`;

const renderFooter = (shared) => `  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-block footer-block--brand">
        <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(shared.brandName)}</p>
        <h3 data-brand-name>${escapeHtml(shared.brandName)}</h3>
        <p class="footer-copy" data-brand-footer-copy>${escapeHtml(shared.footerCopy)}</p>
        <address class="footer-contact-list" aria-label="${escapeHtml(shared.brandName)} contact details">
          <a class="footer-contact-link" data-brand-phone="0" href="${escapeHtml(shared.phones[0].href)}">${escapeHtml(shared.phones[0].display)}</a>
          <a class="footer-contact-link" data-brand-phone="1" href="${escapeHtml(shared.phones[1].href)}">${escapeHtml(shared.phones[1].display)}</a>
          <a class="footer-contact-link" data-brand-email href="mailto:${escapeHtml(shared.email)}">${escapeHtml(shared.email)}</a>
        </address>
      </div>
      <div class="footer-block">
        <h3>Services</h3>
        <div class="footer-links" data-brand-service-links data-link-class="footer-service-link">
${renderLinks(shared.serviceLinks, 'footer-service-link')}
        </div>
      </div>
      <div class="footer-block">
        <h3>Studio</h3>
        <div class="footer-links">
${renderLinks(shared.studioLinks)}
        </div>
      </div>
      <div class="footer-block">
        <h3>Studio Region</h3>
        <p class="footer-copy" data-brand-region>${escapeHtml(shared.region)}</p>
        <div class="footer-area-list" data-brand-area-list data-item-class="footer-area-chip"></div>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; <span data-current-year></span> ${escapeHtml(shared.brandName)}. All rights reserved.</p>
      <p class="footer-bottom-note">${escapeHtml(shared.claim)}</p>
    </div>
  </footer>`;

const renderPublicPage = ({
  shared,
  fileName,
  title,
  metaDescription,
  ogImage,
  bodyClass,
  jsonLd,
  robotsContent = 'index,follow,max-image-preview:large',
  hero,
  sections,
  contact,
  consultation,
  generatedBy
}) => `<!DOCTYPE html>
<!-- Generated by \`${escapeHtml(generatedBy)}\`. Do not edit manually. -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <meta name="robots" content="${escapeHtml(robotsContent)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(shared.brandName)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(metaDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(`${shared.siteUrl}/${fileName}`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${escapeHtml(`${shared.siteUrl}/${fileName}`)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
${renderJsonLdScripts(jsonLd)}
</head>
<body class="${escapeHtml(bodyClass)}">

  <header class="site-header" id="top">
    <div class="container header-inner grid-12">
${renderBrandLockup(shared)}
      
      <div class="menu-wrap" data-menu-wrap>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation menu">
          <span class="nav-toggle-line"></span>
          <span class="nav-toggle-line"></span>
          <span class="nav-toggle-line"></span>
        </button>
        <nav class="site-nav" id="site-nav" data-nav-menu aria-label="Main navigation">
${renderNavLinks(shared)}
        </nav>
      </div>
    </div>
  </header>
  <main>

    <section class="public-hero public-hero--inner" style="--hero-image: url('${escapeHtml(hero.image)}');">
      <div class="hero-backdrop"></div>
      <div class="container inner-hero-shell">
        <p class="section-eyebrow">${escapeHtml(hero.eyebrow)}</p>
        <h1>${escapeHtml(hero.title)}</h1>
        <p class="section-lead">${escapeHtml(hero.lead)}</p>
        <div class="hero-chip-row">
${renderHeroChips(hero.chips)}
        </div>
      </div>
    </section>

${sections.join('\n\n')}


${renderContactSection({ ...contact, shared })}


${renderConsultationSection({ ...consultation, shared })}
  </main>

${renderFooter(shared)}
  <script src="/brand.js" defer></script>
  <script src="/site.js" defer></script>
  <script src="/quote.js" defer></script>
</body>
</html>
`;

module.exports = {
  renderPublicPage,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderMediaStripSection,
  renderFaqSection
};
