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
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'DevicePushTokens'))) {
      return;
    }

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'enum_DevicePushTokens_provider'
          ) THEN
            ALTER TYPE "enum_DevicePushTokens_provider" ADD VALUE IF NOT EXISTS 'expo';
          END IF;
        END $$;
      `);
    }

    await queryInterface.changeColumn('DevicePushTokens', 'provider', {
      type: Sequelize.DataTypes ? Sequelize.DataTypes.ENUM('fcm', 'apns', 'webpush', 'expo') : Sequelize.ENUM('fcm', 'apns', 'webpush', 'expo'),
      allowNull: false,
      defaultValue: 'expo'
    });

    await addColumnIfMissing(queryInterface, 'DevicePushTokens', 'appVariant', {
      type: Sequelize.DataTypes ? Sequelize.DataTypes.STRING : Sequelize.STRING,
      allowNull: false,
      defaultValue: 'client'
    });

    await addColumnIfMissing(queryInterface, 'DevicePushTokens', 'deviceName', {
      type: Sequelize.DataTypes ? Sequelize.DataTypes.STRING : Sequelize.STRING,
      allowNull: true
    });

    if (dialect === 'postgres' && (await columnExists(queryInterface, 'DevicePushTokens', 'appVariant'))) {
      await queryInterface.sequelize.query(`
        UPDATE "DevicePushTokens" AS token
        SET "appVariant" = CASE
          WHEN LOWER(COALESCE("Users"."role"::text, 'client')) = 'client' THEN 'client'
          ELSE 'company'
        END
        FROM "Users"
        WHERE token."userId" = "Users"."id";
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'DevicePushTokens'))) {
      return;
    }

    await removeColumnIfPresent(queryInterface, 'DevicePushTokens', 'deviceName');
    await removeColumnIfPresent(queryInterface, 'DevicePushTokens', 'appVariant');

    await queryInterface.changeColumn('DevicePushTokens', 'provider', {
      type: Sequelize.DataTypes ? Sequelize.DataTypes.ENUM('fcm', 'apns', 'webpush', 'expo') : Sequelize.ENUM('fcm', 'apns', 'webpush', 'expo'),
      allowNull: false,
      defaultValue: 'fcm'
    });
  }
};