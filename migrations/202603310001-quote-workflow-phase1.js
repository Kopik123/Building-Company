'use strict';

const { resolveColumnName, tableExists, addColumnIfMissing, addIndexIfMissing } = require('./_migration-helpers');

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
