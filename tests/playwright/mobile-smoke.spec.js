const { test, expect } = require('@playwright/test');

const mockClientSession = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ll_auth_token', 'test-token');
    localStorage.setItem('ll_auth_user', JSON.stringify({
      id: 'client-1',
      name: 'Marta Client',
      email: 'client@example.com',
      role: 'client'
    }));
  });

  await page.route('**/api/client/overview?includeThreads=false', async (route) => {
    await route.fulfill({
      json: {
        user: { id: 'client-1', name: 'Marta Client', email: 'client@example.com', role: 'client' },
        metrics: { projectCount: 2, activeProjectCount: 1, quoteCount: 1, unreadNotifications: 3 },
        projects: [{
          id: 'project-1',
          title: 'Marble Bathroom Suite',
          status: 'in_progress',
          location: 'Manchester',
          description: 'Bookmatched porcelain slabs, brass trims and hidden storage.',
          assignedManager: { name: 'Daniel' },
          documents: [{ filename: 'scope.pdf', url: 'https://example.com/scope.pdf' }]
        }],
        quotes: [{
          id: 'quote-1',
          projectType: 'Bathroom renovation',
          status: 'responded',
          priority: 'high',
          location: 'Manchester',
          description: 'Luxury bathroom quote ready for approval.'
        }],
        services: [{
          id: 'service-1',
          title: 'Bespoke Carpentry',
          category: 'carpentry',
          basePriceFrom: 2400,
          shortDescription: 'Joinery packages tailored to concealed storage and premium finishes.'
        }]
      }
    });
  });

  await page.route('**/api/group/threads?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        threads: [{ id: 'thread-1', name: 'Bathroom progress', updatedAt: '2026-03-09T10:00:00Z' }]
      }
    });
  });

  await page.route('**/api/group/threads/thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: [{
          id: 'message-1',
          body: 'We confirmed the brass profile today.',
          createdAt: '2026-03-09T10:05:00Z',
          sender: { name: 'Daniel' }
        }]
      }
    });
  });
};

const mockManagerSession = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ll_auth_token', 'test-token');
    localStorage.setItem('ll_auth_user', JSON.stringify({
      id: 'manager-1',
      name: 'Daniel Manager',
      email: 'manager@example.com',
      role: 'manager'
    }));
  });

  await page.route('**/api/manager/projects?*', async (route) => {
    await route.fulfill({
      json: {
        projects: [{
          id: 'project-1',
          title: 'Prestige Kitchen',
          status: 'in_progress',
          location: 'Stockport',
          imageCount: 5,
          documentCount: 2,
          client: { email: 'client@example.com' },
          assignedManager: { email: 'manager@example.com' }
        }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/projects/project-1', async (route) => {
    await route.fulfill({
      json: {
        project: {
          id: 'project-1',
          title: 'Prestige Kitchen',
          status: 'in_progress',
          location: 'Stockport',
          client: { email: 'client@example.com' },
          assignedManager: { email: 'manager@example.com' },
          galleryOrder: 1,
          budgetEstimate: '32000',
          startDate: '2026-03-01',
          endDate: '2026-05-01',
          showInGallery: true,
          isActive: true,
          description: 'Statement kitchen with stone island and fluted oak storage.',
          media: [{ id: 'media-1', filename: 'island.jpg', mediaType: 'image', url: 'https://example.com/island.jpg' }]
        }
      }
    });
  });

  await page.route('**/api/manager/quotes?*', async (route) => {
    await route.fulfill({
      json: {
        quotes: [{
          id: 'quote-1',
          projectType: 'Kitchen remodel',
          guestName: 'Olivia Reed',
          status: 'pending',
          priority: 'high',
          location: 'Manchester',
          postcode: 'M1',
          description: 'Client requests detailed joinery allowance.'
        }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/services?*', async (route) => {
    await route.fulfill({
      json: {
        services: [{
          id: 'service-1',
          title: 'Bathrooms',
          slug: 'bathrooms',
          category: 'bathroom',
          displayOrder: 1,
          showOnWebsite: true,
          shortDescription: 'Marble-led bathroom design and build.'
        }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/materials?*', async (route) => {
    await route.fulfill({
      json: {
        materials: [{
          id: 'material-1',
          name: 'Calacatta Slab',
          sku: 'MAR-001',
          category: 'tiles',
          stockQty: 6,
          minStockQty: 4,
          unitCost: 480,
          supplier: 'Stone House'
        }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/clients/search?*', async (route) => {
    await route.fulfill({ json: { clients: [] } });
  });

  await page.route('**/api/manager/staff/search?*', async (route) => {
    await route.fulfill({ json: { staff: [] } });
  });
};

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
  await expect(page.locator('body.public-site.workspace-site.page-auth')).toBeVisible();
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#register-form')).toBeVisible();
});

test('auth page shows account panel for logged session', async ({ page }) => {
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
          role: 'client',
          phone: '+44 7942 874 446',
          companyName: 'Level Lines Studio'
        }
      }
    });
  });

  await page.goto('/auth.html');
  await expect(page.locator('#auth-account-panel')).toBeVisible();
  await expect(page.locator('#profile-form')).toBeVisible();
  await expect(page.locator('#password-form')).toBeVisible();
});

test('client dashboard mobile menu opens', async ({ page }) => {
  await page.goto('/client-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-client-dashboard')).toBeVisible();
  await page.getByRole('button', { name: /open navigation menu/i }).click();
  await expect(page.locator('[data-nav-menu]')).toHaveClass(/is-open/);
});

test('client dashboard keeps key logged-in cards open on mobile', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');
  await expect(page.locator('#client-projects-list .dashboard-item').first()).toBeVisible();
  await expect(page.locator('#client-threads-list .dashboard-item').first()).toBeVisible();
});

test('manager dashboard mobile menu opens', async ({ page }) => {
  await page.goto('/manager-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-manager-dashboard')).toBeVisible();
  await page.getByRole('button', { name: /open navigation menu/i }).click();
  await expect(page.locator('[data-nav-menu]')).toHaveClass(/is-open/);
});

test('manager dashboard exposes project controls for logged session on mobile', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');
  await expect(page.locator('#project-create-form input[name="title"]')).toBeVisible();
  await expect(page.locator('#projects-list button').first()).toBeVisible();
  await page.locator('#projects-list button').first().evaluate((node) => node.click());
  await expect(page.locator('#project-edit-form input[name="title"]')).toBeVisible();
});
