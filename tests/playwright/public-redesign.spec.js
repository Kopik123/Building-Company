const { test, expect } = require('@playwright/test');

const quotePhotoFixtures = [
  {
    name: 'quote-photo-1.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pZ0Sq8AAAAASUVORK5CYII=', 'base64')
  },
  {
    name: 'quote-photo-2.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pZ0Sq8AAAAASUVORK5CYII=', 'base64')
  }
];

const createGuestQuotePreviewPayload = () => ({
  quote: {
    id: 'quote-preview-1',
    projectType: 'kitchen',
    location: 'Manchester and the North West',
    status: 'pending',
    workflowStatus: 'submitted',
    priority: 'medium',
    canClaim: true,
    claimChannels: ['email', 'phone'],
    maskedGuestEmail: 'gu***@e***.com',
    maskedGuestPhone: '0739***87',
    attachmentCount: 2,
    submittedAt: '2026-03-24T21:30:00Z',
    attachments: quotePhotoFixtures.map((file, index) => ({
      name: file.name,
      url: `/uploads/${file.name}`,
      size: 2048 + index,
      mimeType: 'image/png'
    }))
  }
});

const openNavIfNeeded = async (page) => {
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.count()) {
    if (await toggle.first().isVisible()) {
      await toggle.first().click();
    }
  }
};

const expectNoHorizontalScroll = async (page) => {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasOverflow).toBeFalsy();
};

const expectShellNavigationDefaultState = async (page) => {
  const toggle = page.locator('.site-header--public-shell .public-menu-toggle');
  const navMenu = page.locator('.site-header--public-shell [data-nav-menu]');

  if (await toggle.first().isVisible()) {
    await expect(toggle).toBeVisible();
    await expect(navMenu).toBeHidden();
    return;
  }

  await expect(toggle).toBeHidden();
  await expect(navMenu).toBeVisible();
};

const mockPublicClientSession = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ll_auth_token', 'test-token');
    localStorage.setItem('ll_auth_user', JSON.stringify({
      id: 'client-1',
      name: 'Marta Client',
      email: 'client@example.com',
      role: 'client'
    }));
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'client-1',
          name: 'Marta Client',
          email: 'client@example.com',
          role: 'client'
        }
      }
    });
  });
};

const mockFolderGalleryServices = async (page) => {
  await page.route('**/api/gallery/services', async (route) => {
    await route.fulfill({
      json: {
        services: [
          {
            id: 'bathroom',
            name: 'bathroom',
            images: [
              { src: '/Gallery/bathroom/Rustic%20Harmony.png', label: 'Rustic Harmony' },
              { src: '/Gallery/bathroom/The%20Slate%20Suite.png', label: 'The Slate Suite' }
            ]
          },
          {
            id: 'exterior',
            name: 'exterior',
            images: [
              { src: '/Gallery/exterior/Brick%20veneers.jpg', label: 'Brick Veneers' },
              { src: '/Gallery/exterior/charcoal%20brickslips.jpg', label: 'Charcoal Brickslips' },
              { src: '/Gallery/exterior/Rendering.jpg', label: 'Rendering' }
            ]
          },
          {
            id: 'kitchen',
            name: 'kitchen',
            images: [
              { src: '/Gallery/kitchen/Alabaster%20Horizon.png', label: 'Alabaster Horizon' },
              { src: '/Gallery/kitchen/Midnight%20Marble.png', label: 'Midnight Marble' },
              { src: '/Gallery/kitchen/Obsidian%20Oak.png', label: 'Obsidian Oak' }
            ]
          }
        ]
      }
    });
  });
};

const managerQuickAccessLabels = [
  'Create Project',
  'ProjectManager',
  'QuotesReview',
  'ServicesManage',
  'MaterialsTrack',
  'Clients',
  'Staff',
  'Estimate',
  'PrivateChat',
  'ProjectChat'
];

