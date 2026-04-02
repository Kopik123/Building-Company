const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|no description found/i;

const resolveColumnName = (tableDefinition, desiredColumnName) => {
  const columns = Object.keys(tableDefinition || {});
  const directMatch = columns.find((column) => column === desiredColumnName);
  if (directMatch) return directMatch;
  const normalized = String(desiredColumnName).toLowerCase();
  return columns.find((column) => String(column).toLowerCase() === normalized) || null;
};

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error && error.message ? error.message : '');
    if (tableDoesNotExistPattern.test(message)) {
      return false;
    }
    throw error;
  }
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const tableDefinition = await queryInterface.describeTable(tableName);
  const resolvedColumn = resolveColumnName(tableDefinition, columnName);
  if (resolvedColumn) {
    return;
  }
  await queryInterface.addColumn(tableName, columnName, definition);
};

const ensureTable = async (queryInterface, tableName, columns) => {
  if (!(await tableExists(queryInterface, tableName))) {
    await queryInterface.createTable(tableName, columns);
    return;
  }

  for (const [columnName, definition] of Object.entries(columns)) {
    // eslint-disable-next-line no-await-in-loop
    await addColumnIfMissing(queryInterface, tableName, columnName, definition);
  }
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields, options = {}) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    return;
  }

  const tableDefinition = await queryInterface.describeTable(tableName);
  const resolvedFields = fields.map((field) => resolveColumnName(tableDefinition, field)).filter(Boolean);
  if (resolvedFields.length !== fields.length) {
    const missingFields = fields.filter((field) => !resolveColumnName(tableDefinition, field));
    console.warn(`Skipping index "${indexName}" on ${tableName}. Missing columns: ${missingFields.join(', ')}`);
    return;
  }

  await queryInterface.addIndex(tableName, resolvedFields, { name: indexName, ...options });
};

