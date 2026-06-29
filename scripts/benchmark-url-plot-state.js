import { performance } from 'node:perf_hooks';
import { createUrlPlotState } from '../src/urlPlotState.js';

const defaults = {
  enabledCountries: { France: true, Germany: true },
  enabledSchedules: { 'Income tax': true },
  rateType: 'marginal',
  displayCurrency: 'EUR',
  payPeriod: 'annual',
  minKEurInput: '0',
  maxKEurInput: '150',
};
const durations = [];

for (let batch = 0; batch < 5; batch += 1) {
  globalThis.window = {
    location: { pathname: '/', search: '', hash: '' },
    history: {
      replaceState: updateLocation,
      pushState: updateLocation,
    },
  };
  const urlState = createUrlPlotState({
    countries: [
      { country: 'France', countryLabel: 'France' },
      { country: 'Germany', countryLabel: 'Germany' },
    ],
    schedules: ['Income tax'],
    currenciesToEur: { EUR: 1 },
    periodsPerYear: { annual: 1 },
    defaults,
  });
  const start = performance.now();
  for (let update = 0; update < 10000; update += 1) {
    urlState.sync({ ...defaults, rateType: update % 2 ? 'marginal' : 'net-pay' });
  }
  durations.push(performance.now() - start);
}

durations.sort((left, right) => left - right);
console.log(JSON.stringify({ urlUpdatesMedianMs: durations[2] }));

function updateLocation(_state, _unused, url) {
  window.location.hash = url.slice(url.indexOf('#'));
}
