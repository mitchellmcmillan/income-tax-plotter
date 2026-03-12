import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomeTaxInterpreter } from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();

test('country models expose numeric literals for forced chart breaks', () => {
  const ukModel = interpreter.modelByCountry.get('uk_ex_scotland');

  assert.ok(ukModel, 'Expected UK ex Scotland country model to exist.');
  assert.ok(Array.isArray(ukModel.numericLiterals), 'Expected numericLiterals to be present.');
  assert.ok(ukModel.numericLiterals.includes(12570), 'Expected personal allowance threshold.');
  assert.ok(ukModel.numericLiterals.includes(50270), 'Expected higher-rate threshold.');
  assert.ok(ukModel.numericLiterals.includes(125140), 'Expected additional-rate threshold.');
  assert.ok(ukModel.numericLiterals.includes(0.2), 'Expected tax rate literal.');
  assert.ok(ukModel.numericLiterals.includes(1.1499578), 'Expected currency conversion literal.');
});
