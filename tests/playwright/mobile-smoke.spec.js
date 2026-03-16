const { test, expect } = require('@playwright/test');

const openNavIfNeeded = async (page) => {
  const toggle = page.locator('[data-nav-toggle]');
  if (await toggle.count()) {
    if (await toggle.first().isVisible()) {
      await toggle.first().click();
      return;
    }
  }
};

const expectNoHorizontalScroll = async (page) => {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(hasOverflow).toBeFalsy();
};

const expectResponsiveShellDefaultNavState = async (page) => {
  const toggle = page.locator('.site-header--public-shell .public-menu-toggle');
  const navMenu = page.locator('.site-header--public-shell [data-nav-menu]');

  if (await toggle.first().isVisible()) {
    await expect(navMenu).toBeHidden();
    return;
  }

  await expect(navMenu).toBeVisible();
};

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

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'client-1',
          name: 'Marta Client',
          email: 'client@example.com',
          role: 'client',
          phone: '+44 7942 874 446'
        }
      }
    });
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

  await page.route('**/api/inbox/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: [{
          id: 'direct-thread-1',
          subject: 'Direct manager conversation',
          updatedAt: '2026-03-09T09:30:00Z',
          participantA: { id: 'client-1', name: 'Marta Client', email: 'client@example.com' },
          participantB: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com' }
        }]
      }
    });
  });

  await page.route('**/api/inbox/threads/direct-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: [{
          id: 'direct-message-1',
          body: 'We can review the revised tile selection this afternoon.',
          createdAt: '2026-03-09T09:35:00Z',
          sender: { name: 'Daniel' }
        }]
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

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'manager-1',
          name: 'Daniel Manager',
          email: 'manager@example.com',
          role: 'manager',
          phone: '+44 7942 874 446'
        }
      }
    });
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

  await page.route('**/api/manager/estimates?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        estimates: [{
          id: 'estimate-1',
          title: 'Prestige Kitchen Estimate',
          status: 'draft',
          total: 14800,
          projectId: 'project-1',
          project: { id: 'project-1', title: 'Prestige Kitchen', location: 'Stockport' }
        }]
      }
    });
  });

  await page.route('**/api/manager/estimates/estimate-1', async (route) => {
    await route.fulfill({
      json: {
        estimate: {
          id: 'estimate-1',
          title: 'Prestige Kitchen Estimate',
          status: 'draft',
          total: 14800,
          subtotal: 14800,
          projectId: 'project-1',
          project: { id: 'project-1', title: 'Prestige Kitchen', location: 'Stockport' },
          lines: [{
            id: 'estimate-line-1',
            description: 'Kitchen installation and refurbishment',
            lineType: 'service',
            quantity: 1,
            unit: 'scope',
            lineTotal: 14800
          }]
        }
      }
    });
  });

  await page.route('**/api/inbox/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: [{
          id: 'manager-direct-thread-1',
          subject: 'Direct manager conversation',
          updatedAt: '2026-03-09T09:30:00Z',
          participantA: { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com' },
          participantB: { id: 'client-1', name: 'Marta Client', email: 'client@example.com' }
        }]
      }
    });
  });

  await page.route('**/api/inbox/threads/manager-direct-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: [{
          id: 'manager-direct-message-1',
          body: 'Client approved the revised lighting allowance.',
          createdAt: '2026-03-09T09:40:00Z',
          sender: { name: 'Marta Client' }
        }]
      }
    });
  });

  await page.route('**/api/group/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: [{ id: 'manager-group-thread-1', name: 'Prestige Kitchen', updatedAt: '2026-03-09T10:00:00Z' }]
      }
    });
  });

  await page.route('**/api/group/threads/manager-group-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: [{
          id: 'manager-group-message-1',
          body: 'Stone samples booked for Friday.',
          createdAt: '2026-03-09T10:05:00Z',
          sender: { name: 'Daniel Manager' }
        }]
      }
    });
  });

  await page.route('**/api/manager/clients/search?*', async (route) => {
    await route.fulfill({
      json: {
        clients: [{ id: 'client-1', name: 'Marta Client', email: 'client@example.com', phone: '+44 7000 000 000' }]
      }
    });
  });

  await page.route('**/api/manager/staff/search?*', async (route) => {
    await route.fulfill({
      json: {
        staff: [{ id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' }]
      }
    });
  });
};

test('homepage mobile shell keeps visible inline login and hamburger navigation', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.site-header--public-shell .public-auth-toggle')).toBeHidden();
  await expect(page.locator('.site-header--public-shell [data-inline-login-form]')).toBeVisible();
  await expectResponsiveShellDefaultNavState(page);
  await openNavIfNeeded(page);
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src="/assets/optimized/brand/title.png"]')).toHaveCount(1);
  await expect(page.locator('[data-nav-menu] a[href="/index.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/about.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/services.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/gallery.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/quote.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/contact.html"]')).toBeVisible();
  await expect(page.locator('[data-nav-menu] a[href="/auth.html"]')).toContainText(/^account$/i);
  await expectNoHorizontalScroll(page);
});

