'use strict';

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
    if (tableDoesNotExistPattern.test(String(error?.message || ''))) {
      return false;
    }
    throw error;
  }
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const tableDefinition = await queryInterface.describeTable(tableName);
  if (resolveColumnName(tableDefinition, columnName)) {
    return;
  }
  await queryInterface.addColumn(tableName, columnName, definition);
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields) => {
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
    return;
  }

  await queryInterface.addIndex(tableName, resolvedFields, { name: indexName });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await addColumnIfMissing(queryInterface, 'Quotes', 'clientReviewStartedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'revisionHistory', {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'revisionNumber', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'revisionHistory', {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'clientVisible', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'sentToClientAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'documentUrl', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'documentStoragePath', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'documentFilename', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'documentMimeType', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Estimates', 'documentSizeBytes', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_client_review_started_idx', ['clientReviewStartedAt', 'updatedAt']);
    await addIndexIfMissing(queryInterface, 'Estimates', 'estimates_client_visible_status_idx', ['clientVisible', 'status']);
    await addIndexIfMissing(queryInterface, 'Estimates', 'estimates_revision_number_idx', ['quoteId', 'revisionNumber']);
  },

  down: async (queryInterface) => {
    const quoteColumns = ['clientReviewStartedAt', 'revisionHistory'];
    const estimateColumns = [
      'revisionNumber',
      'revisionHistory',
      'clientVisible',
      'sentToClientAt',
      'documentUrl',
      'documentStoragePath',
      'documentFilename',
      'documentMimeType',
      'documentSizeBytes'
    ];

    if (await tableExists(queryInterface, 'Quotes')) {
      const tableDefinition = await queryInterface.describeTable('Quotes');
      for (const columnName of quoteColumns) {
        const resolved = resolveColumnName(tableDefinition, columnName);
        if (resolved) {
          // eslint-disable-next-line no-await-in-loop
          await queryInterface.removeColumn('Quotes', resolved);
        }
      }
    }

    if (await tableExists(queryInterface, 'Estimates')) {
      const tableDefinition = await queryInterface.describeTable('Estimates');
      for (const columnName of estimateColumns) {
        const resolved = resolveColumnName(tableDefinition, columnName);
        if (resolved) {
          // eslint-disable-next-line no-await-in-loop
          await queryInterface.removeColumn('Estimates', resolved);
        }
      }
    }
  }
};
