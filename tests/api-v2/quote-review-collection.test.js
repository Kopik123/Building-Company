const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildMergedQuoteReviewCollection,
  getQuoteReviewTimestamp,
  loadQuoteReviewRecordById,
  paginateQuoteReviewCollection,
  sortQuoteReviewRecords
} = require('../../utils/quoteReviewCollection');

test('quote review collection helper sorts by updatedAt or createdAt descending', () => {
  const records = [
    { id: 'old', createdAt: '2026-03-30T08:00:00Z' },
    { id: 'new', updatedAt: '2026-03-30T10:00:00Z' },
    { id: 'mid', createdAt: '2026-03-30T09:00:00Z' }
  ];

  assert.equal(getQuoteReviewTimestamp(records[1]) > getQuoteReviewTimestamp(records[0]), true);
  assert.deepEqual(sortQuoteReviewRecords(records).map((record) => record.id), ['new', 'mid', 'old']);
});

test('quote review collection helper merges legacy and staged records with staged filters', () => {
  const merged = buildMergedQuoteReviewCollection({
    legacyRecords: [
      { id: 'legacy-1', updatedAt: '2026-03-30T08:00:00Z' },
      { id: 'legacy-2', updatedAt: '2026-03-30T11:00:00Z' }
    ],
    stagedRecords: [
      { id: 'staged-keep', updatedAt: '2026-03-30T10:00:00Z', keep: true },
      { id: 'staged-drop', updatedAt: '2026-03-30T12:00:00Z', keep: false }
    ],
    mapLegacyRecord: (record) => ({ ...record, type: 'legacy' }),
    mapStagedRecord: (record) => ({ ...record, type: 'staged' }),
    includeStagedRecord: (summary) => summary.keep === true
  });

  assert.deepEqual(merged.map((record) => `${record.type}:${record.id}`), [
    'legacy:legacy-2',
    'staged:staged-keep',
    'legacy:legacy-1'
  ]);
});

test('quote review collection helper paginates without mutating the merged array', () => {
  const records = [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];

  const paged = paginateQuoteReviewCollection(records, { offset: 1, pageSize: 1 });
  assert.deepEqual(paged.map((record) => record.id), ['2']);
  assert.deepEqual(records.map((record) => record.id), ['1', '2', '3']);
});

test('quote review collection helper loads legacy first and falls back to staged detail', async () => {
  const legacyResult = await loadQuoteReviewRecordById({
    id: 'quote-1',
    loadLegacyRecord: async (id) => ({ id, layer: 'legacy' }),
    loadStagedRecord: async () => ({ id: 'quote-1', layer: 'staged' }),
    mapLegacyRecord: (record) => ({ ...record, mapped: true }),
    mapStagedRecord: (record) => ({ ...record, mapped: true })
  });

  assert.equal(legacyResult.kind, 'legacy');
  assert.deepEqual(legacyResult.quote, { id: 'quote-1', layer: 'legacy', mapped: true });

  const stagedResult = await loadQuoteReviewRecordById({
    id: 'quote-2',
    loadLegacyRecord: async () => null,
    loadStagedRecord: async (id) => ({ id, layer: 'staged' }),
    mapStagedRecord: (record) => ({ ...record, mapped: true })
  });

  assert.equal(stagedResult.kind, 'staged');
  assert.deepEqual(stagedResult.quote, { id: 'quote-2', layer: 'staged', mapped: true });
});
