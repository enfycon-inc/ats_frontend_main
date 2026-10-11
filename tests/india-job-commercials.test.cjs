const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatIndiaAmount, normalizeAmount, indiaBudget } = require('../lib/india-job-commercials.ts');

test('monthly budgets use Indian comma grouping and preserve decimal input', () => {
  assert.equal(formatIndiaAmount('50000'), '50,000');
  assert.equal(formatIndiaAmount('150000'), '1,50,000');
  assert.equal(formatIndiaAmount('150000.50'), '1,50,000.50');
  assert.equal(formatIndiaAmount('50000.'), '50,000.');
  assert.equal(formatIndiaAmount(''), '');
});

test('formatted input serializes to normalized distinct monthly bounds', () => {
  assert.equal(normalizeAmount(' 1,50,000 '), '150000');
  assert.equal(indiaBudget('50,000', '60,000', 'Contract'), 'INR - 50000 to 60000 /mo');
  assert.equal(indiaBudget('50000', '', 'C2H'), 'INR - 50000 /mo');
  assert.equal(indiaBudget('50000', '50000.00', 'Freelance'), 'INR - 50000 /mo');
});

test('permanent budgets retain LPA decimals', () => {
  assert.equal(indiaBudget('10.5', '15.25', 'Full Time'), 'INR - 10.5 to 15.25 LPA');
});

test('invalid and reversed ranges are rejected and empty drafts remain empty', () => {
  assert.equal(indiaBudget('', '', 'Contract'), '');
  for (const [min, max] of [['60000', '50000'], ['-1', '10'], ['100', 'abc'], ['1e5', '200000']]) {
    assert.throws(() => indiaBudget(min, max, 'Contract'));
  }
});
