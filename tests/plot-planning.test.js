import assert from 'node:assert/strict';
import test from 'node:test';
import TaxSpec from '../src/TaxSpec.js';
import { createPlotPlanner } from '../src/plotPlanning.js';

const taxSpec = `
Testland (EUR) {
  Income : income_tax = { brackets(x; [0..100]: 0.2; [100..inf]: 0.4;) };
  Levy : social_security = { 0.1 * x };
}`;

const input = {
  countries: ['Testland'],
  enabledSchedules: { 'Income tax': true, 'Social security': true },
  displayCurrency: 'EUR',
  periodsPerYear: 1,
  domainMin: 0,
  domainMax: 200,
};

test('planner prepares TaxSpec countries and exposes immutable plotting catalogue', () => {
  const planner = createPlotPlanner(new TaxSpec(taxSpec));
  const catalogue = planner.getCatalogue();

  assert.deepEqual(catalogue.countries, [{
    id: 'Testland',
    label: 'Testland',
    currency: 'EUR',
    schedules: [
      { id: 'income_tax', label: 'Income tax' },
      { id: 'social_security', label: 'Social security' },
    ],
    color: '#0f766e',
  }]);
  assert.ok(Object.isFrozen(catalogue));
  assert.ok(Object.isFrozen(catalogue.countries));
  assert.ok(Object.isFrozen(catalogue.countries[0].schedules));
});

test('all rate modes return renderer-neutral TaxSpec outcomes and styles', () => {
  const planner = createPlotPlanner(new TaxSpec(taxSpec));
  const expectedAt50 = {
    marginal: 30,
    cumulative: 30,
    'tax-paid': 15,
    'net-pay': 35,
  };

  for (const [rateType, expected] of Object.entries(expectedAt50)) {
    const { series } = planner.plan({ ...input, rateType });
    assert.equal(series.length, 1);
    assert.equal(series[0].key, 'Testland');
    assert.ok(Math.abs(series[0].yAccessor(50) - expected) < 1e-9);
    assert.deepEqual(series[0].style, { color: '#0f766e', dashed: false });
    if (rateType === 'marginal') {
      assert.equal(series[0].jumps[0].x, 100.5);
      assert.ok(Math.abs(series[0].jumps[0].y1 - 30) < 1e-9);
      assert.equal(series[0].jumps[0].y2, 50);
    }
  }

  const combined = planner.plan({ ...input, rateType: 'marginal-overall' });
  assert.deepEqual(combined.series.map(({ key }) => key), [
    'Testland-overall',
    'Testland-marginal',
  ]);
  assert.deepEqual(combined.series.map(({ style }) => style.dashed), [false, true]);
});

test('display currency and pay period conversion preserve annual outcomes', () => {
  const planner = createPlotPlanner(new TaxSpec(taxSpec, { USD: 0.8 }));
  const annual = planner.plan({ ...input, rateType: 'tax-paid' });
  const monthlyUsd = planner.plan({
    ...input,
    rateType: 'tax-paid',
    displayCurrency: 'USD',
    periodsPerYear: 12,
  });

  assert.equal(annual.series[0].yAccessor(120), 40);
  assert.ok(Math.abs(monthlyUsd.series[0].yAccessor(12) - (47 / 12)) < 1e-9);
});

test('domain and mode changes reuse prepared accessors', () => {
  const planner = createPlotPlanner(new TaxSpec(taxSpec));
  const first = planner.plan({ ...input, rateType: 'marginal' });
  const second = planner.plan({
    ...input,
    rateType: 'marginal',
    domainMin: 10,
    domainMax: 190,
  });
  const combined = planner.plan({ ...input, rateType: 'marginal-overall' });

  assert.equal(second.series[0].yAccessor, first.series[0].yAccessor);
  assert.equal(combined.series[1].yAccessor, first.series[0].yAccessor);
});

test('unknown or unpreparable countries produce no series', () => {
  const planner = createPlotPlanner(new TaxSpec(taxSpec));
  assert.deepEqual(
    planner.plan({ ...input, countries: ['Missing'], rateType: 'marginal' }),
    { series: [], bounds: null }
  );
});
