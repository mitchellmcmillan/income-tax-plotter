import test from 'node:test';
import {
  assertMarginalRateSamples,
  assertPreparedMatchesDirect,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Denmark';
const COUNTRY_LABEL = 'Denmark';
const CURRENCY = 'DKK';
const ENABLED_SCHEDULES = ['income tax', 'social security'];
const SCHEDULE_INCOMES = [
  0,
  58_805,
  58_806,
  68_265,
  68_266,
  235_200,
  235_201,
  304_089,
  304_090,
  496_471,
  496_472,
  696_957,
  696_958,
  845_543,
  845_544,
  2_818_152,
  2_818_153,
];
const PARITY_INCOMES = [0, 58_805, 68_265, 235_200, 496_471, 845_543, 2_818_152];
const MARGINAL_EPSILON = 1e-5;
const PARITY_EPSILON = 1e-6;

function expectedMarginalRate(income) {
  if (income <= 58_805) return 0.08;
  if (income <= 68_265) return 0.190492;
  if (income <= 235_200) return 0.389005325;
  if (income <= 304_089) return 0.377733275;
  if (income <= 496_471) return 0.389005325;
  if (income <= 696_957) return 0.4209428;
  if (income <= 845_543) return 0.4899428;
  if (income <= 2_818_152) return 0.5589428;
  return 0.6049428;
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
