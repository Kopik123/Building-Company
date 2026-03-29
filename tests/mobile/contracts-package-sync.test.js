const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..', '..');
const stripBanner = (value) => value.replace(/^\/\/ Generated[^\r\n]*(?:\r?\n)\/\/ Do not edit[^\r\n]*(?:\r?\n)/, '');

const compareGeneratedFile = (sourceRelative, generatedRelative) => {
  const source = fs.readFileSync(path.join(rootDir, sourceRelative), 'utf8');
  const generated = fs.readFileSync(path.join(rootDir, generatedRelative), 'utf8');
  assert.equal(stripBanner(generated), source);
};

test('generated contracts package stays in sync with shared contract source', () => {
  compareGeneratedFile('shared/contracts/v2.js', 'packages/contracts-v2/index.js');
  compareGeneratedFile('shared/contracts/v2.d.ts', 'packages/contracts-v2/index.d.ts');
});
