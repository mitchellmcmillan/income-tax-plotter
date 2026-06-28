import assert from 'node:assert/strict';
import test from 'node:test';
import { assertApproxEqual, createIncomeTaxInterpreter } from './test-helpers.js';

test('lowered TaxSpec model is parser-independent and preserves generated execution', () => {
  const interpreter = createIncomeTaxInterpreter();

  for (const country of interpreter.modelByCountry.values()) {
    for (const component of country.components) {
      assert.equal(
        component.body?.constructor,
        Object,
        `${country.countryName}.${component.componentName} leaked a parser context`
      );
    }

    const prepared = interpreter.prepare(country.countryName, null, country.currency);
    for (const income of [0, 1, 10_000, 100_000, 1_000_000]) {
      assertApproxEqual(
        prepared.marginalRate(income),
        interpreter.marginalRate(country.countryName, null, country.currency, income),
        1e-3,
        `${country.countryName} marginal at ${income}`
      );
      assertApproxEqual(
        prepared.overallRate(income),
        interpreter.overallRate(country.countryName, null, country.currency, income),
        1e-3,
        `${country.countryName} overall at ${income}`
      );
    }
  }
});
