import test from 'node:test';
import {
  assertMarginalRateSamples,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Norway';
const COUNTRY_LABEL = 'Norway';
const CURRENCY = 'NOK';
const ENABLED_SCHEDULES = ['income tax', 'social security'];
const SCHEDULE_INCOMES = [
  0,
  99_650,
  99_651,
  143_176,
  143_177,
  210_240,
  210_241,
  226_100,
  226_101,
  318_300,
  318_301,
  725_050,
  725_051,
  980_100,
  980_101,
  1_467_200,
  1_467_201,
];
const MARGINAL_EPSILON = 1e-5;

function expectedMarginalRate(income) {
  if (income <= 99_650) return 0;
  if (income <= 143_176) return 0.25;
  if (income <= 210_240) return 0.076;
  if (income <= 226_100) return 0.296;
  if (income <= 318_300) return 0.313;
  if (income <= 725_050) return 0.336;
  if (income <= 980_100) return 0.433;
  if (income <= 1_467_200) return 0.464;
  return 0.474;
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
