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

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const quotesTable = await findExistingTable(queryInterface, ['Quotes', 'quotes']);
    if (!quotesTable) {
      return;
    }

    const usersTable = await findExistingTable(queryInterface, ['Users', 'users']) || 'Users';
    const quoteColumns = await queryInterface.describeTable(quotesTable);
    const resolvedClientId = resolveColumnName(quoteColumns, 'clientId');
    if (!resolvedClientId) {
      return;
    }

    const clientColumn = quoteColumns[resolvedClientId];
    if (clientColumn?.allowNull === true) {
      return;
    }

    await queryInterface.changeColumn(quotesTable, resolvedClientId, {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: usersTable,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async () => {
    // No-op: restoring NOT NULL would break guest quote intake again and is not desired.
  }
};
