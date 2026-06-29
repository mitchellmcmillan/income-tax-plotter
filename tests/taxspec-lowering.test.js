import test from 'node:test';
import { assertApproxEqual, createIncomeTaxInterpreter } from './test-helpers.js';

test('prepared and direct execution match for every catalogue country', () => {
  const interpreter = createIncomeTaxInterpreter();

  for (const country of interpreter.getCatalogue().countries) {
    const prepared = interpreter.prepare(country.id, null, country.currency);
    for (const income of [0, 1, 10_000, 100_000, 1_000_000]) {
      assertApproxEqual(
        prepared.marginalRate(income),
        interpreter.marginalRate(country.id, null, country.currency, income),
        1e-3,
        `${country.id} marginal at ${income}`
      );
      assertApproxEqual(
        prepared.overallRate(income),
        interpreter.overallRate(country.id, null, country.currency, income),
        1e-3,
        `${country.id} overall at ${income}`
      );
    }
  }
});
