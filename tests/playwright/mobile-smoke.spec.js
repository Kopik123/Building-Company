const path = require('node:path');
const { test, expect } = require('@playwright/test');

const messageAttachmentFixture = path.join(__dirname, '..', 'fixtures', 'message-attachment.txt');

const openNavIfNeeded = async (page) => {
  const toggle = page.locator('[data-nav-toggle]');
  const firstToggle = toggle.first();
  const hasToggle = Boolean(await toggle.count());
  if (!hasToggle) {
    return;
  }

  if (await firstToggle.isVisible()) {
    await firstToggle.click();
  }
};

const expectNoHorizontalScroll = async (page) => {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > globalThis.innerWidth + 2);
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

const canonicalFooterServices = [
  'Full Bathroom Renovations',
  'Kitchen Installation and Refurbishment',
  'Tiling incl. Large Format / Wet Showers / Exterior',
  'Carpentry',
  'Interior and Exterior Wall'
];

const staleFooterServices = [
  'External Wall Systems',
  'Interior Wall Systems',
  'Flooring Installation'
];

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

const expectCanonicalFooterServices = async (page) => {
  const footerServices = page.locator('footer [data-brand-service-links]');
  await expect(footerServices.locator('a')).toHaveCount(canonicalFooterServices.length);

  for (const label of canonicalFooterServices) {
    await expect(footerServices.getByRole('link', { name: label, exact: true })).toHaveCount(1);
  }

  for (const label of staleFooterServices) {
    await expect(footerServices.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
};

const expandDashboardSectionIfCollapsed = async (page, sectionSelector) => {
  const toggle = page.locator(`${sectionSelector} .dashboard-accordion-toggle`);
  const firstToggle = toggle.first();
  const hasToggle = Boolean(await toggle.count());
  if (!hasToggle) return;
  const toggleVisible = await firstToggle.isVisible();
  if (!toggleVisible) return;
  const expanded = await firstToggle.getAttribute('aria-expanded');
  if (expanded === 'false') {
    await firstToggle.click();
  }
};

const handleRouteMethod = async (route, method, onMatch) => {
  if (route.request().method() === method) {
    await onMatch();
    return;
  }

  await route.fallback();
};

const memberListHasUser = (members, userId) => members.some((member) => member.userId === userId);

const addMemberIfMissing = (members, member) => {
  const memberAlreadyPresent = memberListHasUser(members, member.userId);
  if (memberAlreadyPresent) {
    return;
  }

  members.push(member);
};

const mockClientSession = async (page) => {
  const directThreadState = {
    id: 'direct-thread-1',
    subject: 'Direct manager conversation',
    updatedAt: '2026-03-09T09:30:00Z',
    latestMessagePreview: 'We can review the revised tile selection this afternoon.',
    latestMessageAt: '2026-03-09T09:35:00Z',
    unreadCount: 1,
    participantA: { id: 'client-1', name: 'Marta Client', email: 'client@example.com' },
    participantB: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com' }
  };
  const directMessagesState = [{
    id: 'direct-message-1',
    body: 'We can review the revised tile selection this afternoon.',
    createdAt: '2026-03-09T09:35:00Z',
    sender: { name: 'Daniel' },
    attachments: []
  }];

  const groupThreadState = {
    id: 'thread-1',
    name: 'Bathroom progress',
    updatedAt: '2026-03-09T10:00:00Z',
    latestMessagePreview: 'We confirmed the brass profile today.',
    latestMessageAt: '2026-03-09T10:05:00Z',
    latestMessageSender: { id: 'manager-1', name: 'Daniel', email: 'manager@example.com', role: 'manager' },
    messageCount: 1
  };
  const groupMessagesState = [{
    id: 'message-1',
    body: 'We confirmed the brass profile today.',
    createdAt: '2026-03-09T10:05:00Z',
    sender: { name: 'Daniel' },
    attachments: []
  }];

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
        threads: [groupThreadState]
      }
    });
  });

  await page.route('**/api/inbox/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: [directThreadState]
      }
    });
  });

  await page.route('**/api/inbox/threads/direct-thread-1/read', async (route) => {
    directThreadState.unreadCount = 0;
    await route.fulfill({ json: { message: 'Thread marked as read', markedReadCount: 1 } });
  });

  await page.route('**/api/inbox/threads/direct-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: directMessagesState
      }
    });
  });

  await page.route('**/api/inbox/threads/direct-thread-1/messages/upload', async (route) => {
    directMessagesState.push({
      id: `direct-message-${directMessagesState.length + 1}`,
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-09T09:40:00Z',
      sender: { name: 'Marta Client' },
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    });
    directThreadState.latestMessagePreview = 'Sent 1 file(s)';
    directThreadState.latestMessageAt = '2026-03-09T09:40:00Z';
    await route.fulfill({
      json: {
        message: directMessagesState.at(-1)
      }
    });
  });

  await page.route('**/api/group/threads/thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: groupMessagesState
      }
    });
  });

  await page.route('**/api/group/threads/thread-1/messages/upload', async (route) => {
    groupMessagesState.push({
      id: `message-${groupMessagesState.length + 1}`,
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-09T10:10:00Z',
      sender: { name: 'Marta Client' },
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    });
    groupThreadState.latestMessagePreview = 'Sent 1 file(s)';
    groupThreadState.latestMessageAt = '2026-03-09T10:10:00Z';
    groupThreadState.messageCount = groupMessagesState.length;
    await route.fulfill({
      json: {
        message: groupMessagesState.at(-1)
      }
    });
  });
};