const mockPublicManagerSession = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ll_auth_token', 'test-token');
    localStorage.setItem('ll_auth_user', JSON.stringify({
      id: 'manager-1',
      name: 'Daniel Manager',
      email: 'manager@example.com',
      role: 'manager'
    }));
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'manager-1',
          name: 'Daniel Manager',
          email: 'manager@example.com',
          role: 'manager'
        }
      }
    });
  });
};

test('homepage renders one dominant card and routes navigation to dedicated pages', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('body.public-site.page-home')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src^="/assets/optimized/brand/title.png"]')).toHaveCount(1);
  await expect(page.locator('.site-header--public-shell [data-inline-login-form]')).toBeVisible();
  await expectShellNavigationDefaultState(page);
  await expect(page.locator('main h1').first()).toContainText(/premium bathrooms, kitchens and interiors delivered/i);
  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] a[href="/index.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/about.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/services.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/gallery.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/quote.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/contact.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/auth.html"]')).toContainText(/^account$/i);
  await page.locator('[data-nav-menu] a[href="/quote.html"]').click();
  await expect(page).toHaveURL(/\/quote\.html$/);
  await expect(page.locator('form.js-quote-form')).toBeVisible();
  await expect(page.locator('[data-inline-login-form] input[name="email"]')).toBeVisible();
  await expect(page.locator('[data-inline-login-form] input[name="password"]')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('core brochure pages render about, services, gallery, contact and quote routes', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('body.public-site.page-about')).toBeVisible();
  await expect(page.getByRole('heading', { name: /premium renovation studio built/i })).toBeVisible();
  await expect.poll(async () => page.locator('.public-section--dark').first().evaluate((node) => getComputedStyle(node).backgroundImage)).toBe('none');
  await expect.poll(async () => page.locator('.public-section--light').first().evaluate((node) => getComputedStyle(node).backgroundImage)).toBe('none');

  await page.goto('/services.html');
  await expect(page.locator('body.public-site.page-services')).toBeVisible();
  await expect(page.locator('main h1').first()).toHaveText(/^Services$/i);
  await expect(page.locator('.service-summary-list')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^Full Bathroom Renovations$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Interior and Exterior Wall$/i })).toBeVisible();

  await mockFolderGalleryServices(page);
  await page.goto('/gallery.html');
  await expect(page.locator('body.public-site.page-gallery')).toBeVisible();
  await expect(page.locator('.gallery-service-switcher .gallery-service-button')).toHaveCount(3);
  await expect(page.locator('.gallery-service-switcher .gallery-service-button').nth(0)).toContainText(/^bathroom$/i);
  await expect(page.locator('.gallery-service-switcher .gallery-service-button').nth(1)).toContainText(/^exterior$/i);
  await expect(page.locator('.gallery-service-switcher .gallery-service-button').nth(2)).toContainText(/^kitchen$/i);
  await expect(page.locator('[data-gallery-active-project-title]')).toHaveText(/^bathroom$/i);
  await expect(page.locator('[data-gallery-active-project-meta]')).toBeVisible();
  await expect(page.locator('[data-gallery-status]')).toContainText(/bathroom \/ Rustic Harmony \/ photo 1 of 2/i);
  await expect(page.locator('.roller-card.is-center picture source[type="image/avif"]').first()).toHaveAttribute('srcset', /\/Gallery\/optimized\/bathroom\//);
  await expect(page.locator('.roller-card.is-center .roller-image').first()).toHaveAttribute('srcset', /\/Gallery\/optimized\/bathroom\//);
  await page.locator('[data-gallery-next]').click();
  await expect(page.locator('[data-gallery-status]')).toContainText(/bathroom \/ The Slate Suite \/ photo 2 of 2/i);
  await expect.poll(async () => page.locator('.gallery-stage').evaluate((node) => getComputedStyle(node).backgroundImage)).toContain('mainbackground.png');
  const galleryRailTop = await page.locator('#gallery').evaluate((node) => node.getBoundingClientRect().top);
  const galleryIntroTop = await page.locator('.page-intro-grid').evaluate((node) => node.getBoundingClientRect().top);
  expect(galleryRailTop).toBeLessThan(galleryIntroTop);

  await page.goto('/contact.html');
  await expect(page.locator('body.public-site.page-contact')).toBeVisible();
  await expect(page.getByRole('heading', { name: /direct studio contact for premium renovation briefs/i })).toBeVisible();

  await page.goto('/quote.html');
  await expect(page.locator('body.public-site.page-quote')).toBeVisible();
  await expect(page.getByRole('heading', { name: /send one private enquiry for bathrooms, kitchens/i })).toBeVisible();
  await expect(page.locator('form.js-quote-form')).toBeVisible();
  await expect(page.locator('form.js-quote-form input[type="file"][name="files"]')).toHaveAttribute('accept', /image\/\*/i);
  await expect(page.locator('[data-quote-files-status]')).toContainText(/attach up to 8 reference photos/i);
  await expect(page.locator('[data-quote-file-preview]')).toBeHidden();
  await page.locator('form.js-quote-form input[type="file"][name="files"]').setInputFiles(quotePhotoFixtures);
  await expect(page.locator('[data-quote-files-status]')).toContainText(/2 photos selected/i);
  await expect(page.locator('[data-quote-file-preview]')).toBeVisible();
  await expect(page.locator('.quote-file-preview-card')).toHaveCount(2);
  await expect(page.locator('.quote-file-preview-thumb img')).toHaveCount(2);
  await expect(page.locator('.quote-file-preview-name').nth(0)).toContainText('quote-photo-1.png');
  await page.locator('.quote-file-preview-remove').nth(0).click();
  await expect(page.locator('[data-quote-files-status]')).toContainText(/quote-photo-2\.png selected\./i);
  await expect(page.locator('.quote-file-preview-card')).toHaveCount(1);
  const quoteCardTop = await page.locator('#quote-card').evaluate((node) => node.getBoundingClientRect().top);
  const quoteIntroTop = await page.locator('main h1').first().evaluate((node) => node.getBoundingClientRect().top);
  expect(quoteCardTop).toBeLessThan(quoteIntroTop);
});

