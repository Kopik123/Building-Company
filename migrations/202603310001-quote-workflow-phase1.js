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

    await addColumnIfMissing(queryInterface, 'Quotes', 'workflowStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'new'
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'siteVisitStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'not_scheduled'
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'siteVisitDate', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'siteVisitTimeWindow', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'proposedStartDate', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'scopeOfWork', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'materialsPlan', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'labourEstimate', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'estimateDocumentUrl', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'clientDecisionStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'clientDecisionNotes', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'Quotes', 'archivedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_workflow_status_created_idx', ['workflowStatus', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_visit_status_date_idx', ['siteVisitStatus', 'siteVisitDate']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_client_decision_idx', ['clientDecisionStatus', 'updatedAt']);
  },

  down: async (queryInterface) => {
    const columns = [
      'workflowStatus',
      'siteVisitStatus',
      'siteVisitDate',
      'siteVisitTimeWindow',
      'proposedStartDate',
      'scopeOfWork',
      'materialsPlan',
      'labourEstimate',
      'estimateDocumentUrl',
      'clientDecisionStatus',
      'clientDecisionNotes',
      'archivedAt'
    ];

    if (!(await tableExists(queryInterface, 'Quotes'))) {
      return;
    }

    // This rollback removes the additive quote-workflow columns and their stored
    // values. It should only be used when intentionally discarding phase-1
    // workflow data from the Quotes table.
    const tableDefinition = await queryInterface.describeTable('Quotes');
    for (const columnName of columns) {
      const resolved = resolveColumnName(tableDefinition, columnName);
      if (resolved) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeColumn('Quotes', resolved);
      }
    }
  }
};
