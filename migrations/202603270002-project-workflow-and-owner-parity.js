'use strict';

const tableDoesNotExistPattern = /does not exist|unknown table|relation .* does not exist|no such table|No description found/i;

const PROJECT_STAGES = [
  'briefing',
  'scope_locked',
  'procurement',
  'site_prep',
  'installation',
  'finishing',
  'handover',
  'aftercare'
];

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

    if (await tableExists(queryInterface, 'Projects')) {
      const enumValues = PROJECT_STAGES.map((value) => `'${value}'`).join(', ');
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'enum_Projects_projectStage'
          ) THEN
            CREATE TYPE "enum_Projects_projectStage" AS ENUM(${enumValues});
          END IF;
        END
        $$;
      `);
    }

    await addColumnIfMissing(queryInterface, 'Projects', 'projectStage', {
      type: 'enum_Projects_projectStage',
      allowNull: false,
      defaultValue: 'briefing'
    });

    await addColumnIfMissing(queryInterface, 'Projects', 'currentMilestone', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Projects', 'workPackage', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Projects', 'dueDate', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    if (await tableExists(queryInterface, 'Projects')) {
      await queryInterface.sequelize.query(`
        UPDATE "Projects"
        SET
          "projectStage" = CASE
            WHEN COALESCE("status", '') = 'completed' THEN 'handover'::"enum_Projects_projectStage"
            WHEN COALESCE("status", '') = 'in_progress' THEN 'installation'::"enum_Projects_projectStage"
            WHEN COALESCE("status", '') = 'on_hold' THEN 'procurement'::"enum_Projects_projectStage"
            ELSE 'briefing'::"enum_Projects_projectStage"
          END,
          "dueDate" = COALESCE("dueDate", "endDate")
        WHERE "projectStage" IS NULL
           OR "dueDate" IS NULL;
      `);
    }

    await addIndexIfMissing(queryInterface, 'Projects', 'projects_stage_due_idx', ['projectStage', 'dueDate']);
    await addIndexIfMissing(queryInterface, 'Projects', 'projects_owner_due_idx', ['assignedManagerId', 'dueDate']);
  },

  down: async (queryInterface) => {
    await removeIndexIfPresent(queryInterface, 'Projects', 'projects_owner_due_idx');
    await removeIndexIfPresent(queryInterface, 'Projects', 'projects_stage_due_idx');
    await removeColumnIfPresent(queryInterface, 'Projects', 'dueDate');
    await removeColumnIfPresent(queryInterface, 'Projects', 'workPackage');
    await removeColumnIfPresent(queryInterface, 'Projects', 'currentMilestone');
    await removeColumnIfPresent(queryInterface, 'Projects', 'projectStage');

    if (await tableExists(queryInterface, 'Projects')) {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Projects_projectStage";');
    }
  }
};