const mockManagerSession = async (page) => {
  const directThreadState = {
    id: 'manager-direct-thread-1',
    subject: 'Direct manager conversation',
    updatedAt: '2026-03-09T09:30:00Z',
    latestMessagePreview: 'Client approved the revised lighting allowance.',
    latestMessageAt: '2026-03-09T09:40:00Z',
    unreadCount: 0,
    participantA: { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com' },
    participantB: { id: 'client-1', name: 'Marta Client', email: 'client@example.com' }
  };
  const directMessagesState = [{
    id: 'manager-direct-message-1',
    body: 'Client approved the revised lighting allowance.',
    createdAt: '2026-03-09T09:40:00Z',
    sender: { name: 'Marta Client' },
    attachments: []
  }];
  const groupThreadState = {
    id: 'manager-group-thread-1',
    name: 'Prestige Kitchen',
    updatedAt: '2026-03-09T10:00:00Z',
    latestMessagePreview: 'Stone samples booked for Friday.',
    latestMessageAt: '2026-03-09T10:05:00Z',
    latestMessageSender: { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' },
    messageCount: 1
  };
  const groupMessagesState = [{
    id: 'manager-group-message-1',
    body: 'Stone samples booked for Friday.',
    createdAt: '2026-03-09T10:05:00Z',
    sender: { name: 'Daniel Manager' },
    attachments: []
  }];

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
        threads: [directThreadState]
      }
    });
  });

  await page.route('**/api/inbox/threads/manager-direct-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: directMessagesState
      }
    });
  });

  await page.route('**/api/inbox/threads/manager-direct-thread-1/messages/upload', async (route) => {
    directMessagesState.push({
      id: `manager-direct-message-${directMessagesState.length + 1}`,
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-09T09:45:00Z',
      sender: { name: 'Daniel Manager' },
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    });
    directThreadState.latestMessagePreview = 'Sent 1 file(s)';
    directThreadState.latestMessageAt = '2026-03-09T09:45:00Z';
    await route.fulfill({
      json: {
        message: directMessagesState.at(-1)
      }
    });
  });

  await page.route('**/api/group/threads?*', async (route) => {
    await route.fulfill({
      json: {
        threads: [groupThreadState]
      }
    });
  });

  await page.route('**/api/group/threads/manager-group-thread-1/messages?pageSize=100', async (route) => {
    await route.fulfill({
      json: {
        messages: groupMessagesState
      }
    });
  });

  await page.route('**/api/group/threads/manager-group-thread-1/messages/upload', async (route) => {
    groupMessagesState.push({
      id: `manager-group-message-${groupMessagesState.length + 1}`,
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-09T10:10:00Z',
      sender: { name: 'Daniel Manager' },
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    });
    groupThreadState.latestMessagePreview = 'Sent 1 file(s)';
    groupThreadState.latestMessageAt = '2026-03-09T10:10:00Z';
    groupThreadState.messageCount = groupMessagesState.length;
    await route.fulfill({
      json: {
        message: groupMessagesState.at(-1)
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
  await expect(page.locator('.site-header--public-shell .public-brand-title-image[src^="/assets/optimized/brand/title.png"]')).toHaveCount(1);
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
  await expectCanonicalFooterServices(page);
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

test('auth page shows manager quick access panel for logged manager session', async ({ page }) => {
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
          phone: '+44 7942 874 446',
          companyName: 'Level Lines Studio'
        }
      }
    });
  });

  await page.goto('/auth.html');
  await expect(page.locator('#auth-account-panel')).toBeVisible();
  await expect(page.locator('#auth-quick-access-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick Access', exact: true })).toBeVisible();

  for (const label of managerQuickAccessLabels) {
    await expect(page.locator('#auth-quick-access-links').getByRole('link', { name: label, exact: true })).toHaveCount(1);
  }
});

