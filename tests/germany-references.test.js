import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomeTaxInterpreter } from './test-helpers.js';

test('Germany references, eval, and fix produce finite prepared outcomes', () => {
  const interpreter = createIncomeTaxInterpreter();
  const withoutChurch = interpreter.prepare(
    'Germany',
    ['income tax', 'social security'],
    'EUR'
  );
  const withChurch = interpreter.prepare(
    'Germany',
    ['income tax', 'social security', 'religious'],
    'EUR'
  );

  for (const income of [0, 10_000, 30_000, 50_000, 100_000, 200_000]) {
    assert.ok(Number.isFinite(withChurch.marginalRate(income)));
    assert.ok(Number.isFinite(withChurch.taxPaid(income)));
  }
  assert.ok(withChurch.taxPaid(100_000) > withoutChurch.taxPaid(100_000));
});
