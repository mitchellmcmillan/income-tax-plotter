import test from 'node:test';
import {
  assertPreparedMatchesDirect,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Germany';
const COUNTRY_LABEL = 'Germany';
const CURRENCY = 'EUR';
const ENABLED_SCHEDULES = ['income tax', 'social security', 'religious'];
const PARITY_INCOMES = [0, 10_000, 30_000, 50_000, 100_000, 101_399, 101_400, 101_401, 200_000];
const PARITY_MARGINAL_EPSILON = 1e-3;
const PARITY_OVERALL_EPSILON = 1e-6;
test(`${COUNTRY_LABEL} prepared evaluator matches direct API`, () => {
  assertPreparedMatchesDirect({
    interpreter,
    country: COUNTRY,
    enabledSchedules: ENABLED_SCHEDULES,
    currency: CURRENCY,
    incomes: PARITY_INCOMES,
    // Direct API computes wrapper marginals with finite differences; generated code may use
    // symbolic derivatives through fix/eval paths.
    marginalEpsilon: PARITY_MARGINAL_EPSILON,
    overallEpsilon: PARITY_OVERALL_EPSILON,
  });
});
