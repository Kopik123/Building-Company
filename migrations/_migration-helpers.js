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
  tableDoesNotExistPattern,
  resolveColumnName,
  tableExists,
  addColumnIfMissing,
  addIndexIfMissing
};
