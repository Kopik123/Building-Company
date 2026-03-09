const assert = require('node:assert/strict');
const test = require('node:test');

const baselineHardening = require('../../migrations/202603080001-production-baseline-hardening.js');
const performanceSearch = require('../../migrations/202603090000-performance-search-trgm-indexes.js');

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
