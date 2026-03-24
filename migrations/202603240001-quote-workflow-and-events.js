'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('Quotes', 'workflowStatus', {
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

    await queryInterface.addColumn('Quotes', 'sourceChannel', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Quotes', 'currentEstimateId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Estimates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Quotes', 'convertedProjectId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('Quotes', 'submittedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Quotes', 'assignedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Quotes', 'convertedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Quotes', 'closedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Quotes', 'lossReason', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'decisionStatus', {
      type: DataTypes.ENUM('pending', 'viewed', 'revision_requested', 'accepted', 'declined'),
      allowNull: false,
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('Estimates', 'versionNumber', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    await queryInterface.addColumn('Estimates', 'isCurrentVersion', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('Estimates', 'clientMessage', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'sentAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'viewedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'respondedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'approvedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Estimates', 'declinedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Projects', 'acceptedEstimateId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Estimates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.createTable('QuoteEvents', {
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

    await queryInterface.sequelize.query(`
      UPDATE "Quotes"
      SET "workflowStatus" = CASE "status"
        WHEN 'pending' THEN 'submitted'
        WHEN 'in_progress' THEN 'assigned'
        WHEN 'responded' THEN 'estimate_sent'
        WHEN 'closed' THEN 'closed_lost'
        ELSE 'submitted'
      END,
      "submittedAt" = COALESCE("submittedAt", "createdAt"),
      "assignedAt" = CASE WHEN "assignedManagerId" IS NOT NULL THEN COALESCE("assignedAt", "updatedAt", "createdAt") ELSE NULL END,
      "closedAt" = CASE WHEN "status" = 'closed' THEN COALESCE("closedAt", "updatedAt", "createdAt") ELSE NULL END,
      "sourceChannel" = CASE
        WHEN "isGuest" = TRUE THEN 'public_web'
        WHEN "clientId" IS NOT NULL THEN 'client_portal'
        ELSE 'manager_created'
      END
    `);

    await queryInterface.addIndex('Quotes', ['workflowStatus', 'createdAt'], { name: 'quotes_workflow_status_created_idx' });
    await queryInterface.addIndex('Quotes', ['currentEstimateId'], { name: 'quotes_current_estimate_idx' });
    await queryInterface.addIndex('Quotes', ['convertedProjectId'], { name: 'quotes_converted_project_idx' });
    await queryInterface.addIndex('Estimates', ['quoteId', 'versionNumber'], { name: 'estimates_quote_version_idx' });
    await queryInterface.addIndex('Estimates', ['quoteId', 'isCurrentVersion'], { name: 'estimates_quote_current_idx' });
    await queryInterface.addIndex('Projects', ['acceptedEstimateId'], { name: 'projects_accepted_estimate_idx' });
    await queryInterface.addIndex('QuoteEvents', ['quoteId', 'createdAt'], { name: 'quote_events_quote_created_idx' });
    await queryInterface.addIndex('QuoteEvents', ['quoteId', 'visibility', 'createdAt'], { name: 'quote_events_quote_visibility_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('QuoteEvents', 'quote_events_quote_visibility_idx');
    await queryInterface.removeIndex('QuoteEvents', 'quote_events_quote_created_idx');
    await queryInterface.removeIndex('Projects', 'projects_accepted_estimate_idx');
    await queryInterface.removeIndex('Estimates', 'estimates_quote_current_idx');
    await queryInterface.removeIndex('Estimates', 'estimates_quote_version_idx');
    await queryInterface.removeIndex('Quotes', 'quotes_converted_project_idx');
    await queryInterface.removeIndex('Quotes', 'quotes_current_estimate_idx');
    await queryInterface.removeIndex('Quotes', 'quotes_workflow_status_created_idx');

    await queryInterface.dropTable('QuoteEvents');

    await queryInterface.removeColumn('Projects', 'acceptedEstimateId');

    await queryInterface.removeColumn('Estimates', 'declinedAt');
    await queryInterface.removeColumn('Estimates', 'approvedAt');
    await queryInterface.removeColumn('Estimates', 'respondedAt');
    await queryInterface.removeColumn('Estimates', 'viewedAt');
    await queryInterface.removeColumn('Estimates', 'sentAt');
    await queryInterface.removeColumn('Estimates', 'clientMessage');
    await queryInterface.removeColumn('Estimates', 'isCurrentVersion');
    await queryInterface.removeColumn('Estimates', 'versionNumber');
    await queryInterface.removeColumn('Estimates', 'decisionStatus');

    await queryInterface.removeColumn('Quotes', 'lossReason');
    await queryInterface.removeColumn('Quotes', 'closedAt');
    await queryInterface.removeColumn('Quotes', 'convertedAt');
    await queryInterface.removeColumn('Quotes', 'assignedAt');
    await queryInterface.removeColumn('Quotes', 'submittedAt');
    await queryInterface.removeColumn('Quotes', 'convertedProjectId');
    await queryInterface.removeColumn('Quotes', 'currentEstimateId');
    await queryInterface.removeColumn('Quotes', 'sourceChannel');
    await queryInterface.removeColumn('Quotes', 'workflowStatus');
  }
};
