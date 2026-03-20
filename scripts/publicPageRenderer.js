const assetManifest = require('../asset-manifest');

const brandAssets = assetManifest.brand || {};
const galleryAssets = assetManifest.gallery || {};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeScriptJson = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/-->/g, '--\\>');

const renderJsonLdScripts = (jsonLd) => {
  const nodes = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd].filter(Boolean);
  return nodes
    .map((node) => `  <script type="application/ld+json">${JSON.stringify(node)}</script>`)
    .join('\n');
};

const buildCanonicalUrl = (shared, fileName, explicitCanonicalUrl) => {
  if (explicitCanonicalUrl) return explicitCanonicalUrl;
  if (!fileName || fileName === 'index.html') return `${shared.siteUrl}/`;
  return `${shared.siteUrl}/${fileName}`;
};

const buildBreadcrumbJsonLd = (shared, breadcrumbItems = []) => {
  if (!Array.isArray(breadcrumbItems) || !breadcrumbItems.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href.startsWith('http') ? item.href : `${shared.siteUrl}${item.href}`
    }))
  };
};

const renderStylesheets = () => `  <link rel="stylesheet" href="/styles/tokens.css" />
  <link rel="stylesheet" href="/styles/base.css" />
  <link rel="stylesheet" href="/styles/public.css" />
  <link rel="stylesheet" href="/styles/workspace.css" />`;

const getResponsiveAsset = (src, options = {}) => {
  const asset = src ? galleryAssets[src] : null;
  return {
    fallback: asset?.fallback || src || '',
    fallbackSet: asset?.fallbackSet || '',
    webp: asset?.webp || '',
    webpSet: asset?.webpSet || '',
    avif: asset?.avif || '',
    avifSet: asset?.avifSet || '',
    width: Number(asset?.width) || Number(options.width) || 0,
    height: Number(asset?.height) || Number(options.height) || 0,
    sizes: options.sizes || asset?.sizes || '',
    thumbnailSizes: options.thumbnailSizes || asset?.thumbnailSizes || options.sizes || asset?.sizes || ''
  };
};

const renderResponsivePicture = ({ asset, alt, className = '', imgClassName = '', loading = 'lazy', sizes = '', decoding = 'async' }) => {
  const resolvedSizes = sizes || asset?.sizes || '';
  const classAttr = className ? ` class="${escapeHtml(className)}"` : '';
  const imgClassAttr = imgClassName ? ` class="${escapeHtml(imgClassName)}"` : '';
  const avifSource = asset?.avif || asset?.avifSet
    ? `\n          <source type="image/avif" srcset="${escapeHtml(asset.avifSet || asset.avif)}"${resolvedSizes ? ` sizes="${escapeHtml(resolvedSizes)}"` : ''} />`
    : '';
  const webpSource = asset?.webp || asset?.webpSet
    ? `\n          <source type="image/webp" srcset="${escapeHtml(asset.webpSet || asset.webp)}"${resolvedSizes ? ` sizes="${escapeHtml(resolvedSizes)}"` : ''} />`
    : '';
  const fallbackSet = asset?.fallbackSet ? ` srcset="${escapeHtml(asset.fallbackSet)}"` : '';
  const sizeAttr = resolvedSizes ? ` sizes="${escapeHtml(resolvedSizes)}"` : '';
  const widthAttr = asset?.width ? ` width="${asset.width}"` : '';
  const heightAttr = asset?.height ? ` height="${asset.height}"` : '';

  return `<picture${classAttr}>${avifSource}${webpSource}
          <img src="${escapeHtml(asset?.fallback || '')}"${fallbackSet}${sizeAttr} alt="${escapeHtml(alt)}"${imgClassAttr}${widthAttr}${heightAttr} loading="${escapeHtml(loading)}" decoding="${escapeHtml(decoding)}" />
        </picture>`;
};

const renderPublicNavLinks = (shared) =>
  shared.navLinks
    .map((link) => {
      const authAttrs = link.isAuthLink
        ? ` data-auth-link data-auth-guest-label="${escapeHtml(shared.publicAuthLabel || 'Account')}"`
        : '';
      return `          <a href="${escapeHtml(link.href)}" data-nav-link${authAttrs}><span>${escapeHtml(link.label)}</span></a>`;
    })
    .join('\n');

