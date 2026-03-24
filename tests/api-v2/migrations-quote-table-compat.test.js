const assert = require('node:assert/strict');
const test = require('node:test');

const baselineHardening = require('../../migrations/202603080001-production-baseline-hardening.js');
const sessionDeviceHardening = require('../../migrations/202603080002-v2-session-device-and-email-hardening.js');
const performanceSearch = require('../../migrations/202603090000-performance-search-trgm-indexes.js');
const quoteWorkflowAndEvents = require('../../migrations/202603240001-quote-workflow-and-events.js');
const relaxQuotesClientIdNullability = require('../../migrations/202603240002-relax-quotes-clientid-nullability.js');
const forceDropQuotesClientIdNotNull = require('../../migrations/202603240003-force-drop-quotes-clientid-not-null.js');
const quoteAttachmentsMigration = require('../../migrations/202603240004-quote-attachments.js');

const createQueryInterfaceStub = (tables) => {
  const queries = [];
  const addedIndexes = [];

  return {
    queries,
    addedIndexes,
    queryInterface: {
      queryGenerator: {
        quoteTable: (tableName) => `"${tableName}"`,
        quoteIdentifier: (value) => `"${value}"`
      },
      quoteIdentifier: (value) => `"${value}"`,
      sequelize: {
        async query(sql) {
          queries.push(sql);
        }
      },
      async describeTable(tableName) {
        const table = tables[tableName];
        if (table) {
          return table;
        }

        throw new Error(`relation "${tableName}" does not exist`);
      },
      async showIndex() {
        return [];
      },
      async addIndex(tableName, fields, options) {
        addedIndexes.push({ tableName, fields, options });
      },
      async addColumn(tableName, columnName, definition) {
        tables[tableName] = tables[tableName] || {};
        tables[tableName][columnName] = definition;
      },
      async createTable(tableName, definition) {
        tables[tableName] = definition;
      },
      async dropTable(tableName) {
        delete tables[tableName];
      },
      async removeIndex() {
        return undefined;
      }
    }
  };
};

test('baseline hardening migration works when only queryGenerator.quoteTable exists', async () => {
  const { queryInterface, queries, addedIndexes } = createQueryInterfaceStub({
    Quotes: {
      assignedManagerId: {},
      guestEmail: {},
      guestName: {}
    },
    Users: {
      email: {},
      name: {}
    }
  });

  await assert.doesNotReject(() => baselineHardening.up(queryInterface, { UUID: 'UUID' }));

  assert.equal(
    queries.some((sql) => sql.includes('CREATE EXTENSION IF NOT EXISTS pg_trgm')),
    true
  );
  assert.equal(
    queries.some((sql) => sql.includes('"quotes_guest_email_trgm_idx" ON "Quotes" USING gin')),
    true
  );
  assert.equal(
    queries.some((sql) => sql.includes('"users_email_trgm_idx" ON "Users" USING gin')),
    true
  );
  assert.deepEqual(addedIndexes, [
    {
      tableName: 'Quotes',
      fields: ['assignedManagerId'],
      options: { name: 'quotes_assigned_manager_idx' }
    }
  ]);
});

test('performance search migration works when only queryGenerator.quoteTable exists', async () => {
  const { queryInterface, queries } = createQueryInterfaceStub({
    Projects: {
      title: {},
      location: {},
      description: {}
    },
    ServiceOfferings: {
      title: {},
      slug: {},
      shortDescription: {}
    },
    Materials: {
      name: {},
      sku: {},
      supplier: {}
    }
  });

  await assert.doesNotReject(() => performanceSearch.up(queryInterface));

  assert.equal(
    queries.some((sql) => sql.includes('"projects_title_trgm_idx" ON "Projects" USING gin')),
    true
  );
  assert.equal(
    queries.some((sql) => sql.includes('"service_offerings_slug_trgm_idx" ON "ServiceOfferings" USING gin')),
    true
  );
  assert.equal(
    queries.some((sql) => sql.includes('"materials_supplier_trgm_idx" ON "Materials" USING gin')),
    true
  );
});

