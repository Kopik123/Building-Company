const { test, expect } = require('@playwright/test');

const openNavIfNeeded = async (page) => {
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.count()) {
    if (await toggle.first().isVisible()) {
      await toggle.first().click();
    }
  }
};

test('homepage renders redesigned shell and mobile navigation', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('body.public-site.page-home')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Bathrooms \| Kitchens \| Interiors/i })).toBeVisible();
  await expect(page.locator('.studio-summary-block--areas')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Send Enquiry/i })).toBeVisible();

  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] a[href="#gallery"]').first()).toBeVisible();
  await expect(page.locator('[data-nav-menu] a', { hasText: 'Contact' })).toHaveCount(0);
});

test('service and location pages expose contact shell and consultation form', async ({ page }) => {
  await page.goto('/premium-bathrooms-manchester.html');
  await expect(page.locator('body.public-site.page-service')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Bathrooms/i);
  await expect(page.locator('[data-brand-phone="0"]').first()).toContainText('+44 7942 874 446');
  await expect(page.locator('#consultation form')).toBeVisible();
  await expect(page.locator('[data-gallery-active-image-title]')).toBeVisible();

  await page.goto('/premium-renovations-chorlton.html');
  await expect(page.locator('body.public-site.page-location')).toBeVisible();
  await expect(page.locator('main h1').first()).toContainText(/Chorlton/i);
  await expect(page.locator('.studio-summary-block--links')).toBeVisible();
});

test('legal page keeps redesigned shell and brand copy', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('body.public-site.page-legal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Privacy policy for studio enquiries/i })).toBeVisible();
  await expect(page.locator('[data-brand-email]').first()).toContainText('LevelLineStudioMCR@gmail.com');
});
