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

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await addColumnIfMissing(queryInterface, 'ServiceOfferings', 'summaryLine', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'ServiceOfferings', 'serviceCtaLabel', {
      type: DataTypes.STRING,
      allowNull: true
    });

    if (await tableExists(queryInterface, 'ServiceOfferings')) {
      await queryInterface.sequelize.query(`
        UPDATE "ServiceOfferings"
        SET
          "summaryLine" = COALESCE("summaryLine", "shortDescription"),
          "serviceCtaLabel" = COALESCE("serviceCtaLabel", 'Send Enquiry')
        WHERE "summaryLine" IS NULL OR "serviceCtaLabel" IS NULL;
      `);
    }

    await addColumnIfMissing(queryInterface, 'Materials', 'reorderTargetQty', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Materials', 'supplierContact', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Materials', 'lastRestockedAt', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    if (await tableExists(queryInterface, 'Materials')) {
      await queryInterface.sequelize.query(`
        UPDATE "Materials"
        SET "reorderTargetQty" = COALESCE("reorderTargetQty", "minStockQty")
        WHERE "reorderTargetQty" IS NULL;
      `);
    }

    await addColumnIfMissing(queryInterface, 'Users', 'jobTitle', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Users', 'specialism', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, 'Users', 'availabilityStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'available'
    });

    if (await tableExists(queryInterface, 'Users')) {
      await queryInterface.sequelize.query(`
        UPDATE "Users"
        SET "availabilityStatus" = COALESCE("availabilityStatus", 'available')
        WHERE "availabilityStatus" IS NULL;
      `);
    }
  },

  down: async (queryInterface) => {
    await removeColumnIfPresent(queryInterface, 'Users', 'availabilityStatus');
    await removeColumnIfPresent(queryInterface, 'Users', 'specialism');
    await removeColumnIfPresent(queryInterface, 'Users', 'jobTitle');
    await removeColumnIfPresent(queryInterface, 'Materials', 'lastRestockedAt');
    await removeColumnIfPresent(queryInterface, 'Materials', 'supplierContact');
    await removeColumnIfPresent(queryInterface, 'Materials', 'reorderTargetQty');
    await removeColumnIfPresent(queryInterface, 'ServiceOfferings', 'serviceCtaLabel');
    await removeColumnIfPresent(queryInterface, 'ServiceOfferings', 'summaryLine');
  }
};