test('gallery collapses intro and side previews cleanly on narrower desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await mockFolderGalleryServices(page);
  await page.goto('/gallery.html');

  await expect(page.locator('body.public-site.page-gallery')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole('button', { name: /show service exterior/i }).click();

  const galleryIntroColumns = await page.locator('.page-intro-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns);
  expect(galleryIntroColumns.trim().split(/\s+/).length).toBe(1);

  await expect(page.locator('.roller-card.is-center')).toBeVisible();
  await expect.poll(async () => page.locator('.roller-card.is-left').evaluate((node) => getComputedStyle(node).visibility)).toBe('hidden');
  await expect.poll(async () => page.locator('.roller-card.is-right').evaluate((node) => getComputedStyle(node).visibility)).toBe('hidden');
});

test('gallery uses contain for the center image and cover for side previews on wide desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await mockFolderGalleryServices(page);
  await page.goto('/gallery.html');
  await page.getByRole('button', { name: /show service exterior/i }).click();

  await expect(page.locator('.roller-card.is-center')).toBeVisible();
  await expect.poll(async () => page.locator('.roller-card.is-left').evaluate((node) => getComputedStyle(node).visibility)).toBe('visible');
  await expect.poll(async () => page.locator('.roller-card.is-right').evaluate((node) => getComputedStyle(node).visibility)).toBe('visible');
  await expect.poll(async () => page.locator('.roller-card.is-center .roller-image').evaluate((node) => getComputedStyle(node).objectFit)).toBe('contain');
  await expect.poll(async () => page.locator('.roller-card.is-left .roller-image').evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover');
  await expect.poll(async () => page.locator('.roller-card.is-right .roller-image').evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover');
});

test('wall systems service CTA opens quote with wall-systems context preselected', async ({ page }) => {
  await page.goto('/services.html');
  await page.getByRole('link', { name: /discuss wall systems/i }).click();

  await expect(page).toHaveURL(/\/quote\.html\?projectType=interior#quote-card$/);
  await expect(page.locator('#quote-card form.js-quote-form')).toBeVisible();
  await expect(page.locator('#quote-card select[name="projectType"]')).toHaveValue('interior');
});

test('quote page shows a private guest quote preview after submit and from the saved quote link', async ({ page }) => {
  await page.route('**/api/quotes/guest', async (route) => {
    await route.fulfill({
      status: 201,
      json: {
        quoteId: 'quote-preview-1',
        publicToken: 'guest-preview-token',
        status: 'pending',
        workflowStatus: 'submitted',
        attachmentCount: 2,
        attachments: createGuestQuotePreviewPayload().quote.attachments
      }
    });
  });

  await page.route('**/api/quotes/guest/guest-preview-token', async (route) => {
    await route.fulfill({
      json: createGuestQuotePreviewPayload()
    });
  });

  await page.goto('/quote.html');
  const quoteForm = page.locator('form.js-quote-form');
  await quoteForm.locator('input[name="name"]').fill('Marta Client');
  await quoteForm.locator('input[name="phone"]').fill('07395448487');
  await quoteForm.locator('input[name="email"]').fill('client@example.com');
  await quoteForm.locator('select[name="projectType"]').selectOption('kitchen');
  await quoteForm.locator('textarea[name="message"]').fill('Kitchen refresh with appliance wall and new finishes.');
  await quoteForm.locator('input[type="file"][name="files"]').setInputFiles(quotePhotoFixtures);
  await page.getByRole('button', { name: /send enquiry/i }).click();

  await expect(quoteForm.locator('.form-status').first()).toContainText(/request sent with 2 photo\(s\)\. reference: quote-preview-1\./i);
  await expect(quoteForm.locator('[data-quote-followup]')).toBeVisible();
  await expect(quoteForm.locator('[data-quote-followup-title]')).toContainText(/quote status: submitted/i);
  await expect(quoteForm.locator('[data-quote-followup-meta]')).toContainText(/quote-preview-1/i);
  await expect(quoteForm.locator('[data-quote-followup-attachments] .quote-file-preview-card')).toHaveCount(2);
  await expect(quoteForm.locator('[data-quote-followup-actions] a').first()).toHaveAttribute('href', /quote\.html\?quote=guest-preview-token#quote-card$/);
  await expect(page).toHaveURL(/\/quote\.html\?quote=guest-preview-token#quote-card$/);

  await page.goto('/quote.html?quote=guest-preview-token#quote-card');
  const restoredQuoteForm = page.locator('form.js-quote-form');
  await expect(restoredQuoteForm.locator('[data-quote-followup]')).toBeVisible();
  await expect(restoredQuoteForm.locator('[data-quote-followup-title]')).toContainText(/quote status: submitted/i);
  await expect(restoredQuoteForm.locator('[data-quote-followup-attachments] .quote-file-preview-card')).toHaveCount(2);
});

test('guest quote claim handoff runs from the private quote panel into auth confirmation', async ({ page }) => {
  const claimPreviewPayload = createGuestQuotePreviewPayload();

  await page.route('**/api/quotes/guest/guest-preview-token', async (route) => {
    await route.fulfill({
      json: claimPreviewPayload
    });
  });

  await page.route('**/api/quotes/guest/quote-preview-1/claim/request', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      channel: 'email',
      guestEmail: 'guest@example.com'
    });

    await route.fulfill({
      json: {
        message: 'Claim verification code sent',
        quoteId: 'quote-preview-1',
        claimToken: 'claim-token-1',
        channel: 'email',
        maskedTarget: 'gu***@e***.com',
        expiresAt: '2026-03-26T19:00:00.000Z'
      }
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      json: {
        token: 'test-token',
        user: {
          id: 'client-1',
          name: 'Marta Client',
          email: 'client@example.com',
          role: 'client'
        }
      }
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'client-1',
          name: 'Marta Client',
          email: 'client@example.com',
          role: 'client'
        }
      }
    });
  });

  await page.route('**/api/quotes/guest/quote-preview-1/claim/confirm', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      claimToken: 'claim-token-1',
      claimCode: '123456'
    });
    expect(route.request().headers().authorization).toBe('Bearer test-token');

    await route.fulfill({
      json: {
        message: 'Quote claimed successfully',
        quoteId: 'quote-preview-1',
        clientId: 'client-1'
      }
    });
  });

  await page.goto('/quote.html?quote=guest-preview-token#quote-card');

  const claimCard = page.locator('.quote-claim-card');
  await expect(claimCard).toBeVisible();
  await claimCard.locator('select[name="channel"]').selectOption('email');
  await claimCard.locator('input[name="guestEmail"]').fill('guest@example.com');
  await claimCard.getByRole('button', { name: /send claim code/i }).click();
  await expect(claimCard.locator('.form-status')).toContainText(/claim code sent via email/i);

  await claimCard.getByRole('link', { name: /open account to confirm code/i }).click();
  await expect(page).toHaveURL(/\/auth\.html\?next=%2Fclient-dashboard\.html$/);
  await expect(page.locator('#auth-quote-claim-panel')).toBeVisible();
  await expect(page.locator('#auth-quote-claim-summary')).toContainText(/quote-preview-1/i);

  await page.locator('#login-form input[name="email"]').fill('client@example.com');
  await page.locator('#login-form input[name="password"]').fill('secret123');
  await page.locator('#login-form button[type="submit"]').click();

  await expect(page.locator('#login-status')).toContainText(/enter the 6-digit quote claim code below/i);
  await expect(page.locator('#auth-quote-claim-form')).toBeVisible();

  await page.locator('#auth-quote-claim-form input[name="claimCode"]').fill('123456');
  await page.locator('#auth-quote-claim-form button[type="submit"]').click();

  await expect(page.locator('#auth-quote-claim-status')).toContainText(/quote claimed successfully/i);
  await expect(page).toHaveURL(/\/client-dashboard\.html$/);
});