test('session/device hardening migration creates missing tables when Sequelize says no description found', async () => {
  const queries = [];
  const createdTables = [];
  const addedIndexes = [];
  const tables = {
    Users: {
      id: {},
      email: {}
    }
  };

  const queryInterface = {
    sequelize: {
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable(tableName) {
      const table = tables[tableName];
      if (table) {
        return table;
      }

      throw new Error(`No description found for "${tableName}" table. Check the table name and schema; remember, they _are_ case sensitive.`);
    },
    async createTable(tableName, columns) {
      createdTables.push(tableName);
      tables[tableName] = columns;
    },
    async showIndex() {
      return [];
    },
    async addIndex(tableName, fields, options) {
      addedIndexes.push({ tableName, fields, options });
    },
    async dropTable() {}
  };

  await assert.doesNotReject(() =>
    sessionDeviceHardening.up(queryInterface, {
      DataTypes: {
        UUID: 'UUID',
        STRING: 'STRING',
        DATE: 'DATE',
        NOW: 'NOW',
        ENUM: (...values) => ({ type: 'ENUM', values })
      }
    })
  );

  assert.deepEqual(createdTables, ['SessionRefreshTokens', 'DevicePushTokens']);
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'session_refresh_tokens_user_expires_idx'),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'device_push_tokens_user_platform_idx'),
    true
  );
  assert.equal(
    queries.includes('CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON "Users" (LOWER("email"))'),
    true
  );
});

test('quote workflow migration resumes safely after a partial apply and uses explicit enum casts in backfill SQL', async () => {
  const queries = [];
  const addedIndexes = [];
  const createdTables = [];
  const tables = {
    Quotes: {
      id: {},
      status: {},
      clientId: {},
      isGuest: {},
      assignedManagerId: {},
      createdAt: {},
      updatedAt: {},
      workflowStatus: {},
      sourceChannel: {},
      submittedAt: {}
    },
    Estimates: {
      id: {},
      quoteId: {},
      decisionStatus: {}
    },
    Projects: {
      id: {}
    },
    QuoteEvents: {
      id: {},
      quoteId: {},
      visibility: {},
      createdAt: {}
    }
  };
  const indexesByTable = {
    Quotes: [{ name: 'quotes_current_estimate_idx' }],
    Estimates: [],
    Projects: [],
    QuoteEvents: [{ name: 'quote_events_quote_created_idx' }]
  };

  const queryInterface = {
    sequelize: {
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable(tableName) {
      const table = tables[tableName];
      if (table) {
        return table;
      }

      throw new Error(`relation "${tableName}" does not exist`);
    },
    async addColumn(tableName, columnName, definition) {
      tables[tableName] = tables[tableName] || {};
      tables[tableName][columnName] = definition;
    },
    async removeColumn() {},
    async createTable(tableName, definition) {
      createdTables.push(tableName);
      tables[tableName] = definition;
    },
    async dropTable() {},
    async showIndex(tableName) {
      return indexesByTable[tableName] || [];
    },
    async addIndex(tableName, fields, options) {
      indexesByTable[tableName] = [...(indexesByTable[tableName] || []), { name: options.name }];
      addedIndexes.push({ tableName, fields, options });
    },
    async removeIndex() {}
  };

  await assert.doesNotReject(() =>
    quoteWorkflowAndEvents.up(queryInterface, {
      fn: (name) => ({ fn: name }),
      DataTypes: {
        UUID: 'UUID',
        STRING: 'STRING',
        DATE: 'DATE',
        TEXT: 'TEXT',
        INTEGER: 'INTEGER',
        BOOLEAN: 'BOOLEAN',
        JSON: 'JSON',
        ENUM: (...values) => ({ type: 'ENUM', values })
      }
    })
  );

  assert.deepEqual(createdTables, []);
  assert.equal(Object.hasOwn(tables.Quotes, 'currentEstimateId'), true);
  assert.equal(Object.hasOwn(tables.Estimates, 'versionNumber'), true);
  assert.equal(Object.hasOwn(tables.Projects, 'acceptedEstimateId'), true);
  assert.equal(
    queries.some((sql) => sql.includes(')::"enum_Quotes_workflowStatus"')),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quotes_current_estimate_idx'),
    false
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quotes_workflow_status_created_idx'),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quote_events_quote_visibility_idx'),
    true
  );
});

