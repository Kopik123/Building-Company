const assert = require('node:assert/strict');
const test = require('node:test');
const { processDeferredFileCleanupQueue } = require('../../utils/deferredFileCleanup');

test('deferred file cleanup worker deletes successful jobs and removes them from the queue', async () => {
  const deletedJobs = [];
  const result = await processDeferredFileCleanupQueue({
    DeferredFileCleanupJob: {
      async findAll() {
        return [{
          id: 'job-1',
          scope: 'staged_new_quote_reject_cleanup',
          files: [{ path: 'uploads/quote-a.jpg', filename: 'quote-a.jpg' }],
          toJSON() {
            return {
              id: 'job-1',
              scope: 'staged_new_quote_reject_cleanup',
              files: [{ path: 'uploads/quote-a.jpg', filename: 'quote-a.jpg' }],
              attempts: 0,
              maxAttempts: 8
            };
          },
          async destroy() {
            deletedJobs.push('job-1');
          }
        }];
      }
    },
    cleanupFiles: async () => ({ deletedCount: 1, failureCount: 0, failures: [] }),
    logger: { warn() {} },
    now: new Date('2026-03-30T00:45:00Z')
  });

  assert.equal(result.processed, 1);
  assert.equal(result.deleted, 1);
  assert.equal(result.retried, 0);
  assert.deepEqual(deletedJobs, ['job-1']);
});

test('deferred file cleanup worker reschedules failed jobs with incremented attempts', async () => {
  const updates = [];
  const result = await processDeferredFileCleanupQueue({
    DeferredFileCleanupJob: {
      async findAll() {
        return [{
          id: 'job-2',
          scope: 'staged_new_quote_reject_cleanup',
          files: [{ path: 'uploads/quote-b.jpg', filename: 'quote-b.jpg' }],
          toJSON() {
            return {
              id: 'job-2',
              scope: 'staged_new_quote_reject_cleanup',
              files: [{ path: 'uploads/quote-b.jpg', filename: 'quote-b.jpg' }],
              attempts: 0,
              maxAttempts: 8,
              entityType: 'new_quote',
              entityId: 'new-quote-2',
              quoteRef: 'LL-M275PU-9002'
            };
          },
          async update(payload) {
            updates.push(payload);
          }
        }];
      }
    },
    cleanupFiles: async () => {
      const error = new Error('EBUSY: file is locked');
      error.failures = [{ target: 'uploads/quote-b.jpg', code: 'EBUSY', message: 'file is locked' }];
      throw error;
    },
    logger: { warn() {} },
    now: new Date('2026-03-30T00:45:00Z')
  });

  assert.equal(result.processed, 1);
  assert.equal(result.deleted, 0);
  assert.equal(result.retried, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].attempts, 1);
  assert.match(String(updates[0].lastError || ''), /EBUSY|file is locked/);
  assert.ok(new Date(updates[0].nextAttemptAt).getTime() > Date.parse('2026-03-30T00:45:00Z'));
});
