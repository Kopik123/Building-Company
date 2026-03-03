require('dotenv').config();
const { Sequelize } = require('sequelize');

<<<<<<< HEAD
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
=======
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false
>>>>>>> d02f614 (email)
});

module.exports = sequelize;
