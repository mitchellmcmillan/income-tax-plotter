import assert from 'node:assert/strict';
import test from 'node:test';
import TaxSpecInterpreter from '../src/TaxSpecInterpreter.js';
import { assertApproxEqual, createIncomeTaxInterpreter } from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();

test('prepared annual evaluation exposes rates, tax paid, and net pay', () => {
  const prepared = interpreter.prepare(
    'UK_ex_Scotland',
    ['income tax'],
    'GBP'
  );
  const income = 100_000;
  const overallRate = prepared.overallRate(income);

  assert.equal(typeof prepared.marginalRate, 'function');
  assert.equal(typeof prepared.overallRate, 'function');
  assert.equal(typeof prepared.taxPaid, 'function');
  assert.equal(typeof prepared.netPay, 'function');
  assertApproxEqual(prepared.taxPaid(income), overallRate * income);
  assertApproxEqual(prepared.netPay(income), income - prepared.taxPaid(income));
});

test('prepared evaluation exposes semantic breaks in display context', () => {
  const interpreter = new TaxSpecInterpreter(`
Testland (EUR) {
  Tax : income_tax = {
    piece {
      x < 12000: 0;
      else: brackets(x; [0..12000]: 0.2; [12000..inf]: 0.4;);
    }
  };
}`, { USD: 0.8 });
  const prepared = interpreter.prepare('Testland', ['income_tax'], 'USD', 12);

  assert.deepEqual(prepared.plotBreaks, [1250]);
  assert.equal(prepared.plotBreakCoverageComplete, true);
  assert.ok(Object.isFrozen(prepared.plotBreaks));
});

test('dynamic thresholds report incomplete semantic break coverage', () => {
  const interpreter = new TaxSpecInterpreter(`
Testland (EUR) {
  Tax : income_tax = { piece { x < x * x: 0; else: x; } };
}`);

  assert.equal(
    interpreter.prepare('Testland', ['income_tax'], 'EUR').plotBreakCoverageComplete,
    false
  );
});

test('prepared outcomes preserve annual value across pay periods and currencies', () => {
  const annualIncomeGbp = 100_000;
  const gbpToEur = interpreter
    .getCatalogue()
    .currencies.find(({ code }) => code === 'GBP').eurRate;
  const annual = interpreter.prepare('UK_ex_Scotland', ['income tax'], 'GBP');
  const expectedTaxGbp = annual.taxPaid(annualIncomeGbp);

  for (const periodsPerYear of [1, 12, 26, 52]) {
    const prepared = interpreter.prepare(
      'UK_ex_Scotland',
      ['income tax'],
      'GBP',
      periodsPerYear
    );
    const displayedIncome = annualIncomeGbp / periodsPerYear;

    assertApproxEqual(prepared.overallRate(displayedIncome), annual.overallRate(annualIncomeGbp));
    assertApproxEqual(prepared.taxPaid(displayedIncome) * periodsPerYear, expectedTaxGbp);
    assertApproxEqual(
      prepared.netPay(displayedIncome) * periodsPerYear,
      annualIncomeGbp - expectedTaxGbp
    );
  }

  const eur = interpreter.prepare('UK_ex_Scotland', ['income tax'], 'EUR');
  assertApproxEqual(eur.overallRate(annualIncomeGbp * gbpToEur), annual.overallRate(annualIncomeGbp));
  assertApproxEqual(eur.taxPaid(annualIncomeGbp * gbpToEur), expectedTaxGbp * gbpToEur);
});

test('prepared outcomes define non-positive income consistently', () => {
  const prepared = interpreter.prepare('UK_ex_Scotland', ['income tax'], 'GBP', 12);

  assert.equal(prepared.marginalRate(-100), 0);
  for (const income of [-100, 0]) {
    assert.equal(prepared.overallRate(income), 0);
    assert.equal(prepared.taxPaid(income), 0);
    assert.equal(prepared.netPay(income), income);
  }
});

test('prepared accessors reject non-finite outcomes with descriptive errors', () => {
  const nonFinite = new TaxSpecInterpreter(`
    Testland (EUR) {
      Broken : income_tax = { x / 0 };
    }
  `).prepare('Testland', ['income tax'], 'EUR');

  assert.throws(
    () => nonFinite.marginalRate(100),
    /Non-finite marginalRate for Testland at income 100/
  );
  assert.throws(
    () => nonFinite.overallRate(100),
    /Non-finite overallRate for Testland at income 100/
  );
});

test('prepared outcomes are finite for every country', () => {
  for (const country of interpreter.getCatalogue().countries) {
    const prepared = interpreter.prepare(country.id, null, country.currency);
    for (const accessor of ['marginalRate', 'overallRate', 'taxPaid', 'netPay']) {
      assert.equal(
        Number.isFinite(prepared[accessor](50_000)),
        true,
        `${country.id} ${accessor}`
      );
    }
  }
});

test('every shipped country has complete semantic plot-break coverage', () => {
  const interpreter = createIncomeTaxInterpreter();
  for (const country of interpreter.getCatalogue().countries) {
    const prepared = interpreter.prepare(country.id, null, country.currency);
    assert.equal(prepared.plotBreakCoverageComplete, true, country.id);
  }
});
