const RATE_TO_URL = {
  marginal: 'marginal',
  cumulative: 'overall',
  'marginal-overall': 'marginal_overall',
  'tax-paid': 'tax_paid',
  'net-pay': 'net_pay',
};
const URL_TO_RATE = Object.fromEntries(
  Object.entries(RATE_TO_URL).map(([rate, encoded]) => [encoded, rate])
);
const LARGE_DIGIT_CURRENCIES = new Set(['NOK', 'DKK', 'JPY']);

function identifier(value) {
  return String(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function createUrlPlotState({
  countries,
  schedules,
  currenciesToEur,
  periodsPerYear,
  defaults,
}) {
  const countryKeys = countries.map(({ country }) => country);
  const countryLookup = new Map(
    countries.flatMap(({ country, countryLabel }) => [
      [String(country).normalize('NFKC').trim().toLowerCase(), country],
      [String(countryLabel).normalize('NFKC').trim().toLowerCase(), country],
    ])
  );
  const scheduleLookup = new Map(schedules.map((schedule) => [identifier(schedule), schedule]));
  const currencies = new Set(Object.keys(currenciesToEur));
  const periods = new Set(Object.keys(periodsPerYear));
  let synced = false;

  function getInputScale(displayCurrency, payPeriod) {
    return payPeriod === 'annual'
      || LARGE_DIGIT_CURRENCIES.has(displayCurrency)
      || currenciesToEur[displayCurrency] < 0.2
      ? 1000
      : 1;
  }

  function convertInput(value, from, to) {
    const numeric = Number(value);
    const fromRate = currenciesToEur[from.displayCurrency];
    const toRate = currenciesToEur[to.displayCurrency];
    const fromPeriods = periodsPerYear[from.payPeriod];
    const toPeriods = periodsPerYear[to.payPeriod];
    if (![numeric, fromRate, toRate, fromPeriods, toPeriods].every(Number.isFinite)) return value;

    const converted =
      (numeric * getInputScale(from.displayCurrency, from.payPeriod) * fromPeriods * fromRate)
      / (getInputScale(to.displayCurrency, to.payPeriod) * toPeriods * toRate);
    return String(Number(converted.toFixed(6)));
  }

  function serialize(state) {
    const params = new URLSearchParams();
    params.set(
      'countries',
      countryKeys.filter((country) => state.enabledCountries[country]).join(',')
    );
    params.set(
      'schedules',
      schedules
        .filter((schedule) => state.enabledSchedules[schedule])
        .map(identifier)
        .join(',')
    );
    params.set(
      'currency',
      currencies.has(state.displayCurrency) ? state.displayCurrency : defaults.displayCurrency
    );
    params.set('period', periods.has(state.payPeriod) ? state.payPeriod : defaults.payPeriod);
    params.set('x_range', `${state.minKEurInput},${state.maxKEurInput}`);
    params.set('type', RATE_TO_URL[state.rateType] ?? RATE_TO_URL[defaults.rateType]);
    return params.toString().replace(/%2C/gi, ',');
  }

  function parse(hash = typeof window === 'undefined' ? '' : window.location.hash) {
    const params = new URLSearchParams(String(hash).replace(/^#/, ''));
    const enabledCountries = params.has('countries')
      ? Object.fromEntries(countryKeys.map((country) => [country, false]))
      : { ...defaults.enabledCountries };
    if (params.has('countries')) {
      for (const token of params.get('countries').split(',').filter(Boolean)) {
        const country = countryLookup.get(token.normalize('NFKC').trim().toLowerCase());
        if (country) enabledCountries[country] = true;
      }
    }
    const enabledSchedules = params.has('schedules')
      ? Object.fromEntries(schedules.map((schedule) => [schedule, false]))
      : { ...defaults.enabledSchedules };
    if (params.has('schedules')) {
      for (const token of params.get('schedules').split(',').filter(Boolean)) {
        const schedule = scheduleLookup.get(identifier(token));
        if (schedule) enabledSchedules[schedule] = true;
      }
    }
    const displayCurrency = currencies.has(params.get('currency'))
      ? params.get('currency')
      : defaults.displayCurrency;
    const payPeriod = periods.has(params.get('period')) ? params.get('period') : defaults.payPeriod;
    const defaultContext = {
      displayCurrency: defaults.displayCurrency,
      payPeriod: defaults.payPeriod,
    };
    const selectedContext = { displayCurrency, payPeriod };
    const [rawMin, rawMax] = (params.get('x_range') ?? '').split(',', 2);
    const minKEurInput = Number.isFinite(Number(rawMin))
      ? String(Math.max(0, Number(rawMin)))
      : convertInput(defaults.minKEurInput, defaultContext, selectedContext);
    const maxKEurInput = Number.isFinite(Number(rawMax))
      ? String(Math.max(0, Number(rawMax)))
      : convertInput(defaults.maxKEurInput, defaultContext, selectedContext);
    const encodedRate = identifier(params.get('type') ?? '');

    return {
      enabledCountries,
      enabledSchedules,
      rateType: URL_TO_RATE[encodedRate] ?? defaults.rateType,
      displayCurrency,
      payPeriod,
      minKEurInput,
      maxKEurInput,
    };
  }

  function sync(state) {
    if (typeof window === 'undefined') return;
    const hash = serialize(state);
    if (hash === window.location.hash.slice(1)) {
      synced = true;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}#${hash}`;
    window.history[synced ? 'pushState' : 'replaceState'](null, '', url);
    synced = true;
  }

  function subscribe(listener) {
    if (typeof window === 'undefined') return () => {};
    const handleHashChange = () => listener(parse());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }

  return { convertInput, getInputScale, parse, serialize, subscribe, sync };
}
