import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TaxSpec from '../src/TaxSpec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const incomeTaxSpecification = fs.readFileSync(
  path.resolve(__dirname, '../income.tax'),
  'utf8'
);

export const DEFAULT_EPSILON = 1e-6;
export const DEFAULT_CONVERSIONS = { EUR: 1 };

export function createIncomeTaxInterpreter(currencyConversions = DEFAULT_CONVERSIONS) {
  return new TaxSpec(incomeTaxSpecification, currencyConversions);
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
  const prepared = interpreter.prepare(country, enabledSchedules, currency);
  for (const income of incomes) {
    const actual = prepared.marginalRate(income);
    const expected = expectedAtIncome(income);
    assertApproxEqual(actual, expected, epsilon, `${country} income ${income}`);
  }
}