test('client dashboard mobile menu opens', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-client-dashboard')).toBeVisible();
  await expectCanonicalFooterServices(page);
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
  await expect(page.getByRole('heading', { name: /quick access/i })).toBeVisible();
  await expect(page.locator('#client-mailbox-direct-count')).toContainText(/[0-9]+/);
  await expect(page.locator('#client-mailbox-project-count')).toContainText(/[0-9]+/);
  await expect(page.locator('#client-available-options a[href="#client-projects-section"]').first()).toBeVisible();
  await expect(page.locator('#client-projects-list .dashboard-item').first()).toBeVisible();
  await page.locator('#client-direct-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#client-direct-threads-list .dashboard-item').first()).toBeVisible();
  await page.locator('#client-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#client-threads-list .dashboard-item').first()).toBeVisible();
});

test('client dashboard loads direct and project chat messages when threads open', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');

  await page.locator('#client-direct-threads-list').scrollIntoViewIfNeeded();
  await expect(page.locator('#client-direct-threads-list .dashboard-item').first()).toContainText('We can review the revised tile selection this afternoon.');
  await page.locator('#client-direct-threads-list .dashboard-item .btn').first().click();
  await expect(page.locator('#client-direct-messages-list')).toContainText('We can review the revised tile selection this afternoon.');
  await expect(page.locator('#client-direct-threads-list .dashboard-thread-badge')).toBeHidden();

  await page.locator('#client-threads-list').scrollIntoViewIfNeeded();
  await page.locator('#client-threads-list .dashboard-item .btn').first().click();
  await expect(page.locator('#client-messages-list')).toContainText('We confirmed the brass profile today.');
});

test('client dashboard can send attachments in direct and project chat', async ({ page }) => {
  await mockClientSession(page);
  await page.goto('/client-dashboard.html');

  await page.locator('#client-direct-threads-list').scrollIntoViewIfNeeded();
  await page.locator('#client-direct-threads-list .dashboard-item .btn').first().click();
  await page.locator('#client-direct-message-form input[name="files"]').setInputFiles(messageAttachmentFixture);
  await page.locator('#client-direct-message-form button[type="submit"]').click();
  await expect(page.locator('#client-direct-message-status')).toContainText(/private message sent/i);
  await expect(page.locator('#client-direct-messages-list')).toContainText('message-attachment.txt');

  await page.locator('#client-threads-list').scrollIntoViewIfNeeded();
  await page.locator('#client-threads-list .dashboard-item .btn').first().click();
  await page.locator('#client-message-form input[name="files"]').setInputFiles(messageAttachmentFixture);
  await page.locator('#client-message-form button[type="submit"]').click();
  await expect(page.locator('#client-message-status')).toContainText(/message sent/i);
  await expect(page.locator('#client-messages-list')).toContainText('message-attachment.txt');
});

