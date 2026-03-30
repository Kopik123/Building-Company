const assert = require('node:assert/strict');
const test = require('node:test');

const { loadAccessibleQuoteReviewRecord } = require('../../utils/quoteReviewLookup');

test('quote review lookup returns accessible legacy records before staged fallback', async () => {
  const result = await loadAccessibleQuoteReviewRecord({
    id: 'quote-1',
    user: { id: 'client-1', role: 'client' },
    loadLegacyQuote: async (id) => ({ id, clientId: 'client-1' }),
    loadStagedQuote: async () => ({ id: 'quote-1', clientId: 'client-1' }),
    canAccessLegacyQuote: (record, user) => record.clientId === user.id,
    canAccessStagedQuote: () => true
  });

  assert.equal(result.kind, 'legacy');
  assert.equal(result.isLegacy, true);
  assert.equal(result.isStaged, false);
  assert.deepEqual(result.record, { id: 'quote-1', clientId: 'client-1' });
});

test('quote review lookup falls back to staged records when no legacy quote exists', async () => {
  const result = await loadAccessibleQuoteReviewRecord({
    id: 'quote-2',
    user: { id: 'manager-1', role: 'manager' },
    loadLegacyQuote: async () => null,
    loadStagedQuote: async (id) => ({ id, clientId: 'client-1' }),
    canAccessLegacyQuote: () => true,
    canAccessStagedQuote: () => true
  });

  assert.equal(result.kind, 'staged');
  assert.equal(result.isLegacy, false);
  assert.equal(result.isStaged, true);
  assert.deepEqual(result.record, { id: 'quote-2', clientId: 'client-1' });
});

test('quote review lookup returns null when access is denied or no record exists', async () => {
  const denied = await loadAccessibleQuoteReviewRecord({
    id: 'quote-3',
    user: { id: 'client-2', role: 'client' },
    loadLegacyQuote: async (id) => ({ id, clientId: 'client-1' }),
    loadStagedQuote: async () => null,
    canAccessLegacyQuote: (record, user) => record.clientId === user.id,
    canAccessStagedQuote: () => true
  });

  assert.equal(denied, null);

  const missing = await loadAccessibleQuoteReviewRecord({
    id: 'quote-4',
    user: { id: 'manager-1', role: 'manager' },
    loadLegacyQuote: async () => null,
    loadStagedQuote: async () => null,
    canAccessLegacyQuote: () => true,
    canAccessStagedQuote: () => true
  });

  assert.equal(missing, null);
});
