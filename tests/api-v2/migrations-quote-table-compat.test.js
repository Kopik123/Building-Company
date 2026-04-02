const assert = require('node:assert/strict');
const test = require('node:test');

const baselineHardening = require('../../migrations/202603080001-production-baseline-hardening.js');
const sessionDeviceHardening = require('../../migrations/202603080002-v2-session-device-and-email-hardening.js');
const performanceSearch = require('../../migrations/202603090000-performance-search-trgm-indexes.js');
const quoteWorkflowPhase1 = require('../../migrations/202603310001-quote-workflow-phase1.js');
const quoteWorkflowPhase3 = require('../../migrations/202603311415-phase3-estimate-client-review-and-revisions.js');

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

test('baseline hardening migration skips absent tables for unknown-table errors without regex backtracking', async () => {
  const queries = [];
  const queryInterface = {
    sequelize: {
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable() {
      throw new Error('Unknown table "Quotes"');
    },
    async showIndex() {
      return [];
    },
    async addIndex() {},
    async addColumn() {}
  };

  await assert.doesNotReject(() => baselineHardening.up(queryInterface, { UUID: 'UUID' }));
  assert.deepEqual(queries, ['CREATE EXTENSION IF NOT EXISTS pg_trgm']);
});

test('baseline hardening migration skips pg_trgm work on SQLite while keeping standard indexes', async () => {
  const queries = [];
  const addedIndexes = [];
  const queryInterface = {
    sequelize: {
      getDialect: () => 'sqlite',
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable(tableName) {
      if (tableName === 'Quotes') {
        return {
          assignedManagerId: {},
          guestEmail: {},
          guestName: {}
        };
      }

      if (tableName === 'Users') {
        return {
          email: {},
          name: {}
        };
      }

      throw new Error(`relation "${tableName}" does not exist`);
    },
    async showIndex() {
      return [];
    },
    async addIndex(tableName, fields, options) {
      addedIndexes.push({ tableName, fields, options });
    },
    async addColumn() {}
  };

  await assert.doesNotReject(() => baselineHardening.up(queryInterface, { UUID: 'UUID' }));
  assert.deepEqual(queries, []);
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

test('performance search migration skips pg_trgm work on SQLite', async () => {
  const queries = [];
  const queryInterface = {
    queryGenerator: {
      quoteTable: (tableName) => `"${tableName}"`,
      quoteIdentifier: (value) => `"${value}"`
    },
    sequelize: {
      getDialect: () => 'sqlite',
      async query(sql) {
        queries.push(sql);
      }
    },
    async describeTable() {
      throw new Error('relation "Projects" does not exist');
    }
  };

  await assert.doesNotReject(() => performanceSearch.up(queryInterface));
  assert.deepEqual(queries, []);
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

test('session/device hardening migration treats sqlite no-such-table errors as missing tables', async () => {
  const createdTables = [];
  const queryInterface = {
    sequelize: {
      async query() {}
    },
    async describeTable(tableName) {
      if (tableName === 'Users') {
        return {
          id: {},
          email: {}
        };
      }

      throw new Error(`SQLITE_ERROR: no such table: ${tableName}`);
    },
    async createTable(tableName) {
      createdTables.push(tableName);
    },
    async showIndex() {
      return [];
    },
    async addIndex() {},
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

test('quote workflow phase-3 migration adds estimate review and revision columns when tables already exist', async () => {
  const tables = {
    Quotes: {
      id: {},
      workflowStatus: {},
      status: {},
      updatedAt: {}
    },
    Estimates: {
      id: {},
      quoteId: {},
      status: {}
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
    quoteWorkflowPhase3.up(queryInterface, {
      DataTypes: {
        STRING: 'STRING',
        TEXT: 'TEXT',
        DATE: 'DATE',
        DATEONLY: 'DATEONLY',
        BOOLEAN: 'BOOLEAN',
        INTEGER: 'INTEGER',
        JSON: 'JSON'
      }
    })
  );

  assert.equal(Boolean(tables.Quotes.clientReviewStartedAt), true);
  assert.equal(Boolean(tables.Quotes.revisionHistory), true);
  assert.equal(Boolean(tables.Estimates.revisionHistory), true);
  assert.equal(Boolean(tables.Estimates.documentUrl), true);
  assert.equal(Boolean(tables.Estimates.clientVisible), true);
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'estimates_client_visible_status_idx'),
    true
  );
  assert.equal(
    addedIndexes.some((item) => item.options.name === 'quotes_client_review_started_idx'),
    true
  );
});
