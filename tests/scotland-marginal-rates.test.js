import test from 'node:test';
import {
  assertMarginalRateSamples,
  assertPreparedMatchesDirect,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Scotland';
const COUNTRY_LABEL = 'Scotland';
const CURRENCY = 'GBP';
const ENABLED_SCHEDULES = ['income tax', 'social security'];
const SCHEDULE_INCOMES = [
  0,
  12_570,
  12_571,
  15_397,
  15_398,
  27_491,
  27_492,
  43_662,
  43_663,
  50_270,
  50_271,
  75_000,
  75_001,
  100_000,
  100_001,
  125_140,
  125_141,
  200_000,
];
const PARITY_INCOMES = [0, 12_570, 15_397, 43_662, 50_270, 100_000, 125_140, 200_000];
const MARGINAL_EPSILON = 1e-5;
const PARITY_EPSILON = 1e-6;

function expectedMarginalRate(income) {
  if (income <= 12_570) return 0;
  if (income <= 15_397) return 0.27;
  if (income <= 27_491) return 0.28;
  if (income <= 43_662) return 0.29;
  if (income <= 50_270) return 0.50;
  if (income <= 75_000) return 0.44;
  if (income <= 100_000) return 0.47;
  if (income <= 125_140) return 0.695;
  return 0.50;
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
