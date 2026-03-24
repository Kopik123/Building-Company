const path = require('node:path');
const { test, expect } = require('@playwright/test');

const messageAttachmentFixture = path.join(__dirname, '..', 'fixtures', 'message-attachment.txt');

const fulfillJson = (route, payload, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  });

const handleRouteMethod = async (route, method, onMatch) => {
  if (route.request().method() === method) {
    await onMatch();
    return;
  }
  await route.fallback();
};

const seedV2Session = async (page, user) => {
  await page.addInitScript(({ nextUser }) => {
    localStorage.setItem('ll_v2_access_token', 'test-access-token');
    localStorage.setItem('ll_v2_refresh_token', 'test-refresh-token');
    localStorage.setItem('ll_v2_seed_user', JSON.stringify(nextUser));
  }, { nextUser: user });
};

const mockWebV2Auth = async (page, user) => {
  await seedV2Session(page, user);
  await page.route('**/api/v2/auth/me', async (route) => {
    await fulfillJson(route, { data: { user } });
  });
};

test('web-v2 private inbox clears unread state and supports attachment-first thread creation', async ({ page }) => {
  const managerUser = {
    id: 'manager-1',
    name: 'Daniel Manager',
    email: 'manager@example.com',
    role: 'manager'
  };
  const clients = [
    { id: 'client-1', name: 'Marta Client', email: 'client@example.com', role: 'client', phone: '+44 7000 000 000' }
  ];
  const staff = [
    managerUser,
    { id: 'employee-2', name: 'Leah Builder', email: 'leah@example.com', role: 'employee' }
  ];
  const directThreads = [
    {
      id: 'direct-thread-1',
      subject: 'Lighting allowance',
      participantAId: 'manager-1',
      participantBId: 'client-1',
      participantCount: 2,
      latestMessagePreview: 'Client approved the revised lighting allowance.',
      latestMessageAt: '2026-03-23T10:15:00Z',
      updatedAt: '2026-03-23T10:15:00Z',
      unreadCount: 2,
      counterparty: clients[0],
      participantA: managerUser,
      participantB: clients[0]
    }
  ];
  const directMessagesByThreadId = {
    'direct-thread-1': [
      {
        id: 'direct-message-1',
        body: 'Client approved the revised lighting allowance.',
        createdAt: '2026-03-23T10:15:00Z',
        sender: clients[0],
        attachments: []
      }
    ]
  };
  let nextDirectThreadId = 2;

  await mockWebV2Auth(page, managerUser);

  await page.route(/\/api\/v2\/crm\/clients(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { clients } });
  });
  await page.route(/\/api\/v2\/crm\/staff(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { staff } });
  });

  await page.route(/\/api\/v2\/messages\/direct-threads(?:\?.*)?$/, async (route) => {
    await handleRouteMethod(route, 'GET', async () => {
      await fulfillJson(route, { data: { threads: directThreads } });
    });
  });

  await page.route(/\/api\/v2\/messages\/direct-threads$/, async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const recipient = [...clients, ...staff].find((person) => person.id === payload.recipientUserId);
      const createdThread = {
        id: `direct-thread-${nextDirectThreadId++}`,
        subject: payload.subject,
        participantAId: managerUser.id,
        participantBId: recipient.id,
        participantCount: 2,
        latestMessagePreview: null,
        latestMessageAt: '2026-03-23T10:30:00Z',
        updatedAt: '2026-03-23T10:30:00Z',
        unreadCount: 0,
        counterparty: recipient,
        participantA: managerUser,
        participantB: recipient
      };
      directThreads.unshift(createdThread);
      directMessagesByThreadId[createdThread.id] = [];

      await fulfillJson(route, {
        data: {
          thread: createdThread,
          message: null
        }
      }, 201);
    });
  });

  await page.route('**/api/v2/messages/direct-threads/direct-thread-1/read', async (route) => {
    directThreads[0].unreadCount = 0;
    await fulfillJson(route, { data: { markedReadCount: 2 } });
  });

  await page.route(/\/api\/v2\/messages\/direct-threads\/[^/]+\/messages(?:\?.*)?$/, async (route) => {
    const threadId = route.request().url().match(/direct-threads\/([^/]+)\/messages/)?.[1] || '';
    await fulfillJson(route, {
      data: {
        thread: directThreads.find((thread) => thread.id === threadId) || null,
        messages: directMessagesByThreadId[threadId] || []
      }
    });
  });

  await page.route(/\/api\/v2\/messages\/direct-threads\/[^/]+\/messages\/upload$/, async (route) => {
    const threadId = route.request().url().match(/direct-threads\/([^/]+)\/messages\/upload/)?.[1] || '';
    const thread = directThreads.find((item) => item.id === threadId);
    const message = {
      id: `direct-upload-${Date.now()}`,
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-23T10:31:00Z',
      sender: managerUser,
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    };
    directMessagesByThreadId[threadId] = [...(directMessagesByThreadId[threadId] || []), message];
    if (thread) {
      thread.latestMessagePreview = message.body;
      thread.latestMessageAt = message.createdAt;
      thread.updatedAt = message.createdAt;
    }
    await fulfillJson(route, { data: { message } }, 201);
  });

  await page.goto('/app-v2/private-inbox');

  await expect(page.getByRole('heading', { name: 'Direct conversation routes' })).toBeVisible();
  await expect(page.locator('.thread-row').first()).toContainText('Lighting allowance');
  await expect(page.locator('.message-list')).toContainText('Client approved the revised lighting allowance.');
  await expect(page.locator('.thread-row').first()).not.toContainText('2 unread');

  await page.getByRole('button', { name: 'New thread' }).evaluate((node) => node.click());
  await expect(page.getByLabel('Recipient email')).toBeVisible();
  await page.getByLabel('Recipient email').fill('client@example.com');
  await page.getByLabel('Subject').fill('Stone samples follow-up');
  await page.locator('.composer input[type="file"]').setInputFiles(messageAttachmentFixture);
  await page.getByRole('button', { name: 'Open private route' }).click();

  await expect(page.locator('.thread-list')).toContainText('Stone samples follow-up');
  await expect(page.locator('.message-list')).toContainText('message-attachment.txt');
  await expect(page.locator('.thread-row').first()).toContainText('Sent 1 file(s)');
});

