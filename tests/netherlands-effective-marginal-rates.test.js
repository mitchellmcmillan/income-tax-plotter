import test from 'node:test';
import {
  assertMarginalRateSamples,
  assertPreparedMatchesDirect,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Netherlands';
const COUNTRY_LABEL = 'Netherlands';
const CURRENCY = 'EUR';
const ENABLED_SCHEDULES = ['income tax'];
const SCHEDULE_INCOMES = [
  0,
  10_000,
  11_357,
  11_358,
  11_965,
  11_966,
  25_845,
  25_846,
  29_736,
  29_737,
  38_883,
  38_884,
  45_592,
  45_593,
  78_426,
  78_427,
  132_920,
  132_921,
  200_000,
];
const PARITY_INCOMES = [0, 11_357, 11_358, 25_845, 25_846, 78_426, 132_920, 200_000];
const MARGINAL_EPSILON = 1e-5;
const PARITY_EPSILON = 1e-5;

function expectedMarginalRate(income) {
  if (income <= 11_357) return 0;
  if (income <= 11_965) return 0.27426;
  if (income <= 25_845) return 0.04741;
  if (income <= 29_736) return 0.33800;
  if (income <= 38_883) return 0.40198;
  if (income <= 45_592) return 0.42008;
  if (income <= 78_426) return 0.50468;
  if (income <= 132_920) return 0.56010;
  return 0.49500;
}

test(`${COUNTRY_LABEL} effective marginal rates match folded base-minus-credit slopes`, () => {
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
