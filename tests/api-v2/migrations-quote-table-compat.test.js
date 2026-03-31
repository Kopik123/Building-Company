const assert = require('node:assert/strict');
const test = require('node:test');

const baselineHardening = require('../../migrations/202603080001-production-baseline-hardening.js');
const sessionDeviceHardening = require('../../migrations/202603080002-v2-session-device-and-email-hardening.js');
const performanceSearch = require('../../migrations/202603090000-performance-search-trgm-indexes.js');
const quoteWorkflowPhase1 = require('../../migrations/202603310001-quote-workflow-phase1.js');

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

test('quote workflow phase-1 migration adds workflow columns and indexes when Quotes already exists', async () => {
  const tables = {
    Quotes: {
      id: {},
      status: {},
      priority: {},
      assignedManagerId: {},
      createdAt: {},
      updatedAt: {}
    }
  };
  const addedIndexes = [];

  const queryInterface = {
    async describeTable(tableName) {
      const table = tables[tableName];
      if (table) return table;
      throw new Error(`relation "${tableName}" does not exist`);
    },
    async addColumn(tableName, columnName, definition) {
      tables[tableName] = tables[tableName] || {};
      tables[tableName][columnName] = definition;
    },
    async showIndex() {
      return [];
    },
    async addIndex(tableName, fields, options) {
      addedIndexes.push({ tableName, fields, options });
    }
  };

  await assert.doesNotReject(() =>
    quoteWorkflowPhase1.up(queryInterface, {
      DataTypes: {
        STRING: 'STRING',
        TEXT: 'TEXT',
        DATE: 'DATE',
        DATEONLY: 'DATEONLY'
      }
    })
  );

  assert.equal(Boolean(tables.Quotes.workflowStatus), true);
  assert.equal(Boolean(tables.Quotes.siteVisitDate), true);
  assert.equal(Boolean(tables.Quotes.clientDecisionStatus), true);
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quotes_workflow_status_created_idx'),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quotes_client_decision_idx'),
    true
  );
});
