import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlotPlanner } from '../src/plotPlanning.js';

const line = {
  country: 'Testland',
  color: '#123456',
  lineBreaksDisplayIncome: [],
  marginalRateAtDisplayIncome: (income) => income / 100,
  cumulativeRateAtDisplayIncome: (income) => income / 200,
  cumulativeTaxPaidAtDisplayIncome: (income) => income * 0.2,
  netPayAtDisplayIncome: (income) => income * 0.8,
};

test('marginal mode plans one renderer-neutral series', () => {
  const plan = createPlotPlanner().plan({
    rateType: 'marginal',
    countryLines: [line],
    domainMin: 0,
    domainMax: 100,
  });

  assert.equal(plan.series.length, 1);
  assert.equal(plan.series[0].key, 'Testland');
  assert.equal(plan.series[0].yAccessor, line.marginalRateAtDisplayIncome);
  assert.deepEqual(plan.series[0].continuousDomains, [[0, 100]]);
  assert.deepEqual(plan.series[0].jumps, []);
  assert.deepEqual(plan.series[0].style, { color: '#123456', dashed: false });
  assert.deepEqual(plan.bounds, { minValue: 0, maxValue: 1 });
});

test('all rate modes select expected accessors and styles', () => {
  const planner = createPlotPlanner();
  const cases = [
    ['marginal', line.marginalRateAtDisplayIncome],
    ['cumulative', line.cumulativeRateAtDisplayIncome],
    ['tax-paid', line.cumulativeTaxPaidAtDisplayIncome],
    ['net-pay', line.netPayAtDisplayIncome],
  ];

  for (const [rateType, accessor] of cases) {
    const { series } = planner.plan({
      rateType,
      countryLines: [line],
      domainMin: 0,
      domainMax: 100,
    });
    assert.equal(series.length, 1);
    assert.equal(series[0].yAccessor, accessor);
    assert.equal(series[0].style.dashed, false);
  }

  const combined = planner.plan({
    rateType: 'marginal-overall',
    countryLines: [line],
    domainMin: 0,
    domainMax: 100,
  });
  assert.deepEqual(combined.series.map(({ key }) => key), [
    'Testland-overall',
    'Testland-marginal',
  ]);
  assert.deepEqual(combined.series.map(({ style }) => style.dashed), [false, true]);
});

test('forced breaks and detected jumps split continuous domains', () => {
  const discontinuous = {
    ...line,
    lineBreaksDisplayIncome: [25],
    marginalRateAtDisplayIncome: (income) => (Math.round(income) < 50 ? 0 : 100),
  };
  const { series } = createPlotPlanner().plan({
    rateType: 'marginal',
    countryLines: [discontinuous],
    domainMin: 0,
    domainMax: 100,
  });

  assert.deepEqual(series[0].jumps, [{ x: 49.5, y1: 0, y2: 100 }]);
  assert.deepEqual(series[0].continuousDomains, [
    [0, 25],
    [25, 49.499],
    [49.501, 100],
  ]);
});

test('overlapping pans reuse cached samples and return equivalent results', () => {
  let calls = 0;
  const cachedLine = {
    ...line,
    marginalRateAtDisplayIncome: (income) => {
      calls += 1;
      return income / 100;
    },
  };
  const planner = createPlotPlanner();
  const input = {
    rateType: 'marginal',
    countryLines: [cachedLine],
    domainMin: 10,
    domainMax: 90,
  };

  const first = planner.plan(input);
  const callsAfterFirstPlan = calls;
  const second = planner.plan(input);

  assert.deepEqual(second, first);
  assert.equal(calls, callsAfterFirstPlan);
});