const renderPublicTitleBoard = (shared) => {
  const title = {
    fallback: brandAssets.title?.fallback || shared.titleImagePath || shared.logoPath || '/title.png',
    webp: brandAssets.title?.webp || '',
    avif: brandAssets.title?.avif || '',
    width: Number(brandAssets.title?.width) || 1536,
    height: Number(brandAssets.title?.height) || 232
  };

  return `      <div class="public-brand-board">
        <a class="public-brand-link" href="/index.html" aria-label="${escapeHtml(shared.brandName)} home">
${renderResponsivePicture({
  asset: title,
  alt: shared.brandName,
  className: 'public-brand-picture',
  imgClassName: 'public-brand-title-image',
  loading: 'eager'
})}
        </a>
      </div>`;
};

const renderInlineLoginStrip = (shared) => `      <button class="public-auth-toggle" type="button" data-auth-toggle aria-expanded="false" aria-controls="public-auth-panel">
        <span class="public-auth-toggle-label">Login</span>
      </button>
      <section class="public-auth-panel" id="public-auth-panel" data-auth-panel aria-label="Studio login">
        <form class="public-inline-login-form" data-inline-login-form data-auth-guest-only novalidate>
          <div class="public-inline-login-row">
            <input type="email" name="email" autocomplete="username email" placeholder="Login" aria-label="Login" required />
            <input type="password" name="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required />
            <button class="public-inline-login-submit" type="submit">Enter</button>
          </div>
        </form>
        <div class="public-inline-session" data-inline-session data-auth-user-only hidden>
          <p class="public-inline-session-copy" data-inline-session-copy>Signed in.</p>
          <div class="public-inline-session-actions">
            <button class="public-inline-session-link public-inline-session-link--button" type="button" data-inline-logout>Log out</button>
          </div>
        </div>
        <p class="form-status public-inline-login-status" data-inline-login-status aria-live="polite"></p>
      </section>`;

const renderPublicShell = (shared) => `  <header class="site-header site-header--public-shell" id="top">
    <div class="container public-shell-header">
${renderPublicTitleBoard(shared)}
      <div class="public-shell-controls">
${renderInlineLoginStrip(shared)}
        <div class="public-shell-nav menu-wrap" data-menu-wrap>
          <button class="nav-toggle public-menu-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav" aria-label="Open navigation menu">
            <span class="public-menu-toggle-label">Menu</span>
            <span class="nav-toggle-line"></span>
            <span class="nav-toggle-line"></span>
            <span class="nav-toggle-line"></span>
          </button>
          <nav class="site-nav site-nav--public-shell" id="site-nav" data-nav-menu aria-label="Main navigation" hidden aria-hidden="true">
${renderPublicNavLinks(shared)}
          </nav>
        </div>
      </div>
    </div>
  </header>`;

