const getQuoteReviewTimestamp = (record) => Date.parse(record?.updatedAt || record?.createdAt || 0) || 0;

const sortQuoteReviewRecords = (records) =>
  [...(Array.isArray(records) ? records : [])].sort((left, right) => getQuoteReviewTimestamp(right) - getQuoteReviewTimestamp(left));

const buildMergedQuoteReviewCollection = ({
  legacyRecords = [],
  stagedRecords = [],
  mapLegacyRecord = (record) => record,
  mapStagedRecord = (record) => record,
  includeStagedRecord = () => true
} = {}) => {
  const merged = [...(Array.isArray(legacyRecords) ? legacyRecords : []).map((record) => mapLegacyRecord(record))];

  (Array.isArray(stagedRecords) ? stagedRecords : []).forEach((record) => {
    const summary = mapStagedRecord(record);
    if (includeStagedRecord(summary, record)) {
      merged.push(summary);
    }
  });

  return sortQuoteReviewRecords(merged);
};

const paginateQuoteReviewCollection = (records, { offset = 0, pageSize = 25 } = {}) =>
  [...(Array.isArray(records) ? records : [])].slice(offset, offset + pageSize);

const loadQuoteReviewRecordById = async ({
  id,
  loadLegacyRecord,
  loadStagedRecord,
  mapLegacyRecord = (record) => record,
  mapStagedRecord = (record) => record
}) => {
  const legacyRecord = typeof loadLegacyRecord === 'function' ? await loadLegacyRecord(id) : null;
  if (legacyRecord) {
    return {
      kind: 'legacy',
      source: legacyRecord,
      quote: mapLegacyRecord(legacyRecord)
    };
  }

  const stagedRecord = typeof loadStagedRecord === 'function' ? await loadStagedRecord(id) : null;
  if (!stagedRecord) return null;

  return {
    kind: 'staged',
    source: stagedRecord,
    quote: mapStagedRecord(stagedRecord)
  };
};

module.exports = {
  buildMergedQuoteReviewCollection,
  getQuoteReviewTimestamp,
  loadQuoteReviewRecordById,
  paginateQuoteReviewCollection,
  sortQuoteReviewRecords
};
