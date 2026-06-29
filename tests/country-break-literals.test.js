import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomeTaxInterpreter } from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();

test('catalogue exposes semantic chart breaks without unrelated literals', () => {
  const uk = interpreter
    .getCatalogue()
    .countries.find(({ id }) => id === 'UK_ex_Scotland');

  assert.ok(uk, 'Expected UK ex Scotland catalogue entry.');
  assert.ok(uk.plotBreaks.includes(12570), 'Expected personal allowance threshold.');
  assert.ok(uk.plotBreaks.includes(50270), 'Expected higher-rate threshold.');
  assert.ok(uk.plotBreaks.includes(125140), 'Expected additional-rate threshold.');
  assert.ok(!uk.plotBreaks.includes(0.2), 'Did not expect tax rate literal.');
  assert.ok(!uk.plotBreaks.includes(1.1499578), 'Did not expect currency conversion literal.');
});
