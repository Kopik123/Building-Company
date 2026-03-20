require('dotenv').config();

const getMissingDatabaseUrlMessage = () =>
  'DATABASE_URL is required to run migrations. Set it in your shell or local .env before running `npm run migrate` or `npm run migrate:status`.';

const ensureDatabaseUrl = () => {
  if (process.env.DATABASE_URL) return;
  const error = new Error(getMissingDatabaseUrlMessage());
  error.code = 'MISSING_DATABASE_URL';
  throw error;
};

const loadMigrator = () => {
  ensureDatabaseUrl();
  return require('../db/migrator').migrator;
};

const run = async () => {
  const migrator = loadMigrator();
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

module.exports = {
  run,
  ensureDatabaseUrl,
  getMissingDatabaseUrlMessage,
  loadMigrator
};

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error?.code === 'MISSING_DATABASE_URL') {
        console.error(error.message);
        process.exit(1);
      }
      console.error('Migration run failed:', error);
      process.exit(1);
    });
}
