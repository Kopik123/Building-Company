const assert = require('node:assert/strict');
const test = require('node:test');
const { buildQuoteReferenceBase, resolveQuoteReferenceCode } = require('../../utils/quoteReference');

test('buildQuoteReferenceBase uses postcode and phone digits for a friendly code', () => {
  assert.equal(
    buildQuoteReferenceBase({
      postcode: 'M27 5PU',
      guestPhone: '07395448487'
    }),
    'LL-M275PU-8487'
  );
});

test('resolveQuoteReferenceCode appends a sequence suffix when a duplicate contact/location path already exists', async () => {
  const Quote = {
    async count() {
      return 2;
    }
  };

  const referenceCode = await resolveQuoteReferenceCode(Quote, {
    postcode: 'M27 5PU',
    guestPhone: '07395448487',
    createdAt: '2026-03-29T18:10:00.000Z'
  });

  assert.equal(referenceCode, 'LL-M275PU-8487-2');
});
