import test from 'node:test';
import TaxSpecInterpreter from '../src/TaxSpecInterpreter.js';
import { assertApproxEqual, assertPreparedMatchesDirect } from './test-helpers.js';

const COUNTRY = 'Testland';
const COUNTRY_LABEL = 'Testland';
const CURRENCY = 'USD';
const ENABLED_SCHEDULES = ['income tax'];
const PARITY_INCOMES = [0, 10_000, 10_001, 20_000, 20_001, 25_000];
const MARGINAL_EPSILON = 1e-6;
const OVERALL_EPSILON = 1e-9;

const taxSpecification = `
Testland (USD) {
  TL_IncomeTax : income_tax = {
    brackets(
      x;
      [0..10000]: 0.10;
      [10000..20000]: 0.20;
      [20000..inf]: 0.30;
    )
  };
}
`;

const interpreter = new TaxSpecInterpreter(taxSpecification, { USD: 1 });
const reverseCurrencySpecification = `
ReverseCurrency (8 REV = EUR) {
  RC_IncomeTax : income_tax = {
    brackets(
      x;
      [0..inf]: 0.10;
    )
  };
}
`;
const reverseCurrencyInterpreter = new TaxSpecInterpreter(reverseCurrencySpecification);
const bareCurrencySpecification = `
BareCurrency (EUR) {
  BC_IncomeTax : income_tax = {
    brackets(
      x;
      [0..inf]: 0.05;
    )
  };
}
`;
const bareCurrencyInterpreter = new TaxSpecInterpreter(bareCurrencySpecification);
test(`${COUNTRY_LABEL} brackets compute total band tax in {} wrappers`, () => {
  const samples = [
    { income: 0, expectedTotal: 0 },
    { income: 5_000, expectedTotal: 500 },
    { income: 10_000, expectedTotal: 1_000 },
    { income: 15_000, expectedTotal: 2_000 },
    { income: 20_000, expectedTotal: 3_000 },
    { income: 25_000, expectedTotal: 4_500 },
  ];

  for (const sample of samples) {
    const overall = interpreter.overallRate(COUNTRY, ENABLED_SCHEDULES, CURRENCY, sample.income);
    const total = sample.income <= 0 ? 0 : overall * sample.income;
    assertApproxEqual(total, sample.expectedTotal);
  }
});

test(`${COUNTRY_LABEL} brackets marginal rate uses left-hand derivative at kinks`, () => {
  const samples = [
    { income: 9_999, expectedMarginal: 0.10 },
    { income: 10_000, expectedMarginal: 0.10 },
    { income: 10_001, expectedMarginal: 0.20 },
    { income: 19_999, expectedMarginal: 0.20 },
    { income: 20_000, expectedMarginal: 0.20 },
    { income: 20_001, expectedMarginal: 0.30 },
  ];

  for (const sample of samples) {
    const marginal = interpreter.marginalRate(COUNTRY, ENABLED_SCHEDULES, CURRENCY, sample.income);
    assertApproxEqual(marginal, sample.expectedMarginal, MARGINAL_EPSILON);
  }
});

test(`${COUNTRY_LABEL} prepared evaluator matches direct API`, () => {
  assertPreparedMatchesDirect({
    interpreter,
    country: COUNTRY,
    enabledSchedules: ENABLED_SCHEDULES,
    currency: CURRENCY,
    incomes: PARITY_INCOMES,
    marginalEpsilon: MARGINAL_EPSILON,
    overallEpsilon: OVERALL_EPSILON,
  });
});

test('currency metadata supports reverse syntax (N CUR = EUR)', () => {
  assertApproxEqual(reverseCurrencyInterpreter.currencyToEur.get('REV'), 1 / 8, 1e-12);

  // 80 EUR => 640 REV under (8 REV = EUR); marginal rate stays consistent.
  const marginal = reverseCurrencyInterpreter.marginalRate(
    'ReverseCurrency',
    ENABLED_SCHEDULES,
    'EUR',
    80
  );
  assertApproxEqual(marginal, 0.10, OVERALL_EPSILON);
});

test('currency metadata supports bare syntax (CUR)', () => {
  assertApproxEqual(bareCurrencyInterpreter.currencyToEur.get('EUR'), 1, 1e-12);

  const marginal = bareCurrencyInterpreter.marginalRate(
    'BareCurrency',
    ENABLED_SCHEDULES,
    'EUR',
    80
  );
  assertApproxEqual(marginal, 0.05, OVERALL_EPSILON);
});