test('quotes clientId nullability hotfix only changes the column when it is still non-nullable', async () => {
  const changedColumns = [];
  const tables = {
    Quotes: {
      clientId: { allowNull: false }
    },
    Users: {
      id: {}
    }
  };

  const queryInterface = {
    async describeTable(tableName) {
      const table = tables[tableName];
      if (table) {
        return table;
      }

      throw new Error(`relation "${tableName}" does not exist`);
    },
    async changeColumn(tableName, columnName, definition) {
      changedColumns.push({ tableName, columnName, definition });
      tables[tableName][columnName] = { ...tables[tableName][columnName], ...definition };
    }
  };

  await assert.doesNotReject(() => relaxQuotesClientIdNullability.up(queryInterface, { UUID: 'UUID' }));

  assert.deepEqual(changedColumns, [{
    tableName: 'Quotes',
    columnName: 'clientId',
    definition: {
      type: 'UUID',
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }]);
});

test('quotes clientId nullability hotfix is a no-op when the column is already nullable', async () => {
  const changedColumns = [];
  const tables = {
    Quotes: {
      clientId: { allowNull: true }
    },
    Users: {
      id: {}
    }
  };

  const queryInterface = {
    async describeTable(tableName) {
      const table = tables[tableName];
      if (table) {
        return table;
      }

      throw new Error(`relation "${tableName}" does not exist`);
    },
    async changeColumn(tableName, columnName, definition) {
      changedColumns.push({ tableName, columnName, definition });
    }
  };

  await assert.doesNotReject(() => relaxQuotesClientIdNullability.up(queryInterface, { UUID: 'UUID' }));

  assert.deepEqual(changedColumns, []);
});

test('quotes clientId force-drop hotfix executes a raw ALTER TABLE DROP NOT NULL on the real quotes column', async () => {
  const queries = [];
  const queryInterface = {
    queryGenerator: {
      quoteTable: (tableName) => `"${tableName}"`,
      quoteIdentifier: (value) => `"${value}"`
    },
    sequelize: {
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable(tableName) {
      if (tableName === 'Quotes') {
        return {
          clientId: { allowNull: false }
        };
      }

      throw new Error(`relation "${tableName}" does not exist`);
    }
  };

  await assert.doesNotReject(() => forceDropQuotesClientIdNotNull.up(queryInterface));

  assert.deepEqual(queries, [
    'ALTER TABLE "Quotes" ALTER COLUMN "clientId" DROP NOT NULL'
  ]);
});

test('quote attachments migration creates the table and both supporting indexes when missing', async () => {
  const { queryInterface, addedIndexes } = createQueryInterfaceStub({
    Quotes: {
      id: {}
    },
    Users: {
      id: {}
    }
  });

  await assert.doesNotReject(() =>
    quoteAttachmentsMigration.up(queryInterface, {
      fn: (name) => ({ fn: name }),
      DataTypes: {
        UUID: 'UUID',
        STRING: 'STRING',
        INTEGER: 'INTEGER',
        DATE: 'DATE'
      }
    })
  );

  assert.equal(typeof queryInterface.describeTable, 'function');
  await assert.doesNotReject(() => queryInterface.describeTable('QuoteAttachments'));
  assert.equal(
    addedIndexes.some((item) => item.options?.name === 'quote_attachments_quote_created_idx'),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options?.name === 'quote_attachments_uploader_idx'),
    true
  );
});
