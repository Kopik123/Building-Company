const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'review-diff.js');
const source = fs.readFileSync(scriptPath, 'utf8');

const loadDiffViewer = () => {
  const sandbox = {
    window: {},
    console
  };
  vm.runInNewContext(source, sandbox, { filename: scriptPath });
  return sandbox.window.LevelLinesReviewDiff;
};

test('review diff helper builds stable entry ids from scope, change type and timestamp', () => {
  const diffViewer = loadDiffViewer();
  const entryId = diffViewer.buildEntryId({
    changeType: 'client_review_started',
    createdAt: '2026-03-31T16:20:00.000Z'
  }, 'estimate · Review Pack');

  assert.equal(entryId, 'estimate-review-pack__client_review_started__2026-03-31T16:20:00.000Z');
});

test('review diff helper detects client decision entries from change types and changed fields', () => {
  const diffViewer = loadDiffViewer();

  assert.equal(diffViewer.isClientDecisionEntry({
    changeType: 'client_review_started',
    changedFields: []
  }), true);

  assert.equal(diffViewer.isClientDecisionEntry({
    changeType: 'workflow_updated',
    changedFields: ['clientDecisionStatus']
  }), true);

  assert.equal(diffViewer.isClientDecisionEntry({
    changeType: 'estimate_file_uploaded',
    changedFields: ['documentUrl']
  }), false);
});