test('auth page renders login/register forms on mobile', async ({ page }) => {
  await page.goto('/auth.html');
  await expect(page.locator('body.public-site.workspace-site.page-auth')).toBeVisible();
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page.locator('#register-form')).toBeVisible();
  await expectNoHorizontalScroll(page);
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
  await expect(page.locator('#auth-guest-grid')).toBeHidden();
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toBeHidden();
  await expect(page.locator('[data-inline-session]')).toBeHidden();
});

test('client dashboard mobile menu opens', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-client-dashboard')).toBeVisible();
  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toBeHidden();
  await expect(page.locator('[data-account-settings-link]')).toBeVisible();
  await expect(page.locator('#client-logout')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('client dashboard keeps key logged-in cards open on mobile', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');
  await expect(page.getByRole('heading', { name: 'Project Status', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /mail box/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /available options/i })).toBeVisible();
  await expect(page.locator('#client-mailbox-direct-count')).toContainText(/[0-9]+/);
  await expect(page.locator('#client-mailbox-project-count')).toContainText(/[0-9]+/);
  await expect(page.locator('#client-available-options a[href="#client-projects-section"]').first()).toBeVisible();
  await expect(page.locator('#client-projects-list .dashboard-item').first()).toBeVisible();
  await page.locator('#client-direct-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#client-direct-threads-list .dashboard-item').first()).toBeVisible();
  await page.locator('#client-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#client-threads-list .dashboard-item').first()).toBeVisible();
});

test('manager dashboard mobile menu opens', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-manager-dashboard')).toBeVisible();
  await openNavIfNeeded(page);
  await expect(page.locator('[data-nav-menu] [data-auth-link]')).toBeHidden();
  await expect(page.locator('[data-account-settings-link]')).toBeVisible();
  await expect(page.locator('#dashboard-logout')).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('guest is redirected away from client workspace to auth route with next param', async ({ page }) => {
  await page.goto('/client-dashboard.html');
  await expect(page).toHaveURL(/\/auth\.html\?next=%2Fclient-dashboard\.html&reason=session/);
});

test('manager dashboard exposes project controls for logged session on mobile', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');
  await expect(page.getByRole('heading', { name: /company events/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /mail box/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /available options/i })).toBeVisible();
  await expect(page.locator('#manager-mailbox-private-count')).toContainText('1');
  await expect(page.locator('#manager-mailbox-project-count')).toContainText('1');
  await expect(page.locator('#manager-available-options a[href="#manager-projects-section"]').first()).toBeVisible();
  await expect(page.locator('#project-create-form input[name="title"]')).toBeVisible();
  await expect(page.locator('#projects-list button').first()).toBeVisible();
  await page.locator('#projects-list button').first().evaluate((node) => node.click());
  await expect(page.locator('#project-edit-form input[name="title"]')).toBeVisible();
  await page.locator('#estimates-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#estimates-list .dashboard-item').first()).toBeVisible();
  await page.locator('#manager-direct-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#manager-direct-threads-list .dashboard-item').first()).toBeVisible();
  await page.locator('#manager-group-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#manager-group-threads-list .dashboard-item').first()).toBeVisible();
});
