'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('Estimates', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
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
      createdById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('draft', 'sent', 'approved', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.createTable('EstimateLines', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      estimateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Estimates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      serviceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'ServiceOfferings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      materialId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Materials',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      lineType: {
        type: DataTypes.ENUM('service', 'material', 'custom'),
        allowNull: false,
        defaultValue: 'custom'
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: true
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 1
      },
      unitCost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      lineTotalOverride: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      lineTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.addIndex('Estimates', ['projectId', 'status'], { name: 'estimates_project_status_idx' });
    await queryInterface.addIndex('Estimates', ['quoteId', 'status'], { name: 'estimates_quote_status_idx' });
    await queryInterface.addIndex('Estimates', ['createdById', 'createdAt'], { name: 'estimates_creator_created_idx' });
    await queryInterface.addIndex('EstimateLines', ['estimateId', 'sortOrder'], { name: 'estimate_lines_estimate_order_idx' });
    await queryInterface.addIndex('EstimateLines', ['serviceId'], { name: 'estimate_lines_service_idx' });
    await queryInterface.addIndex('EstimateLines', ['materialId'], { name: 'estimate_lines_material_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('EstimateLines');
    await queryInterface.dropTable('Estimates');
  }
};
