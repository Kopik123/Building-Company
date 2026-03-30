const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_STAGED_PRIORITY,
  DEFAULT_STAGED_WORKFLOW_STATUS,
  canAccessStagedNewQuote,
  getNewQuoteIncludeClient,
  hasNewQuoteStore,
  matchesStagedQuoteFilters,
  toLegacyQuoteSummary
} = require('../../utils/quoteReviewData');

test('quote review data helpers expose staged quote defaults and include config', () => {
  const FakeUser = { modelName: 'User' };
  const include = getNewQuoteIncludeClient(FakeUser);

  assert.equal(DEFAULT_STAGED_WORKFLOW_STATUS, 'submitted');
  assert.equal(DEFAULT_STAGED_PRIORITY, 'medium');
  assert.deepEqual(include, [{
    model: FakeUser,
    as: 'client',
    attributes: ['id', 'name', 'email', 'phone', 'companyName'],
    required: false
  }]);
});

test('quote review data helpers detect staged quote store capabilities', () => {
  assert.equal(hasNewQuoteStore({ findAll() {} }), true);
  assert.equal(hasNewQuoteStore({ create() {} }, 'create'), true);
  assert.equal(hasNewQuoteStore({}, 'findByPk'), false);
  assert.equal(hasNewQuoteStore(null), false);
});

test('quote review data helpers apply staged quote access and filters consistently', () => {
  const stagedQuote = {
    clientId: 'client-1',
    quoteRef: 'LL-M275PU-8487',
    referenceCode: 'LL-M275PU-8487',
    projectType: 'kitchen',
    location: 'Manchester',
    postcode: 'M27 5PU',
    budgetRange: '£8,000-£12,000',
    description: 'Client wants a shaker kitchen and storage wall.',
    client: { name: 'Karol Test', email: 'karol@example.com' }
  };

  assert.equal(canAccessStagedNewQuote(stagedQuote, { id: 'client-1', role: 'client' }), true);
  assert.equal(canAccessStagedNewQuote(stagedQuote, { id: 'client-2', role: 'client' }), false);
  assert.equal(canAccessStagedNewQuote(stagedQuote, { id: 'manager-1', role: 'manager' }), true);

  assert.equal(matchesStagedQuoteFilters(stagedQuote, {}), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { status: 'pending' }), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { status: 'responded' }), false);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { workflowStatus: 'submitted' }), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { workflowStatus: 'assigned' }), false);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { priority: 'medium' }), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { priority: 'high' }), false);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { projectType: 'kitchen' }), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { projectType: 'bathroom' }), false);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { q: 'storage wall' }), true);
  assert.equal(matchesStagedQuoteFilters(stagedQuote, { q: 'rochdale' }), false);
});

test('quote review data helper normalizes legacy quote attachments for manager review payloads', () => {
  const quote = {
    attachmentCount: 99,
    attachments: [
      {
        filename: 'b-image.jpg',
        url: '/uploads/b-image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 200,
        createdAt: '2026-03-30T12:10:00Z'
      },
      {
        filename: 'a-image.jpg',
        url: '/uploads/a-image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        createdAt: '2026-03-30T12:00:00Z'
      }
    ],
    toJSON() {
      return {
        attachmentCount: this.attachmentCount,
        attachments: this.attachments
      };
    }
  };

  const summary = toLegacyQuoteSummary(quote);

  assert.equal(summary.attachmentCount, 99);
  assert.equal(summary.attachments.length, 2);
  assert.deepEqual(summary.attachments[0], {
    name: 'a-image.jpg',
    url: '/uploads/a-image.jpg',
    size: 100,
    mimeType: 'image/jpeg'
  });
  assert.deepEqual(summary.attachments[1], {
    name: 'b-image.jpg',
    url: '/uploads/b-image.jpg',
    size: 200,
    mimeType: 'image/jpeg'
  });
});
