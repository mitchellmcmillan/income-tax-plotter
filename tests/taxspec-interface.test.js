import assert from 'node:assert/strict';
import test from 'node:test';
import TaxSpec from '../src/TaxSpec.js';

test('TaxSpec exposes catalogue and prepared outcomes only', () => {
  const taxSpec = new TaxSpec(`
Testland (EUR) {
  Tax : income_tax = { 0.2 * x };
}`);

  assert.deepEqual(
    Object.getOwnPropertyNames(TaxSpec.prototype)
      .filter((name) => name === 'marginalRate' || name === 'overallRate'),
    []
  );
  assert.equal(taxSpec.prepare('Testland', ['income_tax'], 'EUR').taxPaid(100), 20);
});

test('unsupported compilation fails descriptively without fallback', () => {
  const taxSpec = new TaxSpec(`
Testland (EUR) {
  Tax : income_tax = { unsupported(x) };
}`);

  assert.throws(
    () => taxSpec.prepare('Testland', ['income_tax'], 'EUR'),
    /Failed to compile TaxSpec for Testland: Unsupported function: unsupported/
  );
});
