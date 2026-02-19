import assert from 'node:assert/strict';
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
const TARIFF_MARKER = '19470.38';
const FIX_LOOP_MARKER = 'Number.isFinite(__fixWarm_';

function findValueFunctionBodyByMarker(generatedCode, marker) {
  const markerIndex = generatedCode.indexOf(marker);
  assert.ok(markerIndex >= 0, `Expected marker in generated code: ${marker}`);

  const valueFunctionStart = generatedCode.lastIndexOf('function __v', markerIndex);
  assert.ok(valueFunctionStart >= 0, `Expected value function before marker: ${marker}`);

  const marginalFunctionStart = generatedCode.indexOf('function __m', valueFunctionStart);
  assert.ok(marginalFunctionStart > valueFunctionStart, `Expected marginal boundary for marker: ${marker}`);

  return generatedCode.slice(valueFunctionStart, marginalFunctionStart);
}

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

test(`${COUNTRY_LABEL} generated code keeps fix loop inline and reuses tariff function inside DE_ESt`, () => {
  const prepared = interpreter.prepare(COUNTRY, ENABLED_SCHEDULES, CURRENCY);
  const generatedCode = prepared.generatedCode || '';

  const tariffValueBody = findValueFunctionBodyByMarker(generatedCode, TARIFF_MARKER);
  const deEstValueBody = findValueFunctionBodyByMarker(generatedCode, FIX_LOOP_MARKER);

  const tariffFunctionHeaderMatch = tariffValueBody.match(/function\s+(__v\d+(?:_u)?)\s*\(/);
  assert.ok(tariffFunctionHeaderMatch, 'Expected generated DE_EStTariffOnZVE value-function header.');
  const tariffValueFunctionName = tariffFunctionHeaderMatch[1];

  assert.ok(deEstValueBody.includes('for (let __i_'), 'Expected inlined fixed-point loop in __v12.');
  const tariffCallPattern = new RegExp(`${tariffValueFunctionName}\\(`, 'g');
  const tariffCallCount = [...deEstValueBody.matchAll(tariffCallPattern)].length;
  assert.ok(
    tariffCallCount >= 1,
    `Expected DE_ESt to call ${tariffValueFunctionName}(...) for tariff reuse.`
  );
  assert.ok(
    !/let __l_\d+_K = \(\(\(\(\(\) => \{/.test(deEstValueBody),
    'Expected let K = fix(...) to compile as a direct inlined loop assignment (no fix-IIFE assignment).'
  );
});