test('guest quote private preview lets the customer add more photos after submit', async ({ page }) => {
  let previewPayload = createGuestQuotePreviewPayload();

  await page.route('**/api/quotes/guest/guest-preview-token', async (route) => {
    await route.fulfill({
      json: previewPayload
    });
  });

  await page.route('**/api/quotes/guest/guest-preview-token/attachments', async (route) => {
    previewPayload = {
      quote: {
        ...previewPayload.quote,
        attachmentCount: 4,
        attachments: [
          ...previewPayload.quote.attachments,
          {
            name: 'quote-photo-3.png',
            url: '/uploads/quote-photo-3.png',
            size: 3072,
            mimeType: 'image/png'
          },
          {
            name: 'quote-photo-4.png',
            url: '/uploads/quote-photo-4.png',
            size: 4096,
            mimeType: 'image/png'
          }
        ]
      }
    };

    await route.fulfill({
      status: 201,
      json: {
        message: 'Added 2 photos to your quote.',
        ...previewPayload
      }
    });
  });

  await page.goto('/quote.html?quote=guest-preview-token#quote-card');

  const quoteForm = page.locator('form.js-quote-form');
  const uploadCard = quoteForm.locator('.quote-followup-upload-card');
  await expect(uploadCard).toBeVisible();
  await expect(uploadCard).toContainText(/you can add 6 more photos/i);
  await uploadCard.locator('input[type="file"][name="files"]').setInputFiles(quotePhotoFixtures);
  await expect(uploadCard.locator('.quote-file-preview-card')).toHaveCount(2);
  await uploadCard.getByRole('button', { name: /add photos to quote/i }).click();

  await expect(uploadCard.locator('.form-status')).toContainText(/added 2 photos to your quote/i);
  await expect(quoteForm.locator('[data-quote-followup-meta]')).toContainText(/photos\s*4/i);
  await expect(quoteForm.locator('[data-quote-followup-attachments] .quote-file-preview-card')).toHaveCount(4);
  await expect(uploadCard).toContainText(/you can add 4 more photos/i);
});

