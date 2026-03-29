const assert = require('node:assert/strict');
const test = require('node:test');
const { createStagedNewQuoteWorkflow } = require('../../utils/stagedNewQuoteWorkflow');

const createTransactionHarness = () => ({
  async transaction(handler) {
    return handler({ id: 'tx-1' });
  }
});

test('staged new quote reject queues deferred cleanup when file deletion fails after commit', async () => {
  const queuedJobs = [];
  const workflow = createStagedNewQuoteWorkflow({
    sequelize: createTransactionHarness(),
    Project: {},
    ProjectMedia: {},
    GroupThread: {},
    GroupMember: {},
    Notification: {
      async create() {
        return {};
      }
    },
    User: {},
    ActivityEvent: {
      async create() {
        return {};
      }
    },
    DeferredFileCleanupJob: {
      async create(payload) {
        queuedJobs.push(payload);
        return { id: 'cleanup-job-1', ...payload };
      }
    },
    advanceClientLifecycle: async () => null,
    createActivityEvent: async (ActivityEvent, payload, _scope, options) => ActivityEvent.create(payload, options),
    cleanupNewQuoteStoredAttachments: async () => {
      const error = new Error('EPERM: file is locked');
      error.failures = [{ target: 'uploads/reject-a.jpg', code: 'EPERM', message: 'file is locked' }];
      throw error;
    }
  });

  const newQuote = {
    id: 'new-quote-1',
    quoteRef: 'LL-M275PU-9001',
    clientId: 'client-1',
    attachments: [
      { storagePath: 'uploads/reject-a.jpg', filename: 'reject-a.jpg' }
    ],
    async destroy() {
      return null;
    }
  };

  const result = await workflow.reject(newQuote, { id: 'manager-1' });

  assert.equal(result.quoteRef, 'LL-M275PU-9001');
  assert.equal(queuedJobs.length, 1);
  assert.equal(queuedJobs[0].scope, 'staged_new_quote_reject_cleanup');
  assert.equal(queuedJobs[0].entityType, 'new_quote');
  assert.equal(queuedJobs[0].entityId, 'new-quote-1');
  assert.equal(queuedJobs[0].quoteRef, 'LL-M275PU-9001');
  assert.equal(Array.isArray(queuedJobs[0].files), true);
  assert.equal(queuedJobs[0].files.length, 1);
  assert.match(String(queuedJobs[0].lastError || ''), /EPERM|file is locked/);
});

test('staged new quote reject does not queue deferred cleanup when attachments delete successfully', async () => {
  const queuedJobs = [];
  const workflow = createStagedNewQuoteWorkflow({
    sequelize: createTransactionHarness(),
    Project: {},
    ProjectMedia: {},
    GroupThread: {},
    GroupMember: {},
    Notification: {
      async create() {
        return {};
      }
    },
    User: {},
    ActivityEvent: {
      async create() {
        return {};
      }
    },
    DeferredFileCleanupJob: {
      async create(payload) {
        queuedJobs.push(payload);
        return payload;
      }
    },
    advanceClientLifecycle: async () => null,
    createActivityEvent: async (ActivityEvent, payload, _scope, options) => ActivityEvent.create(payload, options),
    cleanupNewQuoteStoredAttachments: async () => ({ deletedCount: 1, failureCount: 0, failures: [] })
  });

  await workflow.reject({
    id: 'new-quote-2',
    quoteRef: 'LL-M275PU-9002',
    clientId: 'client-1',
    attachments: [{ storagePath: 'uploads/reject-b.jpg', filename: 'reject-b.jpg' }],
    async destroy() {
      return null;
    }
  }, { id: 'manager-1' });

  assert.equal(queuedJobs.length, 0);
});