test('web-v2 project chat route loads messages and keeps attachment sends in sync with the thread preview', async ({ page }) => {
  const managerUser = {
    id: 'manager-1',
    name: 'Daniel Manager',
    email: 'manager@example.com',
    role: 'manager'
  };
  const threadState = [
    {
      id: 'group-thread-1',
      name: 'Prestige Kitchen',
      latestMessagePreview: 'Stone samples booked for Friday.',
      latestMessageAt: '2026-03-23T11:05:00Z',
      updatedAt: '2026-03-23T11:05:00Z',
      messageCount: 1,
      memberCount: 3,
      currentUserMembershipRole: 'admin',
      latestMessageSender: managerUser,
      project: {
        id: 'project-1',
        title: 'Prestige Kitchen',
        location: 'Stockport',
        status: 'in_progress'
      }
    }
  ];
  const messagesByThreadId = {
    'group-thread-1': [
      {
        id: 'group-message-1',
        body: 'Stone samples booked for Friday.',
        createdAt: '2026-03-23T11:05:00Z',
        sender: managerUser,
        attachments: []
      }
    ]
  };

  await mockWebV2Auth(page, managerUser);

  await page.route(/\/api\/v2\/messages\/threads(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { threads: threadState } });
  });

  await page.route(/\/api\/v2\/messages\/threads\/[^/]+\/messages(?:\?.*)?$/, async (route) => {
    const threadId = route.request().url().match(/threads\/([^/]+)\/messages/)?.[1] || '';
    await fulfillJson(route, {
      data: {
        thread: threadState.find((thread) => thread.id === threadId) || null,
        messages: messagesByThreadId[threadId] || []
      }
    });
  });

  await page.route(/\/api\/v2\/messages\/threads\/[^/]+\/messages\/upload$/, async (route) => {
    const threadId = route.request().url().match(/threads\/([^/]+)\/messages\/upload/)?.[1] || '';
    const thread = threadState.find((item) => item.id === threadId);
    const message = {
      id: 'group-message-2',
      body: 'Sent 1 file(s)',
      createdAt: '2026-03-23T11:10:00Z',
      sender: managerUser,
      attachments: [{
        name: 'message-attachment.txt',
        url: '/uploads/message-attachment.txt',
        size: 48,
        mimeType: 'text/plain'
      }]
    };
    messagesByThreadId[threadId] = [...(messagesByThreadId[threadId] || []), message];
    if (thread) {
      thread.latestMessagePreview = message.body;
      thread.latestMessageAt = message.createdAt;
      thread.updatedAt = message.createdAt;
      thread.messageCount = (thread.messageCount || 0) + 1;
    }
    await fulfillJson(route, { data: { message } }, 201);
  });

  await page.goto('/app-v2/messages');

  await expect(page.getByRole('heading', { name: 'Threaded project communication' })).toBeVisible();
  await expect(page.locator('.thread-row').first()).toContainText('Prestige Kitchen');
  await expect(page.locator('.message-list')).toContainText('Stone samples booked for Friday.');

  await page.locator('.composer input[type="file"]').setInputFiles(messageAttachmentFixture);
  await page.getByRole('button', { name: 'Send update' }).click();

  await expect(page.locator('.message-list')).toContainText('message-attachment.txt');
  await expect(page.locator('.thread-row').first()).toContainText('Sent 1 file(s)');
  await expect(page.locator('.thread-row').first()).toContainText('2 messages');
});

