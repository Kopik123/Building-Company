const findExistingTable = async (queryInterface, candidates) => {
  for (const tableName of candidates) {
    try {
      // describeTable throws when table does not exist
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.describeTable(tableName);
      return tableName;
    } catch (error) {
      const message = String(error && error.message ? error.message : '');
      if (!/does not exist|unknown table|relation .* does not exist/i.test(message)) {
        throw error;
      }
    }
  }
  return null;
};

const resolveColumnName = (tableDefinition, desired) => {
  const keys = Object.keys(tableDefinition || {});
  const exact = keys.find((key) => key === desired);
  if (exact) return exact;
  const normalized = String(desired).toLowerCase();
  return keys.find((key) => String(key).toLowerCase() === normalized) || null;
};

const quoteIdentifier = (queryInterface, value) => {
  if (typeof queryInterface.quoteIdentifier === 'function') {
    return queryInterface.quoteIdentifier(value);
  }

  if (typeof queryInterface.queryGenerator?.quoteIdentifier === 'function') {
    return queryInterface.queryGenerator.quoteIdentifier(value);
  }

  throw new TypeError('No quoteIdentifier function available on queryInterface');
};

const quoteTable = (queryInterface, tableName) => {
  if (typeof queryInterface.quoteTable === 'function') {
    return queryInterface.quoteTable(tableName);
  }

  if (typeof queryInterface.queryGenerator?.quoteTable === 'function') {
    return queryInterface.queryGenerator.quoteTable(tableName);
  }

  throw new TypeError('No quoteTable function available on queryInterface');
};

const supportsTrigramIndexes = (queryInterface) => {
  const dialect = typeof queryInterface?.sequelize?.getDialect === 'function'
    ? queryInterface.sequelize.getDialect()
    : 'postgres';
  return dialect === 'postgres';
};

const addTrigramIndexIfPossible = async (queryInterface, tableName, tableDefinition, columnName, indexName) => {
  if (!supportsTrigramIndexes(queryInterface)) return;

  const resolvedColumn = resolveColumnName(tableDefinition, columnName);
  if (!resolvedColumn) return;

  const quotedIndex = quoteIdentifier(queryInterface, indexName);
  const quotedTable = quoteTable(queryInterface, tableName);
  const quotedColumn = quoteIdentifier(queryInterface, resolvedColumn);
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS ${quotedIndex} ON ${quotedTable} USING gin (LOWER(${quotedColumn}) gin_trgm_ops)`
  );
};

module.exports = {
  up: async (queryInterface) => {
    if (!supportsTrigramIndexes(queryInterface)) {
      return;
    }

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    const projectsTable = await findExistingTable(queryInterface, ['Projects', 'projects']);
    if (projectsTable) {
      const projectColumns = await queryInterface.describeTable(projectsTable);
      await addTrigramIndexIfPossible(queryInterface, projectsTable, projectColumns, 'title', 'projects_title_trgm_idx');
      await addTrigramIndexIfPossible(queryInterface, projectsTable, projectColumns, 'location', 'projects_location_trgm_idx');
      await addTrigramIndexIfPossible(queryInterface, projectsTable, projectColumns, 'description', 'projects_description_trgm_idx');
    }

    const servicesTable = await findExistingTable(queryInterface, ['ServiceOfferings', 'service_offerings']);
    if (servicesTable) {
      const serviceColumns = await queryInterface.describeTable(servicesTable);
      await addTrigramIndexIfPossible(
        queryInterface,
        servicesTable,
        serviceColumns,
        'title',
        'service_offerings_title_trgm_idx'
      );
      await addTrigramIndexIfPossible(
        queryInterface,
        servicesTable,
        serviceColumns,
        'slug',
        'service_offerings_slug_trgm_idx'
      );
      await addTrigramIndexIfPossible(
        queryInterface,
        servicesTable,
        serviceColumns,
        'shortDescription',
        'service_offerings_short_description_trgm_idx'
      );
    }

    const materialsTable = await findExistingTable(queryInterface, ['Materials', 'materials']);
    if (materialsTable) {
      const materialColumns = await queryInterface.describeTable(materialsTable);
      await addTrigramIndexIfPossible(queryInterface, materialsTable, materialColumns, 'name', 'materials_name_trgm_idx');
      await addTrigramIndexIfPossible(queryInterface, materialsTable, materialColumns, 'sku', 'materials_sku_trgm_idx');
      await addTrigramIndexIfPossible(
        queryInterface,
        materialsTable,
        materialColumns,
        'supplier',
        'materials_supplier_trgm_idx'
      );
    }
  },

  down: async (queryInterface) => {
    if (!supportsTrigramIndexes(queryInterface)) {
      return;
    }

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS projects_title_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS projects_location_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS projects_description_trgm_idx');

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS service_offerings_title_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS service_offerings_slug_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS service_offerings_short_description_trgm_idx');

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS materials_name_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS materials_sku_trgm_idx');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS materials_supplier_trgm_idx');
  }
};
