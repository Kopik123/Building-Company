# Deferred Staged Quote Attachment Cleanup Wave 35

## Summary
- Goal: add a durable retry path for staged `new_quotes` attachment deletion after reject, so failed file cleanup no longer disappears into logs.
- Scope: attachment cleanup helpers, staged reject workflow, a persisted cleanup queue, a lightweight runtime worker, regression tests and repo bookkeeping.
- Constraints: keep reject DB state committed first, preserve the current `reject => delete staged row` business rule, and avoid blocking app start when the cleanup queue table is not available yet.

## Key Changes
- Added a persisted `deferred_file_cleanup_jobs` model + migration to store retryable file-deletion work for rejected staged quotes.
- Upgraded staged reject cleanup so it now detects real deletion failures, enqueues a deferred retry job, and leaves a durable trail instead of only logging a warning.
- Added a lightweight runtime cleanup worker that drains due jobs on an interval and reschedules failures with backoff.
- Added targeted tests for reject-side deferred enqueue and for the worker success/retry behavior.

## Test Plan
- Automated: `node --check` for touched runtime files, `node --test tests/api-v2/staged-new-quote-deferred-cleanup.test.js`, `node --test tests/api-v2/deferred-file-cleanup-worker.test.js`, `node --test tests/api-v2/staged-new-quote-workflow-transactions.test.js`, `node --test tests/api-v2/new-quotes-staging.test.js`, `node --test tests/api-v2/manager-staged-new-quotes-review.test.js`.
- Manual: after deploy, reject a staged quote with attachments and inspect `pm2 logs building-company` for deferred-cleanup worker activity if file deletion cannot happen immediately.

## Assumptions
- A lightweight in-process worker is sufficient for the current single-process PM2 runtime.
- Local server storage remains the active attachment store for staged quotes in this wave.
- Deferred cleanup should retry with backoff rather than block or roll back the already-committed reject flow.