test('manager dashboard mobile menu opens', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');
  await expect(page.locator('body.public-site.workspace-site.page-manager-dashboard')).toBeVisible();
  await expectCanonicalFooterServices(page);
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
  await expect(page.getByRole('heading', { name: /quick access/i })).toBeVisible();
  await expect(page.locator('#manager-mailbox-private-count')).toContainText('1');
  await expect(page.locator('#manager-mailbox-project-count')).toContainText('1');
  await expect(page.locator('#manager-available-options a[href="#manager-projects-section"]').first()).toBeVisible();
  for (const label of managerQuickAccessLabels) {
    await expect(
      page.locator('#manager-available-options .workspace-option-link strong').filter({ hasText: label })
    ).toHaveCount(1);
  }
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

test('manager dashboard can send attachments in private and project chat', async ({ page }) => {
  await mockManagerSession(page);
  await page.goto('/manager-dashboard.html');

  await page.locator('#manager-private-inbox').scrollIntoViewIfNeeded();
  await page.locator('#manager-direct-threads-list .dashboard-item .btn').first().click();
  await page.locator('#manager-direct-message-form input[name="files"]').setInputFiles(messageAttachmentFixture);
  await page.locator('#manager-direct-message-form button[type="submit"]').click();
  await expect(page.locator('#manager-direct-message-status')).toContainText(/private message sent/i);
  await expect(page.locator('#manager-direct-messages-list')).toContainText('message-attachment.txt');

  await page.locator('#manager-project-chat').scrollIntoViewIfNeeded();
  await page.locator('#manager-group-threads-list .dashboard-item .btn').first().click();
  await page.locator('#manager-group-message-form input[name="files"]').setInputFiles(messageAttachmentFixture);
  await page.locator('#manager-group-message-form button[type="submit"]').click();
  await expect(page.locator('#manager-group-message-status')).toContainText(/project message sent/i);
  await expect(page.locator('#manager-group-messages-list')).toContainText('message-attachment.txt');
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
  await expect(workflowActions.getByRole('button', { name: 'Edit storage' })).toBeVisible();

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

test('manager dashboard quote controls can accept and update a quote', async ({ page }) => {
  await mockManagerSession(page);

  const quoteState = {
    id: 'quote-1',
    projectType: 'Kitchen remodel',
    guestName: 'Olivia Reed',
    status: 'pending',
    priority: 'high',
    location: 'Manchester',
    postcode: 'M1',
    description: 'Client requests detailed joinery allowance.',
    assignedManagerId: null
  };

  await page.route('**/api/manager/quotes?*', async (route) => {
    await route.fulfill({
      json: {
        quotes: [{ ...quoteState }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/quotes/quote-1/accept', async (route) => {
    quoteState.assignedManagerId = 'manager-1';
    quoteState.status = 'in_progress';
    await route.fulfill({ json: { quote: { ...quoteState } } });
  });

  await page.route('**/api/manager/quotes/quote-1', async (route) => {
    await handleRouteMethod(route, 'PATCH', async () => {
      const payload = route.request().postDataJSON();
      quoteState.status = payload.status;
      quoteState.priority = payload.priority;
      await route.fulfill({ json: { quote: { ...quoteState } } });
    });
  });

  await page.goto('/manager-dashboard.html');
  await page.locator('#manager-quotes-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-quotes-section');

  const quoteCard = page.locator('#quotes-list .dashboard-item').first();
  await expect(quoteCard).toBeVisible();
  await expect(quoteCard.getByRole('button', { name: 'Accept' })).toBeVisible();

  await quoteCard.getByRole('button', { name: 'Accept' }).click();
  await expect(quoteCard).toContainText(/in_progress/i);
  await expect(quoteCard.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await quoteCard.locator('select').nth(0).selectOption('responded');
  await quoteCard.locator('select').nth(1).selectOption('low');
  await quoteCard.getByRole('button', { name: 'Save' }).click();

  await expect(quoteCard).toContainText(/responded/i);
  await expect(quoteCard).toContainText(/priority low/i);
});

test('manager dashboard estimate controls can update an estimate and add custom lines', async ({ page }) => {
  await mockManagerSession(page);

  const estimateState = {
    id: 'estimate-1',
    title: 'Prestige Kitchen Estimate',
    status: 'draft',
    total: 14800,
    subtotal: 14800,
    projectId: 'project-1',
    quoteId: 'quote-1',
    notes: 'Initial kitchen draft.',
    project: { id: 'project-1', title: 'Prestige Kitchen', location: 'Stockport' },
    lines: [{
      id: 'estimate-line-1',
      description: 'Kitchen installation and refurbishment',
      lineType: 'service',
      quantity: 1,
      unit: 'scope',
      lineTotal: 14800
    }]
  };
  let lineCounter = 2;

  const recomputeEstimateTotals = () => {
    estimateState.total = estimateState.lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
    estimateState.subtotal = estimateState.total;
  };

  const toEstimateSummary = () => ({
    id: estimateState.id,
    title: estimateState.title,
    status: estimateState.status,
    total: estimateState.total,
    projectId: estimateState.projectId,
    project: estimateState.project
  });

  const toEstimateDetail = () => ({
    ...toEstimateSummary(),
    subtotal: estimateState.subtotal,
    quoteId: estimateState.quoteId,
    notes: estimateState.notes,
    lines: estimateState.lines.map((line) => ({ ...line }))
  });

  await page.route('**/api/manager/estimates?pageSize=100', async (route) => {
    await route.fulfill({ json: { estimates: [toEstimateSummary()] } });
  });

  await page.route('**/api/manager/estimates/estimate-1', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      estimateState.title = payload.title;
      estimateState.status = payload.status;
      estimateState.projectId = payload.projectId || estimateState.projectId;
      estimateState.quoteId = payload.quoteId || '';
      estimateState.notes = payload.notes || '';
      await route.fulfill({ json: { estimate: toEstimateDetail() } });
      return;
    }

    await route.fulfill({ json: { estimate: toEstimateDetail() } });
  });

  await page.route('**/api/manager/estimates/estimate-1/lines', async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const quantity = Number(payload.quantity || 0);
      const hasLineTotalOverride = payload.lineTotalOverride !== null && payload.lineTotalOverride !== undefined;
      const unitCost = hasLineTotalOverride
        ? Number(payload.lineTotalOverride)
        : Number(payload.unitCost || 0) * quantity;

      estimateState.lines.push({
        id: `estimate-line-${lineCounter++}`,
        description: payload.description,
        lineType: payload.lineType,
        quantity,
        unit: payload.unit || '',
        lineTotal: unitCost,
        notes: payload.notes || ''
      });
      recomputeEstimateTotals();

      await route.fulfill({ json: { ok: true } });
    });
  });

  await page.goto('/manager-dashboard.html');
  await page.locator('#manager-estimates-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-estimates-section');

  const estimateCard = page.locator('#estimates-list .dashboard-item').first();
  await expect(estimateCard).toBeVisible();
  await estimateCard.getByRole('button', { name: 'Select' }).click();

  await page.locator('#estimate-update-form input[name="title"]').fill('Prestige Kitchen Estimate v2');
  await page.locator('#estimate-update-form select[name="status"]').selectOption('sent');
  await page.locator('#estimate-update-form textarea[name="notes"]').fill('Issued to client for review.');
  await page.getByRole('button', { name: 'Save estimate' }).click();

  await expect(page.locator('#estimate-update-status')).toContainText(/estimate saved/i);
  await expect(page.locator('#estimate-editor-title')).toContainText('Prestige Kitchen Estimate v2');
  await expect(page.locator('#estimates-list .dashboard-item').first()).toContainText(/sent/i);

  const estimateLineForm = page.locator('#estimate-line-form');
  await estimateLineForm.locator('select[name="lineType"]').selectOption('custom');
  await estimateLineForm.locator('input[name="description"]').fill('Bespoke extractor boxing');
  await estimateLineForm.locator('input[name="unit"]').fill('item');
  await estimateLineForm.locator('input[name="quantity"]').fill('2');
  await estimateLineForm.locator('input[name="unitCost"]').fill('350');
  await estimateLineForm.getByRole('button', { name: 'Add line' }).click();

  await expect(page.locator('#estimate-line-status')).toContainText(/estimate line added/i);
  await expect(page.locator('#estimate-lines-list')).toContainText('Bespoke extractor boxing');
  await expect(page.locator('#estimate-editor-total')).toContainText('15,500.00');
});

test('manager dashboard services and materials controls can update catalog items', async ({ page }) => {
  await mockManagerSession(page);

  const serviceState = {
    id: 'service-1',
    title: 'Bathrooms',
    slug: 'bathrooms',
    category: 'bathroom',
    displayOrder: 1,
    showOnWebsite: true,
    shortDescription: 'Marble-led bathroom design and build.'
  };

  const materialState = {
    id: 'material-1',
    name: 'Calacatta Slab',
    sku: 'MAR-001',
    category: 'tiles',
    stockQty: 6,
    minStockQty: 4,
    unitCost: 480,
    supplier: 'Stone House'
  };

  await page.route('**/api/manager/services?*', async (route) => {
    await route.fulfill({
      json: {
        services: [{ ...serviceState }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/materials?*', async (route) => {
    await route.fulfill({
      json: {
        materials: [{ ...materialState }],
        pagination: { page: 1, totalPages: 1, total: 1 }
      }
    });
  });

  await page.route('**/api/manager/services/service-1', async (route) => {
    await handleRouteMethod(route, 'PATCH', async () => {
      const payload = route.request().postDataJSON();
      serviceState.title = payload.title;
      serviceState.shortDescription = payload.shortDescription;
      serviceState.displayOrder = payload.displayOrder;
      serviceState.showOnWebsite = payload.showOnWebsite;
      await route.fulfill({ json: { service: { ...serviceState } } });
    });
  });

  await page.route('**/api/manager/materials/material-1', async (route) => {
    await handleRouteMethod(route, 'PATCH', async () => {
      const payload = route.request().postDataJSON();
      materialState.stockQty = payload.stockQty;
      materialState.minStockQty = payload.minStockQty;
      materialState.unitCost = payload.unitCost;
      materialState.supplier = payload.supplier;
      await route.fulfill({ json: { material: { ...materialState } } });
    });
  });

  await page.goto('/manager-dashboard.html');

  await page.getByRole('button', { name: 'Services' }).click();
  await page.locator('#manager-services-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-services-section');

  const serviceCard = page.locator('#services-list .dashboard-item').first();
  await expect(serviceCard).toBeVisible();
  await serviceCard.locator('input[type="text"]').first().fill('Bathrooms Premium');
  await serviceCard.getByRole('button', { name: 'Save' }).click();
  await expect(serviceCard.getByRole('heading', { name: 'Bathrooms Premium' })).toBeVisible();

  await page.getByRole('button', { name: 'Materials / Storage' }).click();
  await page.locator('#manager-materials-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-materials-section');

  const materialCard = page.locator('#materials-list .dashboard-item').first();
  await expect(materialCard).toBeVisible();
  await materialCard.locator('input[type="number"]').first().fill('2');
  await materialCard.getByRole('button', { name: 'Save' }).click();
  await expect(materialCard).toContainText(/stock 2\/4/i);
  await expect(materialCard).toContainText(/low stock/i);
});

test('manager dashboard clients and staff controls can load people sections and create staff', async ({ page }) => {
  await mockManagerSession(page);

  const clientsState = [
    { id: 'client-1', name: 'Marta Client', email: 'client@example.com', phone: '+44 7000 000 000' },
    { id: 'client-2', name: 'Olivia Reed', email: 'olivia@example.com', phone: '+44 7111 222 333' }
  ];
  let staffState = [
    { id: 'manager-1', name: 'Daniel Manager', email: 'manager@example.com', role: 'manager' }
  ];

  await page.route('**/api/manager/clients/search?*', async (route) => {
    await route.fulfill({ json: { clients: clientsState } });
  });

  await page.route('**/api/manager/staff/search?*', async (route) => {
    await route.fulfill({ json: { staff: staffState } });
  });

  await page.route('**/api/manager/staff', async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const created = {
        id: `staff-${staffState.length + 1}`,
        name: payload.name,
        email: payload.email,
        role: payload.role || 'employee'
      };
      staffState = [...staffState, created];
      await route.fulfill({ json: { staff: created } });
    });
  });

  await page.goto('/manager-dashboard.html');

  await page.locator('#manager-clients-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-clients-section');
  const clientCard = page.locator('#clients-list .dashboard-item').first();
  await expect(clientCard).toBeVisible();
  await expect(clientCard).toContainText('Marta Client');

  await page.locator('#manager-staff-section').scrollIntoViewIfNeeded();
  await expandDashboardSectionIfCollapsed(page, '#manager-staff-section');
  await expect(page.locator('#staff-list .dashboard-item').first()).toContainText('Daniel Manager');

  await page.locator('#staff-create-form input[name="name"]').fill('Leah Builder');
  await page.locator('#staff-create-form input[name="email"]').fill('leah@example.com');
  await page.locator('#staff-create-form input[name="password"]').fill('StrongPassword123!');
  await page.locator('#staff-create-form select[name="role"]').selectOption('employee');
  await page.getByRole('button', { name: 'Create staff member' }).click();

  await expect(page.locator('#staff-create-status')).toContainText(/staff member created/i);
  await expect(page.locator('#staff-list')).toContainText('Leah Builder');
  await expect(page.locator('#staff-list')).toContainText('employee');
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
    await handleRouteMethod(route, 'POST', async () => {
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
    await handleRouteMethod(route, 'POST', async () => {
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
        if (user) {
          addMemberIfMissing(members, {
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
    await handleRouteMethod(route, 'POST', async () => {
      const threadId = route.request().url().match(/threads\/([^/]+)\/members/)?.[1] || '';
      const payload = route.request().postDataJSON();
      const thread = groupThreads.find((item) => item.id === threadId);
      const user = clients.find((item) => item.id === payload.userId) || staff.find((item) => item.id === payload.userId);
      if (thread && user) {
        addMemberIfMissing(thread.members, {
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
  });

  await page.route('**/api/group/threads/*/members/*', async (route) => {
    await handleRouteMethod(route, 'DELETE', async () => {
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
  });

  await page.goto('/manager-dashboard.html');

  await page.locator('#manager-private-inbox').scrollIntoViewIfNeeded();
  await page.locator('#manager-direct-thread-form select[name="recipientType"]').selectOption('client');
  await page.locator('#manager-direct-thread-form input[name="recipientEmail"]').fill('client@example.com');
  await page.locator('#manager-direct-thread-form input[name="subject"]').fill('Kick-off thread');
  await page.locator('#manager-direct-thread-form textarea[name="body"]').fill('Let us confirm the next site visit.');
  await page.locator('#manager-direct-thread-form button[type="submit"]').click();

  await expect(page.locator('#manager-direct-thread-status')).toContainText(/private thread created/i);
  await expect(page.locator('#manager-direct-threads-list')).toContainText('Marta Client');
  await expect(page.locator('#manager-direct-messages-list')).toContainText('Let us confirm the next site visit.');

  await page.locator('#manager-project-chat').scrollIntoViewIfNeeded();
  await page.locator('#manager-group-thread-form input[name="name"]').fill('Kitchen delivery thread');
  await page.locator('#manager-group-thread-form select[name="projectId"]').selectOption('project-1');
  await page.locator('#manager-group-thread-form select[name="participantType"]').selectOption('staff');
  await page.locator('#manager-group-thread-form input[name="participantEmail"]').fill('leah@example.com');
  await expect(page.locator('#manager-group-create-participant-lookup-status')).toContainText('Leah Builder');
  await page.locator('#manager-group-thread-form input[name="participantEmail"]').press('Tab');
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
