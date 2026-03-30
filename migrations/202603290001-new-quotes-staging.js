'use strict';

const { DataTypes } = require('sequelize');

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('no description found')) {
      return false;
    }
    throw error;
  }
};

const addIndexIfMissing = async (queryInterface, tableName, name, fields, options = {}) => {
  if (!await tableExists(queryInterface, tableName)) return;
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === name)) return;
  await queryInterface.addIndex(tableName, fields, { name, ...options });
};

module.exports = {
  async up(queryInterface) {
    if (!await tableExists(queryInterface, 'new_quotes')) {
      await queryInterface.createTable('new_quotes', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        quote_ref: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        clientId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        clientName: {
          type: DataTypes.STRING,
          allowNull: true
        },
        clientEmail: {
          type: DataTypes.STRING,
          allowNull: true
        },
        clientPhone: {
          type: DataTypes.STRING,
          allowNull: true
        },
        projectType: {
          type: DataTypes.STRING,
          allowNull: false
        },
        location: {
          type: DataTypes.STRING,
          allowNull: false
        },
        postcode: {
          type: DataTypes.STRING,
          allowNull: true
        },
        budgetRange: {
          type: DataTypes.STRING,
          allowNull: true
        },
        proposalDetails: {
          type: DataTypes.JSON,
          allowNull: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        attachments: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: []
        },
        sourceChannel: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'client_quote_portal'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });
    }

    await addIndexIfMissing(queryInterface, 'new_quotes', 'new_quotes_client_created_idx', ['clientId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'new_quotes', 'new_quotes_project_type_created_idx', ['projectType', 'createdAt']);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'new_quotes')) {
      await queryInterface.dropTable('new_quotes');
    }
  }
};
