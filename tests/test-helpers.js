import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TaxSpecInterpreter from '../src/TaxSpecInterpreter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const incomeTaxSpecification = fs.readFileSync(
  path.resolve(__dirname, '../income.tax'),
  'utf8'
);

export const DEFAULT_EPSILON = 1e-6;
export const DEFAULT_CONVERSIONS = { EUR: 1 };

export function createIncomeTaxInterpreter(currencyConversions = DEFAULT_CONVERSIONS) {
  return new TaxSpecInterpreter(incomeTaxSpecification, currencyConversions);
}

export function assertApproxEqual(actual, expected, epsilon = DEFAULT_EPSILON, context = '') {
  const delta = Math.abs(actual - expected);
  const prefix = context ? `${context}: ` : '';
  assert.ok(
    delta <= epsilon,
    `${prefix}Expected ${actual} to be within ${epsilon} of ${expected} (delta=${delta})`
  );
}

export function assertMarginalRateSamples({
  interpreter,
  country,
  enabledSchedules,
  currency,
  incomes,
  expectedAtIncome,
  epsilon = DEFAULT_EPSILON,
}) {
  for (const income of incomes) {
    const actual = interpreter.marginalRate(country, enabledSchedules, currency, income);
    const expected = expectedAtIncome(income);
    assertApproxEqual(actual, expected, epsilon, `${country} income ${income}`);
  }
}

export function assertPreparedMatchesDirect({
  interpreter,
  country,
  enabledSchedules,
  currency,
  incomes,
  marginalEpsilon = DEFAULT_EPSILON,
  overallEpsilon = DEFAULT_EPSILON,
}) {
  const prepared = interpreter.prepare(country, enabledSchedules, currency);

  for (const income of incomes) {
    const directMarginal = interpreter.marginalRate(country, enabledSchedules, currency, income);
    const preparedMarginal = prepared.marginalRate(income);
    assertApproxEqual(
      preparedMarginal,
      directMarginal,
      marginalEpsilon,
      `${country} income ${income} prepared marginal`
    );

    const directOverall = interpreter.overallRate(country, enabledSchedules, currency, income);
    const preparedOverall = prepared.overallRate(income);
    assertApproxEqual(
      preparedOverall,
      directOverall,
      overallEpsilon,
      `${country} income ${income} prepared overall`
    );
  }

  return prepared;
}
