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

const AM = 0.08;
const AFTER_AM = 1 - AM; // 0.92

const PERSONFRADRAG = 54_100;
const K_TAXABLE = PERSONFRADRAG / AFTER_AM;   // ≈ 58,804.35

const K_MELLEM = 641_200 / AFTER_AM;          // ≈ 696,956.52
const K_TOP = 777_900 / AFTER_AM;             // ≈ 845,543.48
const K_TOPTOT = 2_592_500 / AFTER_AM;         // ≈ 2,817,934.78

// Use buffers so the numerical derivative doesn't straddle thresholds.
const SCHEDULE_INCOMES = [
  0,
  58_802, 58_807,         // around K_TAXABLE
  696_945, 696_970,       // around K_MELLEM
  845_530, 845_560,       // around K_TOP
  2_817_900, 2_817_970,   // around K_TOPTOT
];

const PARITY_INCOMES = [0, 58_900, 700_000, 900_000, 2_900_000];

const MARGINAL_EPSILON = 1e-5;
const PARITY_EPSILON = 1e-6;

// DSL constants from your Denmark model:
const DK_KOMMUNE_RATE = 0.254276;
const DK_BUNDSKAT_RATE = 0.1201;
const DK_MELLEM_RATE = 0.075;
const DK_TOP_RATE = 0.075;
const DK_TOPTOT_RATE = 0.05;

// Marginal when DK_Taxable is active: AM + AFTER_AM*(kommune + bundskat)
const BASE = AM + AFTER_AM * (DK_KOMMUNE_RATE + DK_BUNDSKAT_RATE);
const ADD_MELLEM = AFTER_AM * DK_MELLEM_RATE;
const ADD_TOP = AFTER_AM * DK_TOP_RATE;
const ADD_TOPTOT = AFTER_AM * DK_TOPTOT_RATE;

function expectedMarginalRate(income) {
  if (income < K_TAXABLE) return AM;
  if (income < K_MELLEM) return BASE;
  if (income < K_TOP) return BASE + ADD_MELLEM;
  if (income < K_TOPTOT) return BASE + ADD_MELLEM + ADD_TOP;
  return BASE + ADD_MELLEM + ADD_TOP + ADD_TOPTOT;
}

test(`${COUNTRY_LABEL} marginal rates match DSL-based schedule`, () => {
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