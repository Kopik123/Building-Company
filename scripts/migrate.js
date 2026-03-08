require('dotenv').config();

const { migrator } = require('../db/migrator');

const run = async () => {
  const args = new Set(process.argv.slice(2));
  if (args.has('--status')) {
    const [executed, pending] = await Promise.all([migrator.executed(), migrator.pending()]);
    console.log('Executed migrations:');
    executed.forEach((migration) => console.log(`- ${migration.name}`));
    console.log('Pending migrations:');
    pending.forEach((migration) => console.log(`- ${migration.name}`));
    return;
  }

  const migrations = await migrator.up();
  if (!migrations.length) {
    console.log('No pending migrations.');
    return;
  }

  console.log('Applied migrations:');
  migrations.forEach((migration) => console.log(`- ${migration.name}`));
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration run failed:', error);
    process.exit(1);
  });

