'use strict';

const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|No description found/i;

const findExistingTable = async (queryInterface, candidates) => {
  for (const tableName of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.describeTable(tableName);
      return tableName;
    } catch (error) {
      const message = String(error && error.message ? error.message : '');
      if (!tableDoesNotExistPattern.test(message)) {
        throw error;
      }
    }
  }

  return null;
};

const resolveColumnName = (tableDefinition, desiredColumnName) => {
  const columns = Object.keys(tableDefinition || {});
  const directMatch = columns.find((column) => column === desiredColumnName);
  if (directMatch) return directMatch;
  const normalized = String(desiredColumnName).toLowerCase();
  return columns.find((column) => String(column).toLowerCase() === normalized) || null;
};

const quoteIdentifier = (queryInterface, value) => {
  if (typeof queryInterface.quoteIdentifier === 'function') {
    return queryInterface.quoteIdentifier(value);
  }

  if (typeof queryInterface.queryGenerator?.quoteIdentifier === 'function') {
    return queryInterface.queryGenerator.quoteIdentifier(value);
  }

  return `"${String(value).replace(/"/g, '""')}"`;
};

const quoteTable = (queryInterface, tableName) => {
  if (typeof queryInterface.quoteTable === 'function') {
    return queryInterface.quoteTable(tableName);
  }

  if (typeof queryInterface.queryGenerator?.quoteTable === 'function') {
    return queryInterface.queryGenerator.quoteTable(tableName);
  }

  return quoteIdentifier(queryInterface, tableName);
};

module.exports = {
  up: async (queryInterface) => {
    const quotesTable = await findExistingTable(queryInterface, ['Quotes', 'quotes']);
    if (!quotesTable) {
      return;
    }

    const quoteColumns = await queryInterface.describeTable(quotesTable);
    const resolvedClientId = resolveColumnName(quoteColumns, 'clientId');
    if (!resolvedClientId) {
      return;
    }

    const quotedTable = quoteTable(queryInterface, quotesTable);
    const quotedClientId = quoteIdentifier(queryInterface, resolvedClientId);
    await queryInterface.sequelize.query(`ALTER TABLE ${quotedTable} ALTER COLUMN ${quotedClientId} DROP NOT NULL`);
  },

  down: async () => {
    // No-op: guest quote intake depends on clientId remaining nullable.
  }
};
