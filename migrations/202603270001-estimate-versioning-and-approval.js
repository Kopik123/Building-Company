'use strict';

const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|No description found/i;

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error?.message || '');
    if (tableDoesNotExistPattern.test(message)) return false;
    throw error;
  }
};

const columnExists = async (queryInterface, tableName, columnName) => {
  if (!(await tableExists(queryInterface, tableName))) return false;
  const columns = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(columns, columnName);
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  if (await columnExists(queryInterface, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
};

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  if (!(await tableExists(queryInterface, tableName))) return;
  if (!(await columnExists(queryInterface, tableName, columnName))) return;
  await queryInterface.removeColumn(tableName, columnName);
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

    if (await tableExists(queryInterface, 'Estimates')) {
      await queryInterface.sequelize.query('ALTER TYPE "enum_Estimates_status" ADD VALUE IF NOT EXISTS \'superseded\'');
    }

    await addColumnIfMissing(queryInterface, 'Estimates', 'decisionNote', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'supersededById', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Estimates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'supersededAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    if (await tableExists(queryInterface, 'Estimates')) {
      await queryInterface.sequelize.query(`
        UPDATE "Estimates"
        SET "decisionNote" = "clientMessage"
        WHERE "decisionNote" IS NULL
          AND "respondedAt" IS NOT NULL
          AND "clientMessage" IS NOT NULL;
      `);
    }

    await addIndexIfMissing(queryInterface, 'Estimates', 'estimates_superseded_by_idx', ['supersededById']);
  },

  down: async (queryInterface) => {
    await removeIndexIfPresent(queryInterface, 'Estimates', 'estimates_superseded_by_idx');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'supersededAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'supersededById');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'decisionNote');
  }
};