test('web-v2 manager operations surfaces can create projects, update quotes, create staff and add inventory rows', async ({ page }) => {
  const managerUser = {
    id: 'manager-1',
    name: 'Daniel Manager',
    email: 'manager@example.com',
    role: 'manager'
  };
  const clients = [
    { id: 'client-1', name: 'Marta Client', email: 'client@example.com', role: 'client', phone: '+44 7000 000 000' }
  ];
  const staff = [managerUser];
  const projects = [
    {
      id: 'project-1',
      title: 'Prestige Kitchen',
      location: 'Stockport',
      status: 'in_progress',
      clientId: 'client-1',
      assignedManagerId: 'manager-1',
      description: 'Stone island and oak storage.',
      imageCount: 2,
      documentCount: 1,
      showInGallery: true,
      galleryOrder: 1,
      isActive: true,
      client: clients[0],
      assignedManager: managerUser
    }
  ];
  const quotes = [
    {
      id: 'quote-1',
      projectType: 'kitchen',
      location: 'Manchester',
      status: 'pending',
      workflowStatus: 'submitted',
      priority: 'high',
      guestName: 'Olivia Reed',
      guestEmail: 'olivia@example.com',
      isGuest: true,
      estimateCount: 0,
      canConvertToProject: false,
      createdAt: '2026-03-23T09:00:00Z',
      updatedAt: '2026-03-23T09:00:00Z',
      assignedManager: managerUser,
      client: null
    }
  ];
  const quoteEventsById = {
    'quote-1': []
  };
  const quoteEstimatesById = {
    'quote-1': []
  };
  const enrichQuote = (quote) => ({
    sourceChannel: 'manager_created_guest',
    currentEstimateId: null,
    convertedProjectId: null,
    submittedAt: quote.createdAt || '2026-03-23T09:00:00Z',
    assignedAt: quote.assignedManagerId ? (quote.updatedAt || quote.createdAt || '2026-03-23T09:00:00Z') : null,
    convertedAt: null,
    closedAt: null,
    lossReason: null,
    estimateCount: Array.isArray(quoteEstimatesById[quote.id]) ? quoteEstimatesById[quote.id].length : 0,
    canConvertToProject: false,
    latestEstimate: Array.isArray(quoteEstimatesById[quote.id]) ? quoteEstimatesById[quote.id][0] || null : null,
    ...quote
  });
  const services = [
    {
      id: 'service-1',
      title: 'Bathrooms',
      slug: 'bathrooms',
      category: 'bathroom',
      shortDescription: 'Marble-led bathroom design and build.',
      displayOrder: 1,
      showOnWebsite: true,
      isFeatured: false,
      isActive: true
    }
  ];
  const materials = [
    {
      id: 'material-1',
      name: 'Calacatta Slab',
      sku: 'MAR-001',
      category: 'tiles',
      unit: 'pcs',
      stockQty: 6,
      minStockQty: 4,
      unitCost: 480,
      supplier: 'Stone House',
      isActive: true
    }
  ];
  let projectCounter = 2;
  let quoteCounter = 2;
  let serviceCounter = 2;
  let materialCounter = 2;
  let staffCounter = 2;

  await mockWebV2Auth(page, managerUser);

  await page.route(/\/api\/v2\/projects(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { projects } });
  });
  await page.route(/\/api\/v2\/projects$/, async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const createdProject = {
        id: `project-${projectCounter++}`,
        ...payload,
        imageCount: 0,
        documentCount: 0,
        client: clients.find((client) => client.id === payload.clientId) || null,
        assignedManager: staff.find((member) => member.id === payload.assignedManagerId) || null
      };
      projects.unshift(createdProject);
      await fulfillJson(route, { data: { project: createdProject } }, 201);
    });
  });
  await page.route(/\/api\/v2\/projects\/[^/]+$/, async (route) => {
    await handleRouteMethod(route, 'GET', async () => {
      const projectId = route.request().url().match(/projects\/([^/?]+)/)?.[1] || '';
      const project = projects.find((item) => item.id === projectId) || null;
      await fulfillJson(route, { data: { project } });
    });
  });

  await page.route(/\/api\/v2\/quotes(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, { data: { quotes: quotes.map(enrichQuote) } });
      return;
    }
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      const createdQuote = {
        id: `quote-${quoteCounter++}`,
        ...payload,
        status: payload.status || 'pending',
        workflowStatus: 'submitted',
        isGuest: !payload.clientId,
        estimateCount: 0,
        canConvertToProject: false,
        createdAt: '2026-03-23T10:20:00Z',
        updatedAt: '2026-03-23T10:20:00Z',
        client: clients.find((client) => client.id === payload.clientId) || null,
        assignedManager: staff.find((member) => member.id === payload.assignedManagerId) || managerUser
      };
      quotes.unshift(createdQuote);
      quoteEventsById[createdQuote.id] = [];
      quoteEstimatesById[createdQuote.id] = [];
      await fulfillJson(route, { data: { quote: enrichQuote(createdQuote) } }, 201);
      return;
    }
    await route.fallback();
  });
  await page.route(/\/api\/v2\/quotes\/[^/]+$/, async (route) => {
    if (route.request().method() === 'GET') {
      const quoteId = route.request().url().match(/quotes\/([^/?]+)/)?.[1] || '';
      const quote = quotes.find((item) => item.id === quoteId) || null;
      await fulfillJson(route, { data: { quote: quote ? enrichQuote(quote) : null } });
      return;
    }
    if (route.request().method() === 'PATCH') {
      const quoteId = route.request().url().match(/quotes\/([^/?]+)/)?.[1] || '';
      const payload = route.request().postDataJSON();
      const quote = quotes.find((item) => item.id === quoteId);
      Object.assign(quote, payload, {
        updatedAt: '2026-03-23T10:25:00Z'
      });
      if (payload.status === 'responded') {
        quote.workflowStatus = 'estimate_sent';
      }
      await fulfillJson(route, { data: { quote: enrichQuote(quote) } });
      return;
    }
    await route.fallback();
  });
  await page.route(/\/api\/v2\/quotes\/[^/]+\/timeline$/, async (route) => {
    const quoteId = route.request().url().match(/quotes\/([^/]+)\/timeline/)?.[1] || '';
    await fulfillJson(route, { data: { events: quoteEventsById[quoteId] || [] } });
  });
  await page.route(/\/api\/v2\/quotes\/[^/]+\/estimates$/, async (route) => {
    const quoteId = route.request().url().match(/quotes\/([^/]+)\/estimates/)?.[1] || '';
    await fulfillJson(route, { data: { estimates: quoteEstimatesById[quoteId] || [] } });
  });

  await page.route(/\/api\/v2\/crm\/clients(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { clients } });
  });
  await page.route(/\/api\/v2\/crm\/staff(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { staff } });
  });
  await page.route(/\/api\/v2\/crm\/staff$/, async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const createdStaff = {
        id: `staff-${staffCounter++}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        phone: payload.phone || null,
        isActive: true
      };
      staff.push(createdStaff);
      await fulfillJson(route, { data: { staff: createdStaff } }, 201);
    });
  });
  await page.route(/\/api\/v2\/crm\/clients\/[^/]+$/, async (route) => {
    await handleRouteMethod(route, 'PATCH', async () => {
      const clientId = route.request().url().match(/clients\/([^/?]+)/)?.[1] || '';
      const payload = route.request().postDataJSON();
      const client = clients.find((item) => item.id === clientId);
      Object.assign(client, payload);
      await fulfillJson(route, { data: { client } });
    });
  });
  await page.route(/\/api\/v2\/crm\/staff\/[^/]+$/, async (route) => {
    await handleRouteMethod(route, 'PATCH', async () => {
      const staffId = route.request().url().match(/staff\/([^/?]+)/)?.[1] || '';
      const payload = route.request().postDataJSON();
      const member = staff.find((item) => item.id === staffId);
      Object.assign(member, payload);
      await fulfillJson(route, { data: { staff: member } });
    });
  });

  await page.route(/\/api\/v2\/inventory\/services(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { services } });
  });
  await page.route(/\/api\/v2\/inventory\/services$/, async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const createdService = {
        id: `service-${serviceCounter++}`,
        ...payload
      };
      services.push(createdService);
      await fulfillJson(route, { data: { service: createdService } }, 201);
    });
  });

  await page.route(/\/api\/v2\/inventory\/materials(?:\?.*)?$/, async (route) => {
    await fulfillJson(route, { data: { materials } });
  });
  await page.route(/\/api\/v2\/inventory\/materials$/, async (route) => {
    await handleRouteMethod(route, 'POST', async () => {
      const payload = route.request().postDataJSON();
      const createdMaterial = {
        id: `material-${materialCounter++}`,
        ...payload
      };
      materials.push(createdMaterial);
      await fulfillJson(route, { data: { material: createdMaterial } }, 201);
    });
  });

  await page.goto('/app-v2/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Title').fill('Gallery Penthouse Fit-out');
  await page.getByLabel('Client').selectOption('client-1');
  await page.getByLabel('Assigned manager').selectOption('manager-1');
  await page.getByLabel('Location').fill('Manchester');
  await page.getByLabel('Description').fill('Premium shell-and-core finishing package.');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.stack-list')).toContainText('Gallery Penthouse Fit-out');

  await page.goto('/app-v2/quotes');
  const quoteBoardList = page.locator('.grid-two > .surface').first().locator('.stack-list');
  await page.getByRole('button', { name: 'New quote' }).evaluate((node) => node.click());
  await page.getByLabel('Project type').selectOption('bathroom');
  await page.getByLabel('Location').fill('Leeds');
  await page.getByLabel('Guest email').fill('newlead@example.com');
  await page.getByLabel('Description').fill('Guest-led marble bathroom renovation scope.');
  await page.getByRole('button', { name: 'Create quote' }).click();
  await expect(quoteBoardList).toContainText('Leeds');
  await page.getByLabel('Quote status').selectOption('responded');
  await page.getByRole('button', { name: 'Save quote' }).click();
  await expect(quoteBoardList).toContainText('Estimate Sent');

  await page.goto('/app-v2/crm');
  await page.getByLabel('Create staff name').fill('Leah Builder');
  await page.getByLabel('Create staff email').fill('leah@example.com');
  await page.getByLabel('Temporary password').fill('StrongPassword123!');
  await page.getByLabel('Create staff role').selectOption('employee');
  await page.getByRole('button', { name: 'Create staff member' }).click();
  await expect(page.locator('.grid-two .stack-list').nth(1)).toContainText('Leah Builder');
  await page.getByLabel('Client name').fill('Marta Client Updated');
  await page.getByRole('button', { name: 'Save client' }).click();
  await expect(page.locator('.grid-two .stack-list').first()).toContainText('Marta Client Updated');
  await page.getByLabel('Update staff name').fill('Daniel Manager Updated');
  await page.getByRole('button', { name: 'Save staff record' }).click();
  await expect(page.locator('.grid-two .stack-list').nth(1)).toContainText('Daniel Manager Updated');

  await page.goto('/app-v2/inventory');
  await page.getByRole('button', { name: 'New service' }).click();
  await page.getByLabel('Title').fill('Exterior Stone Detailing');
  await page.getByLabel('Slug').fill('exterior-stone-detailing');
  await page.getByRole('button', { name: 'Create service' }).click();
  await expect(page.locator('.stack-list').first()).toContainText('Exterior Stone Detailing');

  await page.getByRole('button', { name: 'New material' }).click();
  await page.getByLabel('Name').fill('Brushed brass trim');
  await page.getByLabel('SKU').fill('BRASS-TRIM');
  await page.getByRole('button', { name: 'Create material' }).click();
  await expect(page.locator('.stack-list').nth(1)).toContainText('Brushed brass trim');
});

test('web-v2 client quotes surface can accept an estimate and submit a fresh quote request', async ({ page }) => {
  const clientUser = {
    id: 'client-1',
    name: 'Marta Client',
    email: 'client@example.com',
    role: 'client',
    phone: '+44 7000 000 000'
  };
  const managerUser = {
    id: 'manager-1',
    name: 'Daniel Manager',
    email: 'manager@example.com',
    role: 'manager'
  };
  const quoteEventsById = {
    'quote-1': [
      {
        id: 'event-1',
        quoteId: 'quote-1',
        actorUserId: 'manager-1',
        eventType: 'estimate_sent',
        visibility: 'client',
        message: 'Estimate v1 sent to client.',
        createdAt: '2026-03-23T10:00:00Z',
        actor: managerUser,
        data: { estimateId: 'estimate-1' }
      }
    ]
  };
  const quoteEstimatesById = {
    'quote-1': [
      {
        id: 'estimate-1',
        quoteId: 'quote-1',
        title: 'Bathroom Offer',
        status: 'sent',
        decisionStatus: 'pending',
        versionNumber: 1,
        isCurrentVersion: true,
        total: 12500,
        subtotal: 12500,
        clientMessage: 'Please review the commercial offer.',
        createdAt: '2026-03-23T10:00:00Z',
        updatedAt: '2026-03-23T10:00:00Z',
        creator: managerUser
      }
    ]
  };
  const quotes = [
    {
      id: 'quote-1',
      projectType: 'bathroom',
      location: 'Manchester',
      status: 'responded',
      workflowStatus: 'estimate_sent',
      priority: 'high',
      description: 'Premium bathroom redesign with brass detailing.',
      isGuest: false,
      clientId: 'client-1',
      assignedManagerId: 'manager-1',
      sourceChannel: 'client_portal',
      currentEstimateId: 'estimate-1',
      estimateCount: 1,
      canConvertToProject: false,
      createdAt: '2026-03-23T09:30:00Z',
      updatedAt: '2026-03-23T10:00:00Z',
      client: clientUser,
      assignedManager: managerUser
    }
  ];
  let quoteCounter = 2;

  const enrichQuote = (quote) => ({
    submittedAt: quote.createdAt || '2026-03-23T09:30:00Z',
    assignedAt: quote.assignedManagerId ? (quote.updatedAt || quote.createdAt || '2026-03-23T09:30:00Z') : null,
    convertedAt: null,
    closedAt: null,
    lossReason: null,
    estimateCount: (quoteEstimatesById[quote.id] || []).length,
    latestEstimate: (quoteEstimatesById[quote.id] || [])[0] || null,
    ...quote
  });

  await mockWebV2Auth(page, clientUser);

  await page.route(/\/api\/v2\/quotes(?:\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, { data: { quotes: quotes.map(enrichQuote) } });
      return;
    }
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      const createdQuote = {
        id: `quote-${quoteCounter++}`,
        ...payload,
        status: 'pending',
        workflowStatus: 'submitted',
        isGuest: false,
        clientId: clientUser.id,
        assignedManagerId: null,
        sourceChannel: 'client_portal',
        currentEstimateId: null,
        estimateCount: 0,
        canConvertToProject: false,
        createdAt: '2026-03-23T11:00:00Z',
        updatedAt: '2026-03-23T11:00:00Z',
        client: clientUser,
        assignedManager: null
      };
      quotes.unshift(createdQuote);
      quoteEventsById[createdQuote.id] = [];
      quoteEstimatesById[createdQuote.id] = [];
      await fulfillJson(route, { data: { quote: enrichQuote(createdQuote) } }, 201);
      return;
    }
    await route.fallback();
  });

  await page.route(/\/api\/v2\/quotes\/estimates\/[^/]+\/respond$/, async (route) => {
    const estimateId = route.request().url().match(/quotes\/estimates\/([^/]+)\/respond/)?.[1] || '';
    const payload = route.request().postDataJSON();
    const quote = quotes.find((item) => item.currentEstimateId === estimateId);
    const estimate = (quoteEstimatesById[quote?.id] || []).find((item) => item.id === estimateId);
    estimate.decisionStatus = payload.decision;
    estimate.status = payload.decision === 'accepted' ? 'approved' : estimate.status;
    estimate.clientMessage = payload.note || null;
    estimate.updatedAt = '2026-03-23T11:05:00Z';
    quote.workflowStatus = payload.decision === 'accepted' ? 'approved_ready_for_project' : 'estimate_in_progress';
    quote.status = payload.decision === 'accepted' ? 'responded' : quote.status;
    quote.updatedAt = '2026-03-23T11:05:00Z';
    quoteEventsById[quote.id] = [
      ...(quoteEventsById[quote.id] || []),
      {
        id: `event-${quoteEventsById[quote.id].length + 1}`,
        quoteId: quote.id,
        actorUserId: clientUser.id,
        eventType: `estimate_${payload.decision}`,
        visibility: 'client',
        message: `Client ${String(payload.decision).replaceAll('_', ' ')} the estimate.`,
        createdAt: '2026-03-23T11:05:00Z',
        actor: clientUser,
        data: { estimateId }
      }
    ];
    await fulfillJson(route, {
      data: {
        quote: enrichQuote(quote),
        estimate
      }
    });
  });

  await page.route(/\/api\/v2\/quotes\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const quoteId = route.request().url().match(/quotes\/([^/?]+)/)?.[1] || '';
    const quote = quotes.find((item) => item.id === quoteId) || null;
    await fulfillJson(route, { data: { quote: quote ? enrichQuote(quote) : null } });
  });
  await page.route(/\/api\/v2\/quotes\/[^/]+\/timeline$/, async (route) => {
    const quoteId = route.request().url().match(/quotes\/([^/]+)\/timeline/)?.[1] || '';
    await fulfillJson(route, { data: { events: quoteEventsById[quoteId] || [] } });
  });
  await page.route(/\/api\/v2\/quotes\/[^/]+\/estimates$/, async (route) => {
    const quoteId = route.request().url().match(/quotes\/([^/]+)\/estimates/)?.[1] || '';
    await fulfillJson(route, { data: { estimates: quoteEstimatesById[quoteId] || [] } });
  });

  await page.goto('/app-v2/quotes');

  const quoteBoardList = page.locator('.grid-two > .surface').first().locator('.stack-list');
  await expect(page.getByRole('heading', { name: 'Quote board' })).toBeVisible();
  await expect(quoteBoardList).toContainText('Manchester');
  await page.getByLabel('Response note').fill('Please lock the March installation slot.');
  await page.getByRole('button', { name: 'Accept estimate' }).click();
  await expect(quoteBoardList).toContainText('Approved Ready For Project');

  await page.getByRole('button', { name: 'New quote' }).click();
  await page.getByLabel('Project type').selectOption('kitchen');
  await page.getByLabel('Location').fill('Leeds');
  await page.getByLabel('Contact phone').fill('+44 7000 111 222');
  await page.getByLabel('Description').fill('Client portal request for a new kitchen renovation.');
  await page.getByRole('button', { name: 'Create quote' }).click();
  await expect(quoteBoardList).toContainText('Leeds');
});
