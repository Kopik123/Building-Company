const includesBoundedSegment = (value, startNeedle, endNeedle) => {
  const startIndex = value.indexOf(startNeedle);
  if (startIndex === -1) return false;

  const endIndex = value.indexOf(endNeedle, startIndex + startNeedle.length);
  return endIndex !== -1;
};

const isMissingTableMessage = (message) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('does not exist') ||
    normalized.includes('unknown table') ||
    normalized.includes('no such table') ||
    includesBoundedSegment(normalized, 'relation ', ' does not exist') ||
    includesBoundedSegment(normalized, 'no description found ', ' table')
  );
};

const tableExists = async (queryInterface, tableName) => {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch (error) {
    const message = String(error && error.message ? error.message : '');
    if (isMissingTableMessage(message)) return false;
    throw error;
  }
};

const addIndexIfMissing = async (queryInterface, tableName, indexName, fields, options = {}) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === indexName)) return;
  await queryInterface.addIndex(tableName, fields, { name: indexName, ...options });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, 'SessionRefreshTokens'))) {
      await queryInterface.createTable('SessionRefreshTokens', {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
        userAgent: { type: DataTypes.STRING, allowNull: true },
        ipAddress: { type: DataTypes.STRING, allowNull: true },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        revokedAt: { type: DataTypes.DATE, allowNull: true },
        replacedByTokenId: { type: DataTypes.UUID, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      });
    }

    if (!(await tableExists(queryInterface, 'DevicePushTokens'))) {
      await queryInterface.createTable('DevicePushTokens', {
        id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        platform: { type: DataTypes.ENUM('android', 'ios', 'web'), allowNull: false },
        provider: {
          type: DataTypes.ENUM('fcm', 'apns', 'webpush'),
          allowNull: false,
          defaultValue: 'fcm'
        },
        pushToken: { type: DataTypes.STRING, allowNull: false, unique: true },
        deviceId: { type: DataTypes.STRING, allowNull: true },
        appVersion: { type: DataTypes.STRING, allowNull: true },
        lastSeenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
      });
    }

    await addIndexIfMissing(queryInterface, 'SessionRefreshTokens', 'session_refresh_tokens_user_expires_idx', ['userId', 'expiresAt']);
    await addIndexIfMissing(queryInterface, 'SessionRefreshTokens', 'session_refresh_tokens_revoked_idx', ['revokedAt']);
    await addIndexIfMissing(queryInterface, 'DevicePushTokens', 'device_push_tokens_user_platform_idx', ['userId', 'platform']);

    // Normalize emails and enforce case-insensitive uniqueness.
    await queryInterface.sequelize.query('UPDATE "Users" SET "email" = LOWER(TRIM("email")) WHERE "email" IS NOT NULL');
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON "Users" (LOWER("email"))'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS users_email_lower_unique_idx');

    if (await tableExists(queryInterface, 'DevicePushTokens')) {
      await queryInterface.dropTable('DevicePushTokens');
    }
    if (await tableExists(queryInterface, 'SessionRefreshTokens')) {
      await queryInterface.dropTable('SessionRefreshTokens');
    }
  }
};
