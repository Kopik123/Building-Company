'use strict';

const { DataTypes } = require('sequelize');

const hasColumn = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  if (await hasColumn(queryInterface, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
};

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  if (!await hasColumn(queryInterface, tableName, columnName)) return;
  await queryInterface.removeColumn(tableName, columnName);
};

module.exports = {
  async up(queryInterface) {
    await addColumnIfMissing(queryInterface, 'Quotes', 'nextActionAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'responseDeadline', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await removeColumnIfPresent(queryInterface, 'Quotes', 'responseDeadline');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'nextActionAt');
  }
};
