'use strict';

const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|No description found/i;

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error?.message || '');
    if (tableDoesNotExistPattern.test(message)) {
      return false;
    }
    throw error;
  }
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) return;
  await queryInterface.addIndex(tableName, fields, { name: indexName });
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === indexName)) return;
  await queryInterface.removeIndex(tableName, indexName);
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, 'QuoteAttachments'))) {
      await queryInterface.createTable('QuoteAttachments', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true
        },
        quoteId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Quotes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        uploadedByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        source: {
          type: DataTypes.STRING,
          allowNull: true
        },
        mediaType: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'image'
        },
        url: {
          type: DataTypes.STRING,
          allowNull: false
        },
        storagePath: {
          type: DataTypes.STRING,
          allowNull: false
        },
        filename: {
          type: DataTypes.STRING,
          allowNull: false
        },
        mimeType: {
          type: DataTypes.STRING,
          allowNull: true
        },
        sizeBytes: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        }
      });
    }

    await addIndexIfMissing(queryInterface, 'QuoteAttachments', 'quote_attachments_quote_created_idx', ['quoteId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'QuoteAttachments', 'quote_attachments_uploader_idx', ['uploadedByUserId']);
  },

  down: async (queryInterface) => {
    await removeIndexIfPresent(queryInterface, 'QuoteAttachments', 'quote_attachments_uploader_idx');
    await removeIndexIfPresent(queryInterface, 'QuoteAttachments', 'quote_attachments_quote_created_idx');
    if (await tableExists(queryInterface, 'QuoteAttachments')) {
      await queryInterface.dropTable('QuoteAttachments');
    }
  }
};