const renderLinks = (links, className = '') =>
  links
    .map((link) => {
      const classAttr = className ? ` class="${className}"` : '';
      return `          <a${classAttr} href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
    })
    .join('\n');

const renderLinkClusterLinks = (links = []) =>
  links
    .map(
      (link) =>
        `              <a class="page-link-pill" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`
    )
    .join('\n');

const renderSummaryLinks = (links = []) =>
  links
    .map(
      (link) =>
        `              <a class="studio-summary-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`
    )
    .join('\n');

const renderSummaryAreas = (items = []) =>
  items
    .map((item) => `              <span class="studio-summary-area">${escapeHtml(item)}</span>`)
    .join('\n');

const renderSummaryIcon = (type) => {
  if (type === 'areas') {
    return `<span class="studio-summary-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
                    <circle cx="12" cy="11" r="2.5" />
                  </svg>
                </span>`;
  }

  if (type === 'links') {
    return `<span class="studio-summary-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                  </svg>
                </span>`;
  }

  return `<span class="studio-summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M6.5 5.5h11a2 2 0 0 1 2 2v9l-3-2.5H6.5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2Z" />
                </svg>
              </span>`;
};

const renderHeroChips = (chips) =>
  chips
    .map((chip) => {
      const attrs = chip.isBrandRegion ? ' class="stat-chip" data-brand-region' : chip.isBrandClaim ? ' class="stat-chip" data-brand-claim' : ' class="stat-chip"';
      return `          <span${attrs}>${escapeHtml(chip.label)}</span>`;
    })
    .join('\n');

const renderProofPoints = (items = []) =>
  items
    .map((item) => `          <span class="stat-chip">${escapeHtml(item)}</span>`)
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
      (image) => {
        const asset = getResponsiveAsset(image.src);
        return `          ${renderResponsivePicture({
          asset,
          alt: image.alt,
          className: 'media-picture',
          loading: 'lazy'
        })}`;
      }
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

const renderFeatureSection = ({ eyebrow, title, lead, metrics, image, imageAlt }) => {
  const asset = getResponsiveAsset(image);
  return `    <section class="section section--light">
      <div class="container feature-split">
        <div>
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
          <p class="section-lead">${escapeHtml(lead)}</p>
          <div class="metric-list">
${renderMetrics(metrics)}
          </div>
        </div>
        ${renderResponsivePicture({
          asset,
          alt: imageAlt,
          className: 'feature-image-frame',
          imgClassName: 'feature-image',
          loading: 'lazy'
        })}
      </div>
    </section>`;
};

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

const renderStudioSummarySection = (section, shared) => {
  if (!section) return '';

  if (section.type === 'contact') {
    return `              <section class="studio-summary-block studio-summary-block--contact">
                <div class="studio-summary-heading">
${renderSummaryIcon('contact')}
                  <div>
                    <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(section.eyebrow || 'Contact Details')}</p>
                    ${section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ''}
                  </div>
                </div>
                <address class="studio-summary-contact" aria-label="${escapeHtml(shared.brandName)} contact details">
                  <a class="studio-summary-link studio-summary-link--contact" data-brand-phone="0" href="${escapeHtml(shared.phones[0].href)}"><span class="studio-summary-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 4.5h3l1.2 3.6-1.8 1.8a14.2 14.2 0 0 0 4.2 4.2l1.8-1.8 3.6 1.2v3a1.5 1.5 0 0 1-1.5 1.5A13.5 13.5 0 0 1 6 6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg></span>${escapeHtml(shared.phones[0].display)}</a>
                  <a class="studio-summary-link studio-summary-link--contact" data-brand-phone="1" href="${escapeHtml(shared.phones[1].href)}"><span class="studio-summary-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 4.5h3l1.2 3.6-1.8 1.8a14.2 14.2 0 0 0 4.2 4.2l1.8-1.8 3.6 1.2v3a1.5 1.5 0 0 1-1.5 1.5A13.5 13.5 0 0 1 6 6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg></span>${escapeHtml(shared.phones[1].display)}</a>
                  <a class="studio-summary-link studio-summary-link--contact" data-brand-email href="mailto:${escapeHtml(shared.email)}"><span class="studio-summary-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4.5 6.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" /><path d="m5 8 7 5 7-5" /></svg></span>${escapeHtml(shared.email)}</a>
                </address>
              </section>`;
  }

  if (section.type === 'links') {
    return `              <section class="studio-summary-block studio-summary-block--links">
                <div class="studio-summary-heading">
${renderSummaryIcon('links')}
                  <div>
                    <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(section.eyebrow || 'Services')}</p>
                    ${section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ''}
                  </div>
                </div>
                <div class="studio-summary-links">
${renderSummaryLinks(section.links)}
                </div>
              </section>`;
  }

  if (section.type === 'areas') {
    return `              <section class="studio-summary-block studio-summary-block--areas">
                <div class="studio-summary-heading">
${renderSummaryIcon('areas')}
                  <div>
                    <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(section.eyebrow || 'Coverage')}</p>
                    ${section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ''}
                  </div>
                </div>
                <p class="studio-summary-region">${escapeHtml(section.region || shared.region)}</p>
                <div class="studio-summary-areas">
${renderSummaryAreas(section.items || [])}
                </div>
              </section>`;
  }

  return '';
};

const renderStudioBoard = ({ shared, board }) => {
  const heading = board.boardHeading || board.heading || {};
  const claim = board.boardClaim || board.claim || {};
  const fastQuote = board.fastQuoteDefaults || board.fastQuote || {};
  const galleryProjects = Array.isArray(board.galleryProjects) ? board.galleryProjects : [];
  const summarySections = Array.isArray(board.summarySections) ? board.summarySections : [];

  return `    <section class="section section--dark studio-board-shell" id="projects">
      <div class="container section-shell studio-board">
        <div class="studio-board-top">
          <div class="studio-board-heading">
            <p class="section-eyebrow">${escapeHtml(heading.eyebrow || '')}</p>
            <h1>${escapeHtml(heading.title || '')}</h1>
            <p class="section-lead">${escapeHtml(heading.lead || '')}</p>
${Array.isArray(board.proofPoints) && board.proofPoints.length
  ? `            <div class="hero-chip-row">
${renderProofPoints(board.proofPoints)}
            </div>`
  : ''}
          </div>
          <div class="studio-board-claim">
            <p class="section-eyebrow">${escapeHtml(claim.eyebrow || 'Studio Method')}</p>
            <p class="studio-board-claimline">${escapeHtml(claim.title || shared.claim)}</p>
${claim.lead ? `            <p class="studio-board-claimcopy">${escapeHtml(claim.lead)}</p>` : ''}
          </div>
        </div>

        <div class="studio-board-main">
          <article class="surface-card surface-card--light studio-gallery-panel" id="gallery">
            <div class="studio-panel-head">
              <div>
                <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(board.galleryEyebrow || 'Selected Project')}</p>
                <h2 data-gallery-active-image-title>${escapeHtml(board.galleryTitle || 'Active image')}</h2>
              </div>
              <a class="text-link" href="${escapeHtml(board.galleryCtaHref || '#consultation')}">${escapeHtml(board.galleryCtaLabel || shared.consultationCtaLabel || 'Request Private Consultation')}</a>
            </div>
            <div class="gallery-roller studio-gallery-roller" data-gallery-roller data-motion-profile="${escapeHtml(board.motionProfile || 'subtle')}">
              <button class="gallery-arrow studio-gallery-arrow" type="button" data-gallery-prev aria-label="Previous photo">&#10094;</button>
              <div class="gallery-stage studio-gallery-stage" data-gallery-stage aria-live="polite"></div>
              <button class="gallery-arrow studio-gallery-arrow" type="button" data-gallery-next aria-label="Next photo">&#10095;</button>
            </div>
          </article>

          <aside class="surface-card surface-card--light studio-projects-panel">
            <div class="studio-panel-head studio-panel-head--stack">
              <div>
                <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(board.projectsEyebrow || 'Projects')}</p>
                <h2 data-gallery-active-project-title>${escapeHtml(board.projectsTitle || 'Active project')}</h2>
              </div>
              <p class="studio-panel-copy" data-gallery-active-project-meta>${escapeHtml(board.projectsLead || '')}</p>
            </div>
            <button class="project-rail-nav project-rail-nav--up" type="button" data-gallery-project-prev aria-label="Previous project">&#8593;</button>
            <div class="gallery-project-strip studio-project-strip" data-gallery-projects aria-label="Project selection"></div>
            <button class="project-rail-nav project-rail-nav--down" type="button" data-gallery-project-next aria-label="Next project">&#8595;</button>
            <p class="gallery-status studio-gallery-status" data-gallery-status aria-live="polite"></p>
          </aside>
        </div>

        <div class="studio-board-bottom">
          <article class="surface-card surface-card--light studio-summary-card" id="services">
            <div class="studio-summary-grid">
${summarySections.map((section) => renderStudioSummarySection(section, shared)).join('\n')}
            </div>
          </article>

          <article class="surface-card surface-card--light studio-quote-card" id="consultation">
            <p class="section-eyebrow">${escapeHtml(fastQuote.eyebrow || 'Private Consultation')}</p>
            <h2>${escapeHtml(fastQuote.title || shared.enquiryTitle || 'Send Enquiry')}</h2>
            <p class="section-lead">${escapeHtml(fastQuote.lead || shared.enquiryLead || '')}</p>
            <form class="quote-form studio-quote-form js-quote-form" data-form-context="${escapeHtml(fastQuote.formContext || 'Public Page Fast Quote')}" novalidate>
              <input type="hidden" name="location" value="${escapeHtml(fastQuote.locationValue || shared.region)}" />
              <div class="form-grid">
                <label>Name<input type="text" name="name" autocomplete="name" required /></label>
                <label>Phone<input type="tel" name="phone" autocomplete="tel" /></label>
                <label>Email<input type="email" name="email" autocomplete="email" /></label>
                <label>Project type
                  <select name="projectType" required data-brand-project-type-select data-default-label="Select" data-selected-value="${escapeHtml(fastQuote.selectedProjectType || '')}"></select>
                </label>
                <label>Budget
                  <select name="budget" data-brand-budget-select data-default-label="Select"></select>
                </label>
                <label class="span-2">Project brief<textarea name="message" rows="5" required placeholder="Tell us about your scope, finish expectations and timing."></textarea></label>
              </div>
              <button class="btn btn-gold btn-block" type="submit">${escapeHtml(shared.consultationCtaLabel || 'Request Private Consultation')}</button>
              <p class="form-status" aria-live="polite"></p>
            </form>
          </article>
        </div>
      </div>
      <script type="application/json" data-gallery-projects-json>${escapeScriptJson(galleryProjects)}</script>
    </section>`;
};

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
        <h2>${escapeHtml(title || shared.enquiryTitle || 'Send Enquiry')}</h2>
        <p class="section-lead">${escapeHtml(lead || shared.enquiryLead || '')}</p>
        <div class="hero-chip-row consultation-chip-row">
          <span class="stat-chip" data-brand-region>${escapeHtml(shared.region)}</span>
          <span class="stat-chip">${escapeHtml(shared.consultationCtaLabel || 'Send Enquiry')}</span>
          <span class="stat-chip">${escapeHtml(shared.claim)}</span>
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

const renderLinkClusterSection = ({ eyebrow, title, groups = [] }) => `    <section class="section section--light">
      <div class="container section-shell">
        <div class="section-heading">
          <p class="section-eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="page-grid-${Math.min(Math.max(groups.length, 1), 3)}">
${groups
  .map(
    (group) => `          <article class="content-card content-card--light">
            <p class="section-eyebrow section-eyebrow--compact">${escapeHtml(group.eyebrow || 'Routes')}</p>
            <h3>${escapeHtml(group.title || '')}</h3>
            ${group.lead ? `<p class="page-aside-copy">${escapeHtml(group.lead)}</p>` : ''}
            <div class="page-link-cluster">
${renderLinkClusterLinks(group.links || [])}
            </div>
          </article>`
  )
  .join('\n')}
        </div>
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
  breadcrumbItems = [],
  canonicalUrl,
  robotsContent = 'index,follow,max-image-preview:large',
  hero,
  board,
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
  <meta property="og:url" content="${escapeHtml(buildCanonicalUrl(shared, fileName, canonicalUrl))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${escapeHtml(buildCanonicalUrl(shared, fileName, canonicalUrl))}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
${renderStylesheets()}
${renderJsonLdScripts([...((Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean)), buildBreadcrumbJsonLd(shared, breadcrumbItems)].filter(Boolean))}
</head>
<body class="${escapeHtml(bodyClass)}">

${renderPublicShell(shared)}
  <main>

${board
    ? renderStudioBoard({ shared, board })
    : `    <section class="public-hero public-hero--inner">
      <div class="container inner-hero-shell content-card content-card--dark" style="--hero-image: url('${escapeHtml(hero.image)}');">
        <p class="section-eyebrow">${escapeHtml(hero.eyebrow)}</p>
        <h1>${escapeHtml(hero.title)}</h1>
        <p class="section-lead">${escapeHtml(hero.lead)}</p>
        <div class="hero-chip-row">
${renderHeroChips(hero.chips)}
        </div>
      </div>
    </section>`}

${sections.join('\n\n')}

${board ? '' : `${renderContactSection({ ...contact, shared })}


${renderConsultationSection({ ...consultation, shared })}`}
  </main>

${renderFooter(shared)}
  <script src="/asset-manifest.js" defer></script>
  <script src="/brand.js" defer></script>
  <script src="/runtime.js" defer></script>
  <script src="/site.js" defer></script>
  <script src="/gallery.js" defer></script>
  <script src="/quote.js" defer></script>
</body>
</html>
`;

module.exports = {
  renderPublicPage,
  renderPublicShell,
  renderFooter,
  renderIntroSection,
  renderPillarSection,
  renderFeatureSection,
  renderMediaStripSection,
  renderFaqSection,
  renderStudioBoard,
  renderLinkClusterSection
};
