import test from 'node:test';
import {
  assertApproxEqual,
  assertMarginalRateSamples,
  assertPreparedMatchesDirect,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'New_Zealand';
const COUNTRY_LABEL = 'New Zealand';
const CURRENCY = 'NZD';
const ENABLED_SCHEDULES = ['income tax'];
const SCHEDULE_INCOMES = [0, 15_600, 15_601, 53_500, 53_501, 78_100, 78_101, 180_000, 180_001, 200_000];
const PARITY_INCOMES = [0, 15_600, 15_601, 53_500, 53_501, 180_000, 200_000];
const MARGINAL_EPSILON = 1e-5;
const PARITY_EPSILON = 1e-6;

function expectedMarginalRate(income) {
  if (income <= 15_600) return 0.105;
  if (income <= 53_500) return 0.175;
  if (income <= 78_100) return 0.30;
  if (income <= 180_000) return 0.33;
  return 0.39;
}

test(`${COUNTRY_LABEL} marginal rates match expected schedule`, () => {
  assertMarginalRateSamples({
    interpreter,
    country: COUNTRY,
    enabledSchedules: ENABLED_SCHEDULES,
    currency: CURRENCY,
    incomes: SCHEDULE_INCOMES,
    expectedAtIncome: expectedMarginalRate,
    epsilon: MARGINAL_EPSILON,
  });
});

test(`${COUNTRY_LABEL} prepared evaluator matches direct API`, () => {
  assertPreparedMatchesDirect({
    interpreter,
    country: COUNTRY,
    enabledSchedules: ENABLED_SCHEDULES,
    currency: CURRENCY,
    incomes: PARITY_INCOMES,
    marginalEpsilon: PARITY_EPSILON,
    overallEpsilon: PARITY_EPSILON,
  });
});

test(`${COUNTRY_LABEL} student loan increases marginal rate above threshold`, () => {
  const income = 50_000;
  const noLoan = interpreter.marginalRate(COUNTRY, ENABLED_SCHEDULES, CURRENCY, income);
  const withLoan = interpreter.marginalRate(
    COUNTRY,
    ['income tax', 'loan repayment'],
    CURRENCY,
    income
  );
  assertApproxEqual(withLoan - noLoan, 0.12, MARGINAL_EPSILON, `${COUNTRY_LABEL} student loan`);
});