const dropTableIfExists = async (queryInterface, tableName) => {
  if (await tableExists(queryInterface, tableName)) {
    await queryInterface.dropTable(tableName);
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await ensureTable(queryInterface, 'Users', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.ENUM('client', 'employee', 'manager', 'admin'), allowNull: false, defaultValue: 'client' },
      name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      companyName: { type: DataTypes.STRING, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lastLogin: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'Quotes', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      clientId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isGuest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      guestName: { type: DataTypes.STRING, allowNull: true },
      guestEmail: { type: DataTypes.STRING, allowNull: true },
      guestPhone: { type: DataTypes.STRING, allowNull: true },
      contactMethod: { type: DataTypes.ENUM('email', 'phone', 'both'), allowNull: true },
      publicToken: { type: DataTypes.STRING, allowNull: true, unique: true },
      projectType: {
        type: DataTypes.ENUM(
          'bathroom',
          'kitchen',
          'interior',
          'tiling',
          'extension',
          'joinery',
          'rendering',
          'decorating',
          'other'
        ),
        allowNull: false
      },
      location: { type: DataTypes.STRING, allowNull: false },
      postcode: { type: DataTypes.STRING, allowNull: true },
      budgetRange: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: false },
      contactEmail: { type: DataTypes.STRING, allowNull: true },
      contactPhone: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'in_progress', 'responded', 'closed'), allowNull: false, defaultValue: 'pending' },
      assignedManagerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      priority: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'medium' },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'QuoteMessages', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      messageText: { type: DataTypes.TEXT, allowNull: false },
      attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'InboxThreads', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      participantAId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participantBId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject: { type: DataTypes.STRING, allowNull: false },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'InboxMessages', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      threadId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'InboxThreads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'QuoteClaimTokens', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      token: { type: DataTypes.STRING, allowNull: false, unique: true },
      channel: { type: DataTypes.ENUM('email', 'phone'), allowNull: false },
      target: { type: DataTypes.STRING, allowNull: false },
      codeHash: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      usedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'Notifications', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      data: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'GroupThreads', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'GroupMembers', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      groupThreadId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'GroupThreads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      role: { type: DataTypes.ENUM('admin', 'member'), allowNull: false, defaultValue: 'member' },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'GroupMessages', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      groupThreadId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'GroupThreads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      body: { type: DataTypes.TEXT, allowNull: false },
      attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'Projects', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      clientId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assignedManagerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      location: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('planning', 'in_progress', 'completed', 'on_hold'), allowNull: false, defaultValue: 'planning' },
      budgetEstimate: { type: DataTypes.STRING, allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      showInGallery: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      galleryOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'ProjectMedia', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mediaType: { type: DataTypes.ENUM('image', 'document'), allowNull: false },
      url: { type: DataTypes.STRING, allowNull: false },
      storagePath: { type: DataTypes.STRING, allowNull: false },
      filename: { type: DataTypes.STRING, allowNull: false },
      mimeType: { type: DataTypes.STRING, allowNull: true },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: true },
      caption: { type: DataTypes.STRING, allowNull: true },
      showInGallery: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      galleryOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isCover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'ServiceOfferings', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      title: { type: DataTypes.STRING, allowNull: false },
      shortDescription: { type: DataTypes.STRING, allowNull: true },
      fullDescription: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.ENUM('bathroom', 'kitchen', 'interior', 'outdoor', 'other'), allowNull: false, defaultValue: 'other' },
      basePriceFrom: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      heroImageUrl: { type: DataTypes.STRING, allowNull: true },
      isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      showOnWebsite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'Materials', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      sku: { type: DataTypes.STRING, allowNull: true, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.ENUM('tiles', 'plumbing', 'electrical', 'joinery', 'paint', 'hardware', 'other'), allowNull: false, defaultValue: 'other' },
      unit: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pcs' },
      stockQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      minStockQty: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      supplier: { type: DataTypes.STRING, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await ensureTable(queryInterface, 'QuoteAssignments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      quoteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Quotes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      managerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false }
    });

    await addIndexIfMissing(queryInterface, 'Notifications', 'notifications_user_read_created_idx', ['userId', 'isRead', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Notifications', 'notifications_user_created_idx', ['userId', 'createdAt']);

    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_status_created_idx', ['status', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_priority_created_idx', ['priority', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_project_type_created_idx', ['projectType', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_assigned_manager_idx', ['assignedManagerId']);

    await addIndexIfMissing(queryInterface, 'Users', 'users_role_active_idx', ['role', 'isActive']);

    await addIndexIfMissing(queryInterface, 'InboxThreads', 'inbox_threads_participant_a_updated_idx', ['participantAId', 'updatedAt']);
    await addIndexIfMissing(queryInterface, 'InboxThreads', 'inbox_threads_participant_b_updated_idx', ['participantBId', 'updatedAt']);

    await addIndexIfMissing(queryInterface, 'InboxMessages', 'inbox_messages_thread_created_idx', ['threadId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'InboxMessages', 'inbox_messages_recipient_read_idx', ['recipientId', 'isRead']);

    await addIndexIfMissing(queryInterface, 'GroupMembers', 'group_members_user_thread_idx', ['userId', 'groupThreadId']);
    await addIndexIfMissing(queryInterface, 'GroupMembers', 'group_members_thread_user_idx', ['groupThreadId', 'userId']);

    await addIndexIfMissing(queryInterface, 'GroupMessages', 'group_messages_thread_created_idx', ['groupThreadId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'GroupThreads', 'group_threads_quote_idx', ['quoteId']);

    await addIndexIfMissing(queryInterface, 'QuoteClaimTokens', 'quote_claim_tokens_quote_used_expires_idx', ['quoteId', 'usedAt', 'expiresAt']);

    await addIndexIfMissing(queryInterface, 'Projects', 'projects_gallery_visible_order_idx', ['showInGallery', 'galleryOrder']);
    await addIndexIfMissing(queryInterface, 'Projects', 'projects_status_created_idx', ['status', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Projects', 'projects_client_status_idx', ['clientId', 'status']);
    await addIndexIfMissing(queryInterface, 'Projects', 'projects_manager_status_idx', ['assignedManagerId', 'status']);

    await addIndexIfMissing(queryInterface, 'ProjectMedia', 'project_media_project_type_idx', ['projectId', 'mediaType']);
    await addIndexIfMissing(queryInterface, 'ProjectMedia', 'project_media_gallery_idx', ['projectId', 'showInGallery', 'galleryOrder']);

    await addIndexIfMissing(queryInterface, 'ServiceOfferings', 'service_offerings_public_order_idx', ['showOnWebsite', 'displayOrder']);
    await addIndexIfMissing(queryInterface, 'ServiceOfferings', 'service_offerings_category_active_idx', ['category', 'isActive']);

    await addIndexIfMissing(queryInterface, 'Materials', 'materials_category_active_idx', ['category', 'isActive']);
    await addIndexIfMissing(queryInterface, 'Materials', 'materials_stock_min_idx', ['stockQty', 'minStockQty']);
  },

  down: async (queryInterface) => {
    await dropTableIfExists(queryInterface, 'QuoteAssignments');
    await dropTableIfExists(queryInterface, 'Materials');
    await dropTableIfExists(queryInterface, 'ServiceOfferings');
    await dropTableIfExists(queryInterface, 'ProjectMedia');
    await dropTableIfExists(queryInterface, 'Projects');
    await dropTableIfExists(queryInterface, 'GroupMessages');
    await dropTableIfExists(queryInterface, 'GroupMembers');
    await dropTableIfExists(queryInterface, 'GroupThreads');
    await dropTableIfExists(queryInterface, 'Notifications');
    await dropTableIfExists(queryInterface, 'QuoteClaimTokens');
    await dropTableIfExists(queryInterface, 'InboxMessages');
    await dropTableIfExists(queryInterface, 'InboxThreads');
    await dropTableIfExists(queryInterface, 'QuoteMessages');
    await dropTableIfExists(queryInterface, 'Quotes');
    await dropTableIfExists(queryInterface, 'Users');
  }
};
