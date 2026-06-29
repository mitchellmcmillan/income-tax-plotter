import assert from 'node:assert/strict';
import test from 'node:test';
import { createUrlPlotState } from '../src/urlPlotState.js';

const defaults = {
  enabledCountries: { France: true, Germany: true },
  enabledSchedules: { 'Income tax': true, 'Religious tax': false },
  rateType: 'marginal',
  displayCurrency: 'EUR',
  payPeriod: 'annual',
  minKEurInput: '0',
  maxKEurInput: '150',
};

const urlPlotState = createUrlPlotState({
  countries: [
    { country: 'France', countryLabel: 'France' },
    { country: 'Germany', countryLabel: 'Germany' },
  ],
  schedules: ['Income tax', 'Religious tax'],
  currenciesToEur: { EUR: 1, GBP: 1.2 },
  periodsPerYear: { annual: 1, monthly: 12 },
  defaults,
});

test('canonical URL state serializes and parses symmetrically', () => {
  const state = {
    enabledCountries: { France: true, Germany: false },
    enabledSchedules: { 'Income tax': true, 'Religious tax': true },
    rateType: 'tax-paid',
    displayCurrency: 'GBP',
    payPeriod: 'monthly',
    minKEurInput: '2',
    maxKEurInput: '10',
  };

  const serialized = urlPlotState.serialize(state);
  assert.deepEqual(urlPlotState.parse(serialized), state);
  assert.deepEqual([...new URLSearchParams(serialized).keys()], [
    'countries',
    'schedules',
    'currency',
    'period',
    'x_range',
    'type',
  ]);
});

test('empty country and schedule selections round-trip unchanged', () => {
  const state = {
    ...defaults,
    enabledCountries: { France: false, Germany: false },
    enabledSchedules: { 'Income tax': false, 'Religious tax': false },
  };

  assert.deepEqual(urlPlotState.parse(urlPlotState.serialize(state)), state);
});

test('invalid canonical values use defaults and legacy keys are ignored', () => {
  assert.deepEqual(
    urlPlotState.parse('#r=net_pay&u=GBP&x=1,2&c=00&s=00&type=wat&currency=USD&period=daily'),
    defaults
  );
});

test('display-context range conversion preserves annual EUR income', () => {
  const monthly = urlPlotState.convertInput('120', {
    displayCurrency: 'EUR',
    payPeriod: 'annual',
  }, {
    displayCurrency: 'EUR',
    payPeriod: 'monthly',
  });

  assert.equal(monthly, '10000');
  assert.equal(
    urlPlotState.convertInput(monthly, {
      displayCurrency: 'EUR',
      payPeriod: 'monthly',
    }, {
      displayCurrency: 'EUR',
      payPeriod: 'annual',
    }),
    '120'
  );
});

test('missing range converts defaults into the selected display context', () => {
  const state = urlPlotState.parse('#currency=GBP&period=monthly');

  assert.equal(state.minKEurInput, '0');
  assert.equal(state.maxKEurInput, '10416.666667');
});

test('initial sync replaces, later sync pushes, and hashchange restores state', () => {
  const originalWindow = globalThis.window;
  const listeners = new Map();
  const calls = [];
  globalThis.window = {
    location: { pathname: '/', search: '', hash: '#r=legacy' },
    history: {
      replaceState(_state, _unused, url) {
        calls.push(['replace', url]);
        globalThis.window.location.hash = url.slice(url.indexOf('#'));
      },
      pushState(_state, _unused, url) {
        calls.push(['push', url]);
        globalThis.window.location.hash = url.slice(url.indexOf('#'));
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };

  try {
    const browserState = createUrlPlotState({
      countries: [
        { country: 'France', countryLabel: 'France' },
        { country: 'Germany', countryLabel: 'Germany' },
      ],
      schedules: ['Income tax', 'Religious tax'],
      currenciesToEur: { EUR: 1, GBP: 1.2 },
      periodsPerYear: { annual: 1, monthly: 12 },
      defaults,
    });
    browserState.sync(defaults);
    browserState.sync({ ...defaults, rateType: 'net-pay' });

    let restored;
    const unsubscribe = browserState.subscribe((state) => {
      restored = state;
    });
    globalThis.window.location.hash = `#${browserState.serialize({
      ...defaults,
      rateType: 'tax-paid',
    })}`;
    listeners.get('hashchange')();

    assert.deepEqual(calls.map(([method]) => method), ['replace', 'push']);
    assert.equal(restored.rateType, 'tax-paid');
    unsubscribe();
    assert.equal(listeners.has('hashchange'), false);
  } finally {
    globalThis.window = originalWindow;
  }
});
