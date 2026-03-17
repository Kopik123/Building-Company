const { test, expect } = require('@playwright/test');

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

test('homepage renders one dominant card and routes navigation to dedicated pages', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('body.public-site.page-home')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src="/assets/optimized/brand/title.png"]')).toHaveCount(1);
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

  await page.goto('/services.html');
  await expect(page.locator('body.public-site.page-services')).toBeVisible();
  await expect(page.locator('main h1').first()).toHaveText(/^Services$/i);
  await expect(page.locator('.service-summary-list')).toContainText(/Bathrooms/i);
  await expect(page.locator('.service-summary-list')).toContainText(/Wall Systems/i);

  await page.goto('/gallery.html');
  await expect(page.locator('body.public-site.page-gallery')).toBeVisible();
  await expect(page.locator('[data-gallery-active-image-title]')).toBeVisible();
  await expect(page.locator('[data-gallery-active-project-title]')).toBeVisible();

  await page.goto('/contact.html');
  await expect(page.locator('body.public-site.page-contact')).toBeVisible();
  await expect(page.getByRole('heading', { name: /direct studio contact for premium renovation briefs/i })).toBeVisible();

  await page.goto('/quote.html');
  await expect(page.locator('body.public-site.page-quote')).toBeVisible();
  await expect(page.getByRole('heading', { name: /send one private enquiry for bathrooms, kitchens/i })).toBeVisible();
  await expect(page.locator('form.js-quote-form')).toBeVisible();
});

test('wall systems service CTA opens quote with wall-systems context preselected', async ({ page }) => {
  await page.goto('/services.html');
  await page.getByRole('link', { name: /discuss wall systems/i }).click();

  await expect(page).toHaveURL(/\/quote\.html\?projectType=interior#quote-card$/);
  await expect(page.locator('#quote-card form.js-quote-form')).toBeVisible();
  await expect(page.locator('#quote-card select[name="projectType"]')).toHaveValue('interior');
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
});

test('service, location and legal pages keep the same shell and single primary consultation route', async ({ page }) => {
  await page.goto('/premium-bathrooms-manchester.html');
  await expect(page.locator('body.public-site.page-service')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src="/assets/optimized/brand/title.png"]')).toHaveCount(1);
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

  await page.goto('/premium-renovations-chorlton.html');
  await expect(page.locator('body.public-site.page-location')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Chorlton/i);

  await page.goto('/privacy.html');
  await expect(page.locator('body.public-site.page-legal')).toBeVisible();
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src="/assets/optimized/brand/title.png"]')).toHaveCount(1);
  await expect(page.locator('.site-header--public-shell [data-inline-login-form]')).toBeVisible();
  await expectShellNavigationDefaultState(page);
  await expect(page.getByRole('heading', { name: /privacy policy for studio enquiries, consultations/i })).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/about.html"]').first()).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/quote.html"]').first()).toBeVisible();
});
