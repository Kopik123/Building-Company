const includesBoundedSegment = (value, startNeedle, endNeedle) => {
  const startIndex = value.indexOf(startNeedle);
  if (startIndex === -1) return false;

  const endIndex = value.indexOf(endNeedle, startIndex + startNeedle.length);
  return endIndex !== -1;
};

const isMissingTableMessage = (message) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('does not exist') ||
    normalized.includes('unknown table') ||
    includesBoundedSegment(normalized, 'relation ', ' does not exist')
  );
};

const isSafeIdentifier = (value) => {
  const identifier = String(value || '');
  if (!identifier) return false;

  for (let index = 0; index < identifier.length; index += 1) {
    const charCode = identifier.charCodeAt(index);
    const isUpper = charCode >= 65 && charCode <= 90;
    const isLower = charCode >= 97 && charCode <= 122;
    const isDigit = charCode >= 48 && charCode <= 57;
    const isUnderscore = charCode === 95;

    if (index === 0) {
      if (!isUpper && !isLower && !isUnderscore) {
        return false;
      }
      continue;
    }

    if (!isUpper && !isLower && !isDigit && !isUnderscore) {
      return false;
    }
  }

  return true;
};

const quoteSqlIdentifier = (value, label) => {
  if (!isSafeIdentifier(value)) {
    throw new TypeError(`Unsafe SQL identifier for ${label}`);
  }

  return `"${value}"`;
};

const findExistingTable = async (queryInterface, candidates) => {
  for (const tableName of candidates) {
    try {
      // describeTable throws when table does not exist
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.describeTable(tableName);
      return tableName;
    } catch (error) {
      const message = String(error && error.message ? error.message : '');
      if (!isMissingTableMessage(message)) {
        throw error;
      }
    }
  }
  return null;
};

const resolveColumnName = (tableDefinition, desired) => {
  const keys = Object.keys(tableDefinition || {});
  const exact = keys.find((key) => key === desired);
  if (exact) return exact;
  const normalized = String(desired).toLowerCase();
  return keys.find((key) => String(key).toLowerCase() === normalized) || null;
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields, options = {}) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name: indexName, ...options });
};

const addTrigramIndexIfPossible = async (queryInterface, tableName, tableDefinition, columnName, indexName) => {
  const resolvedColumn = resolveColumnName(tableDefinition, columnName);
  if (!resolvedColumn) return;

  const quotedIndex = quoteSqlIdentifier(indexName, 'index name');
  const quotedTable = quoteSqlIdentifier(tableName, 'table name');
  const quotedColumn = quoteSqlIdentifier(resolvedColumn, 'column name');
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS ${quotedIndex} ON ${quotedTable} USING gin (LOWER(${quotedColumn}) gin_trgm_ops)`
  );
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    const quotesTable = await findExistingTable(queryInterface, ['Quotes', 'quotes']);
    if (quotesTable) {
      const quoteColumns = await queryInterface.describeTable(quotesTable);
      if (!resolveColumnName(quoteColumns, 'assignedManagerId')) {
        await queryInterface.addColumn(quotesTable, 'assignedManagerId', {
          type: Sequelize.UUID,
          allowNull: true
        });
      }

      const refreshedQuoteColumns = await queryInterface.describeTable(quotesTable);
      const resolvedAssignedManagerId = resolveColumnName(refreshedQuoteColumns, 'assignedManagerId');
      if (resolvedAssignedManagerId) {
        await addIndexIfMissing(queryInterface, quotesTable, 'quotes_assigned_manager_idx', [resolvedAssignedManagerId]);
      }

      await addTrigramIndexIfPossible(
        queryInterface,
        quotesTable,
        refreshedQuoteColumns,
        'guestEmail',
        'quotes_guest_email_trgm_idx'
      );
      await addTrigramIndexIfPossible(
        queryInterface,
        quotesTable,
        refreshedQuoteColumns,
        'guestName',
        'quotes_guest_name_trgm_idx'
      );
    }

    const usersTable = await findExistingTable(queryInterface, ['Users', 'users']);
    if (usersTable) {
      const userColumns = await queryInterface.describeTable(usersTable);
      await addTrigramIndexIfPossible(queryInterface, usersTable, userColumns, 'email', 'users_email_trgm_idx');
      await addTrigramIndexIfPossible(queryInterface, usersTable, userColumns, 'name', 'users_name_trgm_idx');
    }
  },

  down: async (queryInterface) => {
    const quotesTable = await findExistingTable(queryInterface, ['Quotes', 'quotes']);
    if (quotesTable) {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS quotes_assigned_manager_idx');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS quotes_guest_email_trgm_idx');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS quotes_guest_name_trgm_idx');
    }

    const usersTable = await findExistingTable(queryInterface, ['Users', 'users']);
    if (usersTable) {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_email_trgm_idx');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_name_trgm_idx');
    }
  }
};
