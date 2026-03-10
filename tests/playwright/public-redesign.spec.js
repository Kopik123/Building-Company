const { test, expect } = require('@playwright/test');

const openNavIfNeeded = async (page) => {
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.count()) {
    if (await toggle.first().isVisible()) {
      await toggle.first().click();
    }
  }
};

test('homepage renders premium shell, new IA and homepage section order', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('body.public-site.page-home')).toBeVisible();
  await expect(page.locator('.home-brand-lockup .home-title-image')).toBeVisible();
  await expect(page.locator('.home-hero-copy h1')).toContainText(/premium bathroom, kitchen and interior renovation studio/i);
  await expect(page.locator('#projects')).toBeVisible();
  await expect(page.locator('#gallery')).toBeVisible();
  await expect(page.locator('#services')).toBeVisible();
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.locator('#quote')).toBeVisible();
  await expect(page.locator('.home-account-links a[href="/about.html"]')).toBeVisible();
  await expect(page.locator('.home-account-links a[href="/gallery.html"]')).toBeVisible();
  await expect(page.locator('.home-account-links a[href="/contact.html"]')).toBeVisible();
  await expect(page.locator('.home-account-links a[href="/quote.html"]')).toBeVisible();
  await expect(page.locator('[data-auth-link]').first()).toContainText(/login \/ register/i);
});

test('brand pages render about, gallery, contact and quote routes', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.locator('body.public-site.page-about')).toBeVisible();
  await expect(page.getByRole('heading', { name: /black, marble and gold/i })).toBeVisible();

  await page.goto('/gallery.html');
  await expect(page.locator('body.public-site.page-gallery')).toBeVisible();
  await expect(page.locator('[data-gallery-active-image-title]')).toBeVisible();
  await expect(page.locator('[data-gallery-active-project-title]')).toBeVisible();

  await page.goto('/contact.html');
  await expect(page.locator('body.public-site.page-contact')).toBeVisible();
  await expect(page.getByRole('heading', { name: /direct studio contact/i })).toBeVisible();

  await page.goto('/quote.html');
  await expect(page.locator('body.public-site.page-quote')).toBeVisible();
  await expect(page.getByRole('heading', { name: /send one private enquiry/i })).toBeVisible();
  await expect(page.locator('form.js-quote-form')).toBeVisible();
});

test('service, location and legal pages keep the same shell and SEO contact path', async ({ page }) => {
  await page.goto('/premium-bathrooms-manchester.html');
  await expect(page.locator('body.public-site.page-service')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Bathrooms/i);
  await expect(page.locator('[data-nav-menu] a[href="/contact.html"]')).toHaveCount(1);
  await expect(page.locator('[data-nav-menu] a[href="/quote.html"]')).toHaveCount(1);
  await expect(page.locator('#consultation form, form.js-quote-form')).toHaveCount(1);

  await page.goto('/premium-renovations-chorlton.html');
  await expect(page.locator('body.public-site.page-location')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Chorlton/i);

  await page.goto('/privacy.html');
  await expect(page.locator('body.public-site.page-legal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /privacy policy for studio enquiries/i })).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/about.html"]').first()).toBeVisible();
  await expect(page.locator('footer .footer-block .footer-links a[href="/quote.html"]').first()).toBeVisible();
});
