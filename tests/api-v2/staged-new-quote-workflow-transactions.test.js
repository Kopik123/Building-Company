const assert = require('node:assert/strict');
const test = require('node:test');
const { createStagedNewQuoteWorkflow } = require('../../utils/stagedNewQuoteWorkflow');

const createUserRecord = (payload) => {
  const state = {
    crmLifecycleStatus: 'lead',
    ...payload
  };

  return {
    ...state,
    async update(updatePayload, options) {
      Object.assign(state, updatePayload);
      Object.assign(this, state);
      this.lastUpdateOptions = options || null;
      return this;
    }
  };
};

test('staged new quote workflow accept wraps project conversion writes in one transaction', async () => {
  const transactionCalls = [];
  const transactionRefs = [];
  const client = createUserRecord({ id: 'client-1' });

  const workflow = createStagedNewQuoteWorkflow({
    sequelize: {
      async transaction(handler) {
        const transaction = { id: `tx-${transactionCalls.length + 1}` };
        transactionCalls.push(transaction);
        return handler(transaction);
      }
    },
    Project: {
      async create(payload, options) {
        transactionRefs.push(options?.transaction || null);
        return { id: 'project-1', ...payload };
      }
    },
    ProjectMedia: {
      async bulkCreate(rows, options) {
        transactionRefs.push(options?.transaction || null);
        return rows;
      }
    },
    GroupThread: {
      async create(payload, options) {
        transactionRefs.push(options?.transaction || null);
        return { id: 'thread-1', ...payload };
      }
    },
    GroupMember: {
      async findOrCreate({ transaction }) {
        transactionRefs.push(transaction || null);
        return [{}, true];
      }
    },
    Notification: {
      async create(_payload, options) {
        transactionRefs.push(options?.transaction || null);
        return {};
      }
    },
    User: {
      async findByPk() {
        return client;
      }
    },
    ActivityEvent: {
      async create(_payload, options) {
        transactionRefs.push(options?.transaction || null);
        return {};
      }
    },
    advanceClientLifecycle: async (clientRecord, _nextStatus, options) => {
      transactionRefs.push(options?.transaction || null);
      await clientRecord.update({ crmLifecycleStatus: 'active_project' }, options || undefined);
      return clientRecord;
    },
    createActivityEvent: async (ActivityEvent, payload, _scope, options) => ActivityEvent.create(payload, options),
    cleanupNewQuoteStoredAttachments: async () => {}
  });

  const newQuote = {
    id: 'new-quote-1',
    quoteRef: 'LL-M202AB-1',
    clientId: 'client-1',
    location: 'Manchester',
    description: 'Kitchen refresh',
    budgetRange: 'Â£8,000-Â£12,000',
    projectType: 'kitchen',
    postcode: 'M20 2AB',
    attachments: [{ filename: 'photo.jpg', url: '/uploads/photo.jpg', storagePath: 'uploads/photo.jpg', mimeType: 'image/jpeg', sizeBytes: 128 }],
    async destroy(options) {
      transactionRefs.push(options?.transaction || null);
    }
  };

  await workflow.accept(newQuote, { id: 'manager-1' });

  assert.equal(transactionCalls.length, 1);
  assert.equal(transactionRefs.length > 0, true);
  assert.equal(transactionRefs.every((entry) => entry && entry.id === 'tx-1'), true);
  assert.equal(client.crmLifecycleStatus, 'active_project');
  assert.equal(client.lastUpdateOptions?.transaction?.id, 'tx-1');
});

test('staged new quote workflow reject wraps delete-side DB writes in one transaction', async () => {
  const transactionCalls = [];
  const transactionRefs = [];

  const workflow = createStagedNewQuoteWorkflow({
    sequelize: {
      async transaction(handler) {
        const transaction = { id: `tx-${transactionCalls.length + 1}` };
        transactionCalls.push(transaction);
        return handler(transaction);
      }
    },
    Project: {},
    ProjectMedia: {},
    GroupThread: {},
    GroupMember: {},
    Notification: {
      async create(_payload, options) {
        transactionRefs.push(options?.transaction || null);
        return {};
      }
    },
    User: {},
    ActivityEvent: {
      async create(_payload, options) {
        transactionRefs.push(options?.transaction || null);
        return {};
      }
    },
    advanceClientLifecycle: async () => null,
    createActivityEvent: async (ActivityEvent, payload, _scope, options) => ActivityEvent.create(payload, options)
  });

  const newQuote = {
    id: 'new-quote-2',
    quoteRef: 'LL-LS14AB-2',
    clientId: 'client-1',
    attachments: [],
    async destroy(options) {
      transactionRefs.push(options?.transaction || null);
    }
  };

  const result = await workflow.reject(newQuote, { id: 'manager-1' });

  assert.equal(result?.quoteRef, 'LL-LS14AB-2');
  assert.equal(transactionCalls.length, 1);
  assert.equal(transactionRefs.length > 0, true);
  assert.equal(transactionRefs.every((entry) => entry && entry.id === 'tx-1'), true);
});