test('authenticated public shell hides login-only controls and keeps one account route', async ({ page }) => {
  await mockPublicClientSession(page);
  await page.goto('/index.html');

  await expect(page.locator('[data-inline-login-form]')).toBeHidden();
  await expect(page.locator('[data-inline-session]')).toBeVisible();
  await expect(page.locator('[data-inline-logout]')).toBeVisible();
  await expect(page.locator('text=Open Account')).toHaveCount(0);
  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toHaveAttribute('href', '/client-dashboard.html');
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toContainText(/^account$/i);

  await page.goto('/premium-kitchens-manchester.html');
  await expect(page.locator('[data-inline-login-form]')).toBeHidden();
  await expect(page.locator('[data-inline-session]')).toBeVisible();
  await expect(page.locator('[data-inline-logout]')).toBeVisible();
  await expect(page.locator('[data-inline-login-form] input[name="email"]')).toBeHidden();
  await expect(page.locator('[data-inline-login-form] input[name="password"]')).toBeHidden();
});

test('authenticated manager public shell shows quick access panel and hides plain account link', async ({ page }) => {
  await mockPublicManagerSession(page);
  await page.goto('/index.html');

  await expect(page.locator('[data-inline-login-form]')).toBeHidden();
  await expect(page.locator('[data-inline-session]')).toBeVisible();
  await expect(page.locator('[data-header-account-panel]')).toBeVisible();
  await expect(page.locator('[data-header-account-role]')).toContainText(/manager/i);

  for (const label of managerQuickAccessLabels) {
    await expect(page.locator('[data-header-account-links]').getByRole('link', { name: label, exact: true })).toHaveCount(1);
  }

  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toBeHidden();
});

