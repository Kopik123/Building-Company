'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('GroupThreads', 'projectId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Projects',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.sequelize.query(`
      UPDATE "GroupThreads" AS gt
      SET "projectId" = p."id"
      FROM "Projects" AS p
      WHERE gt."quoteId" IS NOT NULL
        AND p."quoteId" = gt."quoteId"
        AND gt."projectId" IS NULL
    `);

    await queryInterface.addIndex('GroupThreads', ['projectId'], {
      name: 'group_threads_project_idx'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('GroupThreads', 'group_threads_project_idx');
    await queryInterface.removeColumn('GroupThreads', 'projectId');
  }
};
