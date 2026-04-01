const assert = require('node:assert/strict');
const test = require('node:test');

const createContactRouter = require('../routes/contact.js');

test('contact email validation accepts a normal address', () => {
  assert.equal(createContactRouter.isValidContactEmail('olivia.reed@example.com'), true);
});

test('contact email validation rejects malformed and oversized inputs without regex backtracking', () => {
  assert.equal(createContactRouter.isValidContactEmail('missing-at.example.com'), false);
  assert.equal(createContactRouter.isValidContactEmail('olivia@@example.com'), false);
  assert.equal(createContactRouter.isValidContactEmail('olivia@example'), false);
  assert.equal(createContactRouter.isValidContactEmail(`name@${'a'.repeat(250)}.com`), false);
  assert.equal(createContactRouter.isValidContactEmail(`name@${'a'.repeat(50)}..com`), false);
});