test('service, location and legal pages keep the same shell and single primary consultation route', async ({ page }) => {
  await page.goto('/premium-bathrooms-manchester.html');
  await expect(page.locator('body.public-site.page-service')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src^="/assets/optimized/brand/title.png"]')).toHaveCount(1);
  await expect(page.locator('.site-header--public-shell [data-inline-login-form]')).toBeVisible();
  await expect(page.locator('.public-hero--inner .inner-hero-shell.content-card--dark')).toBeVisible();
  await expectShellNavigationDefaultState(page);
  await expect(page.locator('main h1').first()).toContainText(/Bathrooms/i);
  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] a[href="/index.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/services.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/contact.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/quote.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/auth.html"]')).toBeVisible();
  await expect(page.locator('form.js-quote-form')).toHaveCount(1);
  await expect(page.locator('form.js-quote-form input[type="file"][name="files"]')).toHaveAttribute('accept', /image\/\*/i);
  await expect(page.locator('form.js-quote-form [data-quote-file-preview]')).toHaveCount(1);

  await page.goto('/premium-renovations-chorlton.html');
  await expect(page.locator('body.public-site.page-location')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Chorlton/i);

  await page.goto('/privacy.html');
  await expect(page.locator('body.public-site.page-legal')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src^="/assets/optimized/brand/title.png"]')).toHaveCount(1);
  await expect(page.locator('.site-header--public-shell [data-inline-login-form]')).toBeVisible();
  await expectShellNavigationDefaultState(page);
  await expect(page.getByRole('heading', { name: /privacy policy for studio enquiries, consultations/i })).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/about.html"]').first()).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/quote.html"]').first()).toBeVisible();
});
