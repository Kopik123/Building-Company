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

test('manager dashboard workflow chooser switches between projects materials and services', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');

  const projectsChoice = page.locator('[data-manager-domain-choice="projects"]');
  const materialsChoice = page.locator('[data-manager-domain-choice="materials"]');
  const servicesChoice = page.locator('[data-manager-domain-choice="services"]');
  const workflowActions = page.locator('#manager-workflow-actions');

  await expect(projectsChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#manager-project-create')).toBeVisible();
  await expect(page.locator('#manager-projects-section')).toBeVisible();
  await expect(page.locator('#manager-services-section')).toBeHidden();
  await expect(page.locator('#manager-materials-section')).toBeHidden();
  await expect(workflowActions.getByRole('button', { name: 'Create project' })).toBeVisible();
  await expect(workflowActions.getByRole('button', { name: 'Edit selected' })).toBeEnabled();

  await materialsChoice.click();
  await expect(materialsChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#manager-materials-section')).toBeVisible();
  await expect(page.locator('#manager-project-create')).toBeHidden();
  await expect(page.locator('#manager-projects-section')).toBeHidden();
  await expect(page.locator('#manager-services-section')).toBeHidden();
  await expect(workflowActions.getByRole('button', { name: 'Add material' })).toBeVisible();
  await expect(workflowActions.getByRole('button', { name: 'Edit stock' })).toBeVisible();

  await servicesChoice.click();
  await expect(servicesChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#manager-services-section')).toBeVisible();
  await expect(page.locator('#manager-project-create')).toBeHidden();
  await expect(page.locator('#manager-projects-section')).toBeHidden();
  await expect(page.locator('#manager-materials-section')).toBeHidden();
  await expect(workflowActions.getByRole('button', { name: 'Add service' })).toBeVisible();
  await expect(workflowActions.getByRole('button', { name: 'Edit services' })).toBeVisible();

  await projectsChoice.click();
  await expect(projectsChoice).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#manager-project-create')).toBeVisible();
  await expect(page.locator('#manager-projects-section')).toBeVisible();
});

test('manager dashboard can create private threads and manage project chat participants', async ({ page }) => {
  await mockManagerSession(page);

  const clients = [
    { id: 'client-1', name: 'Marta Client', email: 'client@example.com', role: 'client' },
    { id: 'client-2', name: 'Nina Client', email: 'nina@example.com', role: 'client' }
  ];
  const staff = [
    { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' },
    { id: 'staff-2', name: 'Leah Builder', email: 'leah@example.com', role: 'employee' },
    { id: 'staff-3', name: 'Site Foreman', email: 'foreman@example.com', role: 'employee' }
  ];
  const project = {
    id: 'project-1',
    title: 'Prestige Kitchen',
    location: 'Stockport',
    status: 'in_progress',
    clientId: 'client-1',
    assignedManagerId: 'manager-1'
  };
  const directThreads = [];
  const directMessagesByThreadId = {};
  const groupThreads = [];
  const groupMessagesByThreadId = {};
  let directThreadCounter = 1;
  let directMessageCounter = 1;
  let groupThreadCounter = 1;
  let groupMemberCounter = 1;

  const toDirectThreadPayload = (thread) => ({
    ...thread,
    participantA: staff[0],
    participantB: clients.find((item) => item.id === thread.participantBId) || staff.find((item) => item.id === thread.participantBId) || null
  });

  const toGroupThreadPayload = (thread) => ({
    ...thread,
    project,
    memberCount: thread.members.length,
    currentUserMembershipRole: 'admin'
  });

  await page.route('**/api/manager/clients/search?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    const needle = query.toLowerCase();
    const matches = clients.filter((item) => item.email.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
    await route.fulfill({ json: { clients: matches } });
  });

  await page.route('**/api/manager/staff/search?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') || '';
    const needle = query.toLowerCase();
    const matches = staff.filter((item) => item.email.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle));
    await route.fulfill({ json: { staff: matches } });
  });

  await page.route('**/api/inbox/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: directThreads.map(toDirectThreadPayload)
      }
    });
  });

  await page.route('**/api/inbox/threads', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const payload = route.request().postDataJSON();
    const threadId = `manager-direct-thread-${directThreadCounter++}`;
    const recipient = clients.find((item) => item.id === payload.recipientUserId) || staff.find((item) => item.id === payload.recipientUserId);
    const message = {
      id: `manager-direct-message-${directMessageCounter++}`,
      body: payload.body,
      createdAt: '2026-03-17T18:00:00Z',
      sender: { name: 'Daniel Manager' }
    };
    const thread = {
      id: threadId,
      subject: payload.subject,
      updatedAt: '2026-03-17T18:00:00Z',
      participantAId: 'manager-1',
      participantBId: recipient.id
    };
    directThreads.unshift(thread);
    directMessagesByThreadId[threadId] = [message];
    await route.fulfill({
      json: {
        thread: toDirectThreadPayload(thread),
        message
      }
    });
  });

  await page.route('**/api/inbox/threads/*/messages?pageSize=100', async (route) => {
    const threadId = route.request().url().match(/threads\/([^/]+)\/messages/)?.[1] || '';
    await route.fulfill({
      json: {
        messages: directMessagesByThreadId[threadId] || []
      }
    });
  });

  await page.route('**/api/group/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: groupThreads.map(toGroupThreadPayload)
      }
    });
  });

  await page.route('**/api/group/threads', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const payload = route.request().postDataJSON();
    const members = [
      {
        id: `group-member-${groupMemberCounter++}`,
        groupThreadId: `manager-group-thread-${groupThreadCounter}`,
        userId: 'manager-1',
        role: 'admin',
        user: staff[0]
      }
    ];

    if (payload.includeProjectClient) {
      members.push({
        id: `group-member-${groupMemberCounter++}`,
        groupThreadId: `manager-group-thread-${groupThreadCounter}`,
        userId: project.clientId,
        role: 'member',
        user: clients[0]
      });
    }

    for (const userId of payload.participantUserIds || []) {
      const user = clients.find((item) => item.id === userId) || staff.find((item) => item.id === userId);
      if (user && !members.some((member) => member.userId === userId)) {
        members.push({
          id: `group-member-${groupMemberCounter++}`,
          groupThreadId: `manager-group-thread-${groupThreadCounter}`,
          userId,
          role: 'member',
          user
        });
      }
    }

    const thread = {
      id: `manager-group-thread-${groupThreadCounter++}`,
      name: payload.name,
      projectId: payload.projectId,
      updatedAt: '2026-03-17T18:05:00Z',
      members
    };
    groupThreads.unshift(thread);
    groupMessagesByThreadId[thread.id] = [];

    await route.fulfill({
      json: {
        thread: toGroupThreadPayload(thread)
      }
    });
  });

  await page.route('**/api/group/threads/*/messages?pageSize=100', async (route) => {
    const threadId = route.request().url().match(/threads\/([^/]+)\/messages/)?.[1] || '';
    await route.fulfill({
      json: {
        messages: groupMessagesByThreadId[threadId] || []
      }
    });
  });

  await page.route('**/api/group/threads/*/members', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const threadId = route.request().url().match(/threads\/([^/]+)\/members/)?.[1] || '';
    const payload = route.request().postDataJSON();
    const thread = groupThreads.find((item) => item.id === threadId);
    const user = clients.find((item) => item.id === payload.userId) || staff.find((item) => item.id === payload.userId);
    if (thread && user && !thread.members.some((member) => member.userId === payload.userId)) {
      thread.members.push({
        id: `group-member-${groupMemberCounter++}`,
        groupThreadId: threadId,
        userId: payload.userId,
        role: 'member',
        user
      });
      thread.updatedAt = '2026-03-17T18:06:00Z';
    }
    await route.fulfill({ json: { member: { userId: payload.userId } } });
  });

  await page.route('**/api/group/threads/*/members/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    const match = route.request().url().match(/threads\/([^/]+)\/members\/([^/?]+)/);
    const threadId = match?.[1] || '';
    const userId = match?.[2] || '';
    const thread = groupThreads.find((item) => item.id === threadId);
    if (thread) {
      thread.members = thread.members.filter((member) => member.userId !== userId);
      thread.updatedAt = '2026-03-17T18:07:00Z';
    }
    await route.fulfill({ json: { message: 'Member removed' } });
  });

  await page.goto('/manager-dashboard.html');

  await page.locator('#manager-private-inbox').scrollIntoViewIfNeeded();
  await page.locator('#manager-direct-thread-form select[name="recipientType"]').selectOption('client');
  await page.locator('#manager-direct-thread-form input[name="recipientEmail"]').fill('client@example.com');
  await page.locator('#manager-direct-thread-form input[name="subject"]').fill('Kick-off thread');
  await page.locator('#manager-direct-thread-form textarea[name="body"]').fill('Let us confirm the next site visit window.');
  await page.locator('#manager-direct-thread-form button[type="submit"]').click();

  await expect(page.locator('#manager-direct-thread-status')).toContainText(/private thread created/i);
  await expect(page.locator('#manager-direct-threads-list')).toContainText('Marta Client');
  await expect(page.locator('#manager-direct-messages-list')).toContainText('Let us confirm the next site visit window.');

  await page.locator('#manager-project-chat').scrollIntoViewIfNeeded();
  await page.locator('#manager-group-thread-form input[name="name"]').fill('Kitchen delivery thread');
  await page.locator('#manager-group-thread-form select[name="projectId"]').selectOption('project-1');
  await page.locator('#manager-group-thread-form select[name="participantType"]').selectOption('staff');
  await page.locator('#manager-group-thread-form input[name="participantEmail"]').fill('leah@example.com');
  await page.locator('#manager-group-thread-form button[type="submit"]').click();

  await expect(page.locator('#manager-group-thread-status')).toContainText(/project chat created/i);
  await expect(page.locator('#manager-group-threads-list')).toContainText('Kitchen delivery thread');
  await expect(page.locator('#manager-group-members-list')).toContainText('Daniel Manager');
  await expect(page.locator('#manager-group-members-list')).toContainText('Marta Client');
  await expect(page.locator('#manager-group-members-list')).toContainText('Leah Builder');

  await page.locator('#manager-group-member-form select[name="participantType"]').selectOption('staff');
  await page.locator('#manager-group-member-form input[name="participantEmail"]').fill('foreman@example.com');
  await page.locator('#manager-group-member-form button[type="submit"]').click();

  await expect(page.locator('#manager-group-member-status')).toContainText(/participant added/i);
  await expect(page.locator('#manager-group-members-list')).toContainText('Site Foreman');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#manager-group-members-list .dashboard-item', { hasText: 'Site Foreman' }).getByRole('button', { name: 'Remove' }).click();

  await expect(page.locator('#manager-group-member-status')).toContainText(/participant removed/i);
  await expect(page.locator('#manager-group-members-list')).not.toContainText('Site Foreman');
});
