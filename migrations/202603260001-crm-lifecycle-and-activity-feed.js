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

    await addColumnIfMissing(queryInterface, 'Users', 'crmLifecycleStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'lead'
    });

    await addColumnIfMissing(queryInterface, 'Users', 'crmLifecycleUpdatedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    if (await tableExists(queryInterface, 'Users')) {
      await queryInterface.sequelize.query(`
        UPDATE "Users"
        SET "crmLifecycleStatus" = COALESCE("crmLifecycleStatus", CASE WHEN "role" = 'client' THEN 'lead' ELSE 'lead' END),
            "crmLifecycleUpdatedAt" = COALESCE("crmLifecycleUpdatedAt", "updatedAt", "createdAt")
        WHERE "crmLifecycleStatus" IS NULL OR "crmLifecycleUpdatedAt" IS NULL;
      `);
    }

    if (!(await tableExists(queryInterface, 'ActivityEvents'))) {
      await queryInterface.createTable('ActivityEvents', {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true
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
        entityType: {
          type: DataTypes.STRING,
          allowNull: false
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        visibility: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'internal'
        },
        eventType: {
          type: DataTypes.STRING,
          allowNull: false
        },
        title: {
          type: DataTypes.STRING,
          allowNull: true
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        clientId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        projectId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Projects',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        quoteId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Quotes',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        data: {
          type: DataTypes.JSON,
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

    await addIndexIfMissing(queryInterface, 'Users', 'users_crm_lifecycle_idx', ['crmLifecycleStatus', 'crmLifecycleUpdatedAt']);
    await addIndexIfMissing(queryInterface, 'ActivityEvents', 'activity_events_created_idx', ['createdAt']);
    await addIndexIfMissing(queryInterface, 'ActivityEvents', 'activity_events_client_created_idx', ['clientId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'ActivityEvents', 'activity_events_project_created_idx', ['projectId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'ActivityEvents', 'activity_events_quote_created_idx', ['quoteId', 'createdAt']);
    await addIndexIfMissing(queryInterface, 'ActivityEvents', 'activity_events_visibility_created_idx', ['visibility', 'createdAt']);
  },

  down: async (queryInterface) => {
    await removeIndexIfPresent(queryInterface, 'ActivityEvents', 'activity_events_visibility_created_idx');
    await removeIndexIfPresent(queryInterface, 'ActivityEvents', 'activity_events_quote_created_idx');
    await removeIndexIfPresent(queryInterface, 'ActivityEvents', 'activity_events_project_created_idx');
    await removeIndexIfPresent(queryInterface, 'ActivityEvents', 'activity_events_client_created_idx');
    await removeIndexIfPresent(queryInterface, 'ActivityEvents', 'activity_events_created_idx');
    if (await tableExists(queryInterface, 'ActivityEvents')) {
      await queryInterface.dropTable('ActivityEvents');
    }

    await removeIndexIfPresent(queryInterface, 'Users', 'users_crm_lifecycle_idx');
    await removeColumnIfPresent(queryInterface, 'Users', 'crmLifecycleUpdatedAt');
    await removeColumnIfPresent(queryInterface, 'Users', 'crmLifecycleStatus');
  }
};
