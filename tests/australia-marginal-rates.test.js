import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertMarginalRateSamples,
  createIncomeTaxInterpreter,
} from './test-helpers.js';

const interpreter = createIncomeTaxInterpreter();
const COUNTRY = 'Australia';
const COUNTRY_LABEL = 'Australia';
const CURRENCY = 'AUD';
const NO_HECS_SCHEDULES = ['income tax', 'social security'];
const WITH_HECS_SCHEDULES = ['income tax', 'social security', 'loan repayment'];
const SCHEDULE_INCOMES = [
  0,
  18_200,
  18_300,
  27_222,
  27_300,
  34_027,
  34_100,
  45_000,
  45_100,
  135_000,
  135_100,
  190_000,
  190_100,
  200_000,
];
const MARGINAL_EPSILON = 1e-5;
const SWEEP_START = 0;
const SWEEP_END = 200_000;
const SWEEP_STEP = 1_000;

function expectedMarginalRate(income) {
  if (income <= 18_200) return 0;
  if (income <= 27_222) return 0.16;
  if (income <= 34_027) return 0.26;
  if (income <= 45_000) return 0.18;
  if (income <= 135_000) return 0.32;
  if (income <= 190_000) return 0.39;
  return 0.47;
}

test(`${COUNTRY_LABEL} no-loan marginal rates match expected schedule`, () => {
  assertMarginalRateSamples({
    interpreter,
    country: COUNTRY,
    enabledSchedules: NO_HECS_SCHEDULES,
    currency: CURRENCY,
    incomes: SCHEDULE_INCOMES,
    expectedAtIncome: expectedMarginalRate,
    epsilon: MARGINAL_EPSILON,
  });
});

test(`${COUNTRY_LABEL} loan repayment increases marginal rate when enabled`, () => {
  const income = 100_000;
  const noLoanRate = interpreter.prepare(COUNTRY, NO_HECS_SCHEDULES, CURRENCY).marginalRate(income);
  const withLoanRate = interpreter
    .prepare(COUNTRY, WITH_HECS_SCHEDULES, CURRENCY)
    .marginalRate(income);

  assert.ok(
    withLoanRate > noLoanRate,
    `Expected loan-enabled marginal rate (${withLoanRate}) to exceed no-loan rate (${noLoanRate}).`
  );
});

test(`${COUNTRY_LABEL} no-loan marginal-rate sweep is finite`, () => {
  const prepared = interpreter.prepare(COUNTRY, NO_HECS_SCHEDULES, CURRENCY);
  for (let income = SWEEP_START; income <= SWEEP_END; income += SWEEP_STEP) {
    const marginalRate = prepared.marginalRate(income);
    assert.ok(
      Number.isFinite(marginalRate),
      `Expected finite marginal rate at income ${income}, got ${marginalRate}`
    );
  }
});
