import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomeTaxInterpreter } from './test-helpers.js';

test('catalogue exposes cached country, schedule, currency, and plot-break metadata', () => {
  const interpreter = createIncomeTaxInterpreter();
  const catalogue = interpreter.getCatalogue();
  const uk = catalogue.countries.find(({ id }) => id === 'UK_ex_Scotland');
  const gbp = catalogue.currencies.find(({ code }) => code === 'GBP');

  assert.equal(interpreter.getCatalogue(), catalogue);
  assert.equal(uk.label, 'UK ex Scotland');
  assert.equal(uk.currency, 'GBP');
  assert.ok(uk.scheduleKinds.includes('income_tax'));
  assert.ok(uk.plotBreaks.includes(12_570));
  assert.equal(gbp.eurRate, 1.1499578);
  assert.deepEqual(
    catalogue.countries.map(({ id }) => id).sort(),
    [
      'Australia',
      'Denmark',
      'Germany',
      'Netherlands',
      'New_Zealand',
      'Norway',
      'Scotland',
      'UK_ex_Scotland',
    ]
  );
  assert.deepEqual(
    [...new Set(catalogue.countries.flatMap(({ scheduleKinds }) => scheduleKinds))].sort(),
    ['income_tax', 'loan_repayment', 'religious', 'social_security']
  );
  assert.deepEqual(
    catalogue.currencies.map(({ code }) => code).sort(),
    ['AUD', 'DKK', 'EUR', 'GBP', 'NOK', 'NZD']
  );
});

test('catalogue snapshot and records cannot be mutated', () => {
  const catalogue = createIncomeTaxInterpreter().getCatalogue();
  const country = catalogue.countries[0];

  for (const value of [
    catalogue,
    catalogue.countries,
    catalogue.currencies,
    country,
    country.scheduleKinds,
    country.plotBreaks,
    catalogue.currencies[0],
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => {
    country.label = 'Changed';
  }, TypeError);
  assert.throws(() => {
    country.scheduleKinds.push('changed');
  }, TypeError);
});

test('interpreter and prepared evaluation hide implementation fields', () => {
  const interpreter = createIncomeTaxInterpreter();
  const prepared = interpreter.prepare('UK_ex_Scotland', ['income tax'], 'GBP');

  assert.equal(interpreter.modelByCountry, undefined);
  assert.equal(interpreter.currencyToEur, undefined);
  assert.equal(prepared.generatedCode, undefined);
});
