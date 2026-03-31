'use strict';

const { resolveColumnName, tableExists, addColumnIfMissing, addIndexIfMissing } = require('./_migration-helpers');

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
