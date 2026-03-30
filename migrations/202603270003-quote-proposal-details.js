module.exports = {
  async up(queryInterface, Sequelize) {
    const quotesTable = await queryInterface.describeTable('Quotes').catch(() => null);
    if (!quotesTable || Object.hasOwn(quotesTable, 'proposalDetails')) {
      return;
    }

    await queryInterface.addColumn('Quotes', 'proposalDetails', {
      type: Sequelize.DataTypes ? Sequelize.DataTypes.JSON : Sequelize.JSON,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const quotesTable = await queryInterface.describeTable('Quotes').catch(() => null);
    if (!quotesTable || !Object.hasOwn(quotesTable, 'proposalDetails')) {
      return;
    }

    await queryInterface.removeColumn('Quotes', 'proposalDetails');
  }
};
