'use strict';

const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|No description found/i;
const WORKFLOW_STATUS_ENUM_NAME = '"enum_Quotes_workflowStatus"';

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
    const message = String(error && error.message ? error.message : '');
    if (tableDoesNotExistPattern.test(message)) {
      return false;
    }
    throw error;
  }
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const tableDefinition = await queryInterface.describeTable(tableName);
  const resolvedColumn = resolveColumnName(tableDefinition, columnName);
  if (resolvedColumn) {
    return;
  }
  await queryInterface.addColumn(tableName, columnName, definition);
};

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  const tableDefinition = await queryInterface.describeTable(tableName);
  const resolvedColumn = resolveColumnName(tableDefinition, columnName);
  if (!resolvedColumn) {
    return;
  }

  await queryInterface.removeColumn(tableName, resolvedColumn);
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields, options = {}) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name: indexName, ...options });
};

const removeIndexIfPresent = async (queryInterface, tableName, indexName) => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === indexName)) {
    return;
  }

  await queryInterface.removeIndex(tableName, indexName);
};

const createTableIfMissing = async (queryInterface, tableName, definition) => {
  if (await tableExists(queryInterface, tableName)) {
    return;
  }

  await queryInterface.createTable(tableName, definition);
};

const buildWorkflowBackfillSql = () => `
  UPDATE "Quotes"
  SET "workflowStatus" = (
    CASE "status"
      WHEN 'pending' THEN 'submitted'
      WHEN 'in_progress' THEN 'assigned'
      WHEN 'responded' THEN 'estimate_sent'
      WHEN 'closed' THEN 'closed_lost'
      ELSE 'submitted'
    END
  )::${WORKFLOW_STATUS_ENUM_NAME},
  "submittedAt" = COALESCE("submittedAt", "createdAt"),
  "assignedAt" = CASE WHEN "assignedManagerId" IS NOT NULL THEN COALESCE("assignedAt", "updatedAt", "createdAt") ELSE NULL END,
  "closedAt" = CASE WHEN "status" = 'closed' THEN COALESCE("closedAt", "updatedAt", "createdAt") ELSE NULL END,
  "sourceChannel" = COALESCE(
    "sourceChannel",
    CASE
      WHEN "isGuest" = TRUE THEN 'public_web'
      WHEN "clientId" IS NOT NULL THEN 'client_portal'
      ELSE 'manager_created'
    END
  )
`;

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await addColumnIfMissing(queryInterface, 'Quotes', 'workflowStatus', {
      type: DataTypes.ENUM(
        'submitted',
        'triaged',
        'assigned',
        'awaiting_client_info',
        'estimate_in_progress',
        'estimate_sent',
        'client_review',
        'approved_ready_for_project',
        'converted_to_project',
        'closed_lost'
      ),
      allowNull: false,
      defaultValue: 'submitted'
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'sourceChannel', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'currentEstimateId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Estimates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'convertedProjectId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'submittedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'assignedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'convertedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'closedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Quotes', 'lossReason', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'decisionStatus', {
      type: DataTypes.ENUM('pending', 'viewed', 'revision_requested', 'accepted', 'declined'),
      allowNull: false,
      defaultValue: 'pending'
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'versionNumber', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'isCurrentVersion', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'clientMessage', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'sentAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'viewedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'respondedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'approvedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Estimates', 'declinedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Projects', 'acceptedEstimateId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Estimates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await createTableIfMissing(queryInterface, 'QuoteEvents', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
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
      actorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      eventType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      visibility: {
        type: DataTypes.ENUM('internal', 'client', 'public'),
        allowNull: false,
        defaultValue: 'internal'
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
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

    await queryInterface.sequelize.query(buildWorkflowBackfillSql());

    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_workflow_status_created_idx', ['workflowStatus', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_current_estimate_idx', ['currentEstimateId']);
    await addIndexIfMissing(queryInterface, 'Quotes', 'quotes_converted_project_idx', ['convertedProjectId']);
    await addIndexIfMissing(queryInterface, 'Estimates', 'estimates_quote_version_idx', ['quoteId', 'versionNumber']);
    await addIndexIfMissing(queryInterface, 'Estimates', 'estimates_quote_current_idx', ['quoteId', 'isCurrentVersion']);
    await addIndexIfMissing(queryInterface, 'Projects', 'projects_accepted_estimate_idx', ['acceptedEstimateId']);
    await addIndexIfMissing(queryInterface, 'QuoteEvents', 'quote_events_quote_created_idx', ['quoteId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'QuoteEvents', 'quote_events_quote_visibility_idx', ['quoteId', 'visibility', 'createdAt']);
  },

  down: async (queryInterface) => {
    await removeIndexIfPresent(queryInterface, 'QuoteEvents', 'quote_events_quote_visibility_idx');
    await removeIndexIfPresent(queryInterface, 'QuoteEvents', 'quote_events_quote_created_idx');
    await removeIndexIfPresent(queryInterface, 'Projects', 'projects_accepted_estimate_idx');
    await removeIndexIfPresent(queryInterface, 'Estimates', 'estimates_quote_current_idx');
    await removeIndexIfPresent(queryInterface, 'Estimates', 'estimates_quote_version_idx');
    await removeIndexIfPresent(queryInterface, 'Quotes', 'quotes_converted_project_idx');
    await removeIndexIfPresent(queryInterface, 'Quotes', 'quotes_current_estimate_idx');
    await removeIndexIfPresent(queryInterface, 'Quotes', 'quotes_workflow_status_created_idx');

    if (await tableExists(queryInterface, 'QuoteEvents')) {
      await queryInterface.dropTable('QuoteEvents');
    }

    await removeColumnIfPresent(queryInterface, 'Projects', 'acceptedEstimateId');

    await removeColumnIfPresent(queryInterface, 'Estimates', 'declinedAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'approvedAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'respondedAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'viewedAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'sentAt');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'clientMessage');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'isCurrentVersion');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'versionNumber');
    await removeColumnIfPresent(queryInterface, 'Estimates', 'decisionStatus');

    await removeColumnIfPresent(queryInterface, 'Quotes', 'lossReason');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'closedAt');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'convertedAt');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'assignedAt');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'submittedAt');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'convertedProjectId');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'currentEstimateId');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'sourceChannel');
    await removeColumnIfPresent(queryInterface, 'Quotes', 'workflowStatus');
  }
};
