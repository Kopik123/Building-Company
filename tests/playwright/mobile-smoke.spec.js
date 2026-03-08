const { test, expect } = require('@playwright/test');

test('index mobile menu opens and shows auth entry', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: /open navigation menu/i }).click();
  const nav = page.locator('[data-nav-menu]');
  await expect(nav).toHaveClass(/is-open/);
  await expect(page.locator('a[href="/auth.html"]').first()).toBeVisible();
  await expect(page.locator('[data-header-account-btn]')).toBeVisible();
});

test('auth page renders login/register forms on mobile', async ({ page }) => {
  await page.goto('/auth.html');
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#register-form')).toBeVisible();
});

test('client dashboard mobile menu opens', async ({ page }) => {
  await page.goto('/client-dashboard.html');
  await page.getByRole('button', { name: /open navigation menu/i }).click();
  await expect(page.locator('[data-nav-menu]')).toHaveClass(/is-open/);
});
