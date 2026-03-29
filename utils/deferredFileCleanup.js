const { Op } = require('sequelize');
const { cleanupUploadedFiles } = require('./quoteAttachments');

const DEFAULT_DEFERRED_FILE_CLEANUP_SCOPE = 'staged_new_quote_reject_cleanup';
const DEFAULT_RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000, 12 * 60 * 60 * 1000, 24 * 60 * 60 * 1000];
const DEFAULT_MAX_ATTEMPTS = 8;

const summarizeCleanupError = (error) => {
  const primaryMessage = error?.message || String(error);
  const failureMessage = Array.isArray(error?.failures) && error.failures.length
    ? error.failures.map((entry) => `${entry.target || 'unknown'}${entry.code ? ` [${entry.code}]` : ''}`).join('; ')
    : '';
  return failureMessage ? `${primaryMessage} :: ${failureMessage}` : primaryMessage;
};

const computeNextAttemptAt = (attempts, now = new Date()) => {
  const safeAttempts = Math.max(1, Number(attempts) || 1);
  const delay = DEFAULT_RETRY_DELAYS_MS[Math.min(DEFAULT_RETRY_DELAYS_MS.length - 1, safeAttempts - 1)];
  return new Date(now.getTime() + delay);
};

const queueDeferredFileCleanup = async (DeferredFileCleanupJob, payload, options = null) => {
  if (typeof DeferredFileCleanupJob?.create !== 'function') {
    return null;
  }

  const files = Array.isArray(payload?.files) ? payload.files.filter(Boolean) : [];
  if (!files.length) {
    return null;
  }

  return DeferredFileCleanupJob.create({
    scope: payload?.scope || DEFAULT_DEFERRED_FILE_CLEANUP_SCOPE,
    entityType: payload?.entityType || null,
    entityId: payload?.entityId || null,
    quoteRef: payload?.quoteRef || null,
    files,
    attempts: Number.isFinite(Number(payload?.attempts)) ? Number(payload.attempts) : 0,
    maxAttempts: Number.isFinite(Number(payload?.maxAttempts)) ? Number(payload.maxAttempts) : DEFAULT_MAX_ATTEMPTS,
    lastError: payload?.lastError || null,
    nextAttemptAt: payload?.nextAttemptAt || new Date()
  }, options || undefined);
};

const isMissingCleanupTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('deferred_file_cleanup_jobs') && (message.includes('does not exist') || message.includes('no such table'));
};

const processDeferredFileCleanupQueue = async ({
  DeferredFileCleanupJob,
  cleanupFiles = cleanupUploadedFiles,
  logger = console,
  limit = 10,
  now = new Date()
} = {}) => {
  if (typeof DeferredFileCleanupJob?.findAll !== 'function') {
    return { processed: 0, deleted: 0, retried: 0, missingTable: false };
  }

  let jobs = [];
  try {
    jobs = await DeferredFileCleanupJob.findAll({
      where: {
        nextAttemptAt: { [Op.lte]: now }
      },
      order: [['nextAttemptAt', 'ASC']],
      limit
    });
  } catch (error) {
    if (isMissingCleanupTableError(error)) {
      return { processed: 0, deleted: 0, retried: 0, missingTable: true };
    }
    throw error;
  }

  let deleted = 0;
  let retried = 0;

  for (const job of jobs) {
    const plain = job && typeof job.toJSON === 'function' ? job.toJSON() : { ...(job || {}) };
    try {
      await cleanupFiles(plain.files, { throwOnError: true });
      if (typeof job.destroy === 'function') {
        await job.destroy();
      }
      deleted += 1;
    } catch (error) {
      const nextAttempts = Math.max(1, Number(plain.attempts || 0) + 1);
      const nextAttemptAt = computeNextAttemptAt(nextAttempts, now);
      if (typeof job.update === 'function') {
        await job.update({
          attempts: nextAttempts,
          lastError: summarizeCleanupError(error),
          nextAttemptAt
        });
      }

      logger.warn('Deferred file cleanup retry failed:', {
        jobId: plain.id || null,
        scope: plain.scope || DEFAULT_DEFERRED_FILE_CLEANUP_SCOPE,
        entityType: plain.entityType || null,
        entityId: plain.entityId || null,
        quoteRef: plain.quoteRef || null,
        attempts: nextAttempts,
        maxAttempts: plain.maxAttempts || DEFAULT_MAX_ATTEMPTS,
        message: error?.message || String(error)
      });
      retried += 1;
    }
  }

  return {
    processed: jobs.length,
    deleted,
    retried,
    missingTable: false
  };
};

const startDeferredFileCleanupWorker = ({
  DeferredFileCleanupJob,
  cleanupFiles = cleanupUploadedFiles,
  logger = console,
  intervalMs = 60 * 1000,
  limit = 10
} = {}) => {
  let running = false;
  let missingTableLogged = false;

  const tick = async () => {
    if (running) {
      return { skipped: true };
    }

    running = true;
    try {
      const result = await processDeferredFileCleanupQueue({
        DeferredFileCleanupJob,
        cleanupFiles,
        logger,
        limit,
        now: new Date()
      });

      if (result?.missingTable) {
        if (!missingTableLogged) {
          logger.warn('Deferred file cleanup queue is not available yet; skipping retry worker until the table exists.');
          missingTableLogged = true;
        }
        return result;
      }

      missingTableLogged = false;
      return result;
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, Math.max(5_000, Number(intervalMs) || 60_000));

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  void tick();

  return {
    stop() {
      clearInterval(timer);
    },
    tick
  };
};

module.exports = {
  DEFAULT_DEFERRED_FILE_CLEANUP_SCOPE,
  computeNextAttemptAt,
  summarizeCleanupError,
  queueDeferredFileCleanup,
  processDeferredFileCleanupQueue,
  startDeferredFileCleanupWorker
};
