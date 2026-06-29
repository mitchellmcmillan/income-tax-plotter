import test from 'node:test';
import {
  assertMarginalRateSamples,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'UK_ex_Scotland';
const COUNTRY_LABEL = 'UK ex Scotland';
const CURRENCY = 'GBP';
const ENABLED_SCHEDULES = ['income tax'];
const SCHEDULE_INCOMES = [
  0,
  12_570,
  12_571,
  50_270,
  50_271,
  100_000,
  100_001,
  116_760,
  116_761,
  125_140,
  125_141,
  200_000,
];
const MARGINAL_EPSILON = 1e-5;

function expectedMarginalRate(income) {
  // Left-hand derivative semantics at exact thresholds.
  if (income <= 12_570) return 0;
  if (income <= 50_270) return 0.20;
  if (income <= 100_000) return 0.40;
  if (income <= 125_140) return 0.60;
  return 0.45;
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
