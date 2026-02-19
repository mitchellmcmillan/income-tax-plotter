import { useEffect, useMemo, useRef, useState } from 'react';
import { Coordinates, Mafs, Plot } from 'mafs';
import Editor from '@monaco-editor/react';
import taxSpecification from '../income.tax?raw';
import TaxSpecInterpreter from './TaxSpecInterpreter.js';
import './App.css';

const COUNTRY_COLORS = [
  '#0f766e',
  '#1d4ed8',
  '#d97706',
  '#a21caf',
  '#dc2626',
  '#0369a1',
  '#15803d',
  '#e11d48',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#f59e0b',
  '#14b8a6',
  '#8b5cf6',
  '#f43f5e',
  '#84cc16',
];
const DEFAULT_MIN_EUR = 0;
const DEFAULT_MAX_EUR = 150000;
const DEFAULT_X_TICK_STEP = 25000;
const PAY_PERIOD_OPTIONS = [
  { id: 'annual', label: 'Annually', periodsPerYear: 1 },
  { id: 'monthly', label: 'Monthly', periodsPerYear: 12 },
  { id: 'fortnightly', label: 'Fortnightly', periodsPerYear: 26 },
  { id: 'weekly', label: 'Weekly', periodsPerYear: 52 },
];
const PAY_PERIODS_PER_YEAR = Object.fromEntries(
  PAY_PERIOD_OPTIONS.map((payPeriodOption) => [payPeriodOption.id, payPeriodOption.periodsPerYear])
);
const PAY_PERIOD_SET = new Set(PAY_PERIOD_OPTIONS.map((payPeriodOption) => payPeriodOption.id));
const DEFAULT_PAY_PERIOD = 'annual';

const SCHEDULE_PRIORITY = {
  'Income tax': 0,
  'Social security': 1,
  'Tertiary education loan': 2,
  'Religious tax': 3,
};

const SCHEDULE_KIND_TO_LABEL = {
  income_tax: 'Income tax',
  social_security: 'Social security',
  loan_repayment: 'Tertiary education loan',
  religious: 'Religious tax',
};

function formatCountryLabel(countryName) {
  return String(countryName).replace(/_/g, ' ');
}

function scheduleLabelFromKind(kind) {
  const normalizedKind = String(kind).normalize('NFKC').trim().toLowerCase();
  const override = SCHEDULE_KIND_TO_LABEL[normalizedKind];
  if (override) return override;

  return normalizedKind
    .split('_')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
}

function createTaxModelFromInterpreter(interpreter) {
  const countries = [...interpreter.modelByCountry.values()]
    .map((countryModel) => {
      const kindSet = new Set();
      for (const component of countryModel.components) {
        if (component.kindKey !== '_') {
          kindSet.add(component.kindKey);
        }
      }

      const scheduleKinds = [...kindSet].sort((left, right) => {
        const leftLabel = scheduleLabelFromKind(left);
        const rightLabel = scheduleLabelFromKind(right);
        const leftPriority = SCHEDULE_PRIORITY[leftLabel] ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = SCHEDULE_PRIORITY[rightLabel] ?? Number.MAX_SAFE_INTEGER;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return leftLabel.localeCompare(rightLabel);
      });

      return {
        country: countryModel.countryName,
        countryLabel: formatCountryLabel(countryModel.countryName),
        currency: countryModel.currencyKey,
        scheduleKinds,
      };
    })
    .sort((left, right) => left.countryLabel.localeCompare(right.countryLabel));

  const scheduleKinds = [...new Set(countries.flatMap((country) => country.scheduleKinds))];
  const scheduleTypes = scheduleKinds
    .map((kind) => scheduleLabelFromKind(kind))
    .sort((left, right) => {
      const leftPriority = SCHEDULE_PRIORITY[left] ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = SCHEDULE_PRIORITY[right] ?? Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.localeCompare(right);
    });

  return {
    countries,
    scheduleTypes,
  };
}

function createCurrencyLabelFormatter(currencyCode) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return (value) => formatter.format(value);
  } catch {
    const fallback = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return (value) => `${currencyCode} ${fallback.format(value)}`;
  }
}

const TAX_INTERPRETER = new TaxSpecInterpreter(taxSpecification);
const CURRENCY_TO_EUR_RATES = Object.fromEntries(TAX_INTERPRETER.currencyToEur.entries());
const TAX_MODEL = createTaxModelFromInterpreter(TAX_INTERPRETER);
const COUNTRY_LINES = TAX_MODEL.countries.map((countryEntry, index) => ({
  country: countryEntry.country,
  countryLabel: countryEntry.countryLabel,
  currency: countryEntry.currency,
  scheduleKinds: countryEntry.scheduleKinds,
  color: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
}));
const COUNTRY_KEYS = COUNTRY_LINES.map((countryLine) => countryLine.country);
const SCHEDULE_TYPES = TAX_MODEL.scheduleTypes;
const DEFAULT_ENABLED_COUNTRIES = Object.fromEntries(
  COUNTRY_KEYS.map((country) => [country, true])
);
const DEFAULT_ENABLED_SCHEDULES = Object.fromEntries(
  SCHEDULE_TYPES.map((scheduleType) => [
    scheduleType,
    !/(student|education)\s+loan/i.test(scheduleType),
  ])
);
const CURRENCY_TO_EUR_MAP = new Map(Object.entries(CURRENCY_TO_EUR_RATES));
const DISPLAY_CURRENCIES = [...CURRENCY_TO_EUR_MAP.keys()].sort((left, right) => {
  if (left === 'EUR') {
    return -1;
  }
  if (right === 'EUR') {
    return 1;
  }
  return left.localeCompare(right);
});
const DISPLAY_CURRENCY_SET = new Set(DISPLAY_CURRENCIES);
const DEFAULT_DISPLAY_CURRENCY = DISPLAY_CURRENCIES.includes('EUR')
  ? 'EUR'
  : DISPLAY_CURRENCIES[0];
const DEFAULT_DISPLAY_CURRENCY_TO_EUR =
  CURRENCY_TO_EUR_MAP.get(DEFAULT_DISPLAY_CURRENCY) ?? 1;
const LARGE_DIGIT_CURRENCIES = new Set(['NOK', 'DKK', 'JPY']);
const RATE_TYPE_TO_HASH = {
  marginal: 'marginal',
  cumulative: 'overall',
  'tax-paid': 'tax_paid',
  'net-pay': 'net_pay',
};
const HASH_TO_RATE_TYPE = new Map([
  ['marginal', 'marginal'],
  ['overall', 'cumulative'],
  ['cumulative', 'cumulative'],
  ['tax_paid', 'tax-paid'],
  ['taxpaid', 'tax-paid'],
  ['tax-paid', 'tax-paid'],
  ['net_pay', 'net-pay'],
  ['netpay', 'net-pay'],
  ['net-pay', 'net-pay'],
]);
const RATE_PERCENT_SCALE = 100;

function toHashIdentifier(value) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const SCHEDULE_TYPE_TO_HASH = Object.fromEntries(
  SCHEDULE_TYPES.map((scheduleType) => [scheduleType, toHashIdentifier(scheduleType)])
);
const HASH_TO_SCHEDULE_TYPE = new Map(
  SCHEDULE_TYPES.map((scheduleType) => [SCHEDULE_TYPE_TO_HASH[scheduleType], scheduleType])
);
const COUNTRY_LOOKUP = (() => {
  const lookup = new Map();

  COUNTRY_LINES.forEach((countryLine) => {
    const normalizedCountry = countryLine.country.normalize('NFKC').trim().toLowerCase();
    const normalizedCountryLabel = countryLine.countryLabel.normalize('NFKC').trim().toLowerCase();
    lookup.set(normalizedCountry, countryLine.country);
    lookup.set(normalizedCountryLabel, countryLine.country);
  });

  return lookup;
})();
const SCHEDULE_LOOKUP = new Map(
  SCHEDULE_TYPES.map((scheduleType) => [
    scheduleType.normalize('NFKC').trim().toLowerCase(),
    scheduleType,
  ])
);

function decodeEnabledMap(encodedValue, keys, fallbackMap) {
  const decoded = { ...fallbackMap };
  if (!encodedValue || /[^01]/.test(encodedValue)) {
    return decoded;
  }

  keys.forEach((key, index) => {
    if (index < encodedValue.length) {
      decoded[key] = encodedValue[index] === '1';
    }
  });

  return decoded;
}

function parseCommaList(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function decodeCountriesFromList(rawCountries, fallbackMap) {
  const countryTokens = parseCommaList(rawCountries);
  if (countryTokens === null) {
    return { ...fallbackMap };
  }

  const decoded = Object.fromEntries(COUNTRY_KEYS.map((country) => [country, false]));
  countryTokens.forEach((countryToken) => {
    const normalized = countryToken.normalize('NFKC').trim().toLowerCase();
    const resolvedCountry = COUNTRY_LOOKUP.get(normalized);
    if (resolvedCountry) {
      decoded[resolvedCountry] = true;
    }
  });

  return decoded;
}

function decodeSchedulesFromList(rawSchedules, fallbackMap) {
  const scheduleTokens = parseCommaList(rawSchedules);
  if (scheduleTokens === null) {
    return { ...fallbackMap };
  }

  const decoded = Object.fromEntries(SCHEDULE_TYPES.map((scheduleType) => [scheduleType, false]));
  scheduleTokens.forEach((scheduleToken) => {
    const normalizedToken = toHashIdentifier(scheduleToken);
    const byHash = HASH_TO_SCHEDULE_TYPE.get(normalizedToken);
    if (byHash) {
      decoded[byHash] = true;
      return;
    }

    const byName = SCHEDULE_LOOKUP.get(scheduleToken.normalize('NFKC').trim().toLowerCase());
    if (byName) {
      decoded[byName] = true;
    }
  });

  return decoded;
}

function decodeRateType(rawType, fallbackRateType) {
  if (!rawType) {
    return fallbackRateType;
  }

  const normalizedType = toHashIdentifier(rawType);
  return HASH_TO_RATE_TYPE.get(normalizedType) ?? fallbackRateType;
}

function usesThousandUnits(displayCurrency, displayCurrencyToEur, payPeriod) {
  if (payPeriod === 'annual') {
    return true;
  }

  const normalizedCurrency = String(displayCurrency || '')
    .normalize('NFKC')
    .trim()
    .toUpperCase();
  if (LARGE_DIGIT_CURRENCIES.has(normalizedCurrency)) {
    return true;
  }

  return Number.isFinite(displayCurrencyToEur) && displayCurrencyToEur < 0.2;
}

function getDisplayInputScale(displayCurrency, displayCurrencyToEur, payPeriod) {
  return usesThousandUnits(displayCurrency, displayCurrencyToEur, payPeriod) ? 1000 : 1;
}

function parseHashRange(rawRange, displayCurrencyToEur, periodsPerYear, displayInputScale) {
  const safeCurrencyToEur =
    Number.isFinite(displayCurrencyToEur) && displayCurrencyToEur > 0
      ? displayCurrencyToEur
      : DEFAULT_DISPLAY_CURRENCY_TO_EUR;
  const safePeriodsPerYear =
    Number.isFinite(periodsPerYear) && periodsPerYear > 0
      ? periodsPerYear
      : PAY_PERIODS_PER_YEAR[DEFAULT_PAY_PERIOD];
  const safeDisplayInputScale =
    Number.isFinite(displayInputScale) && displayInputScale > 0 ? displayInputScale : 1000;
  let minDisplayInput = DEFAULT_MIN_EUR / (safeCurrencyToEur * safePeriodsPerYear * safeDisplayInputScale);
  let maxDisplayInput = DEFAULT_MAX_EUR / (safeCurrencyToEur * safePeriodsPerYear * safeDisplayInputScale);

  if (rawRange) {
    const [rawMin, rawMax] = rawRange.split(',', 2);
    const parsedMin = Number(rawMin);
    const parsedMax = Number(rawMax);

    if (Number.isFinite(parsedMin)) {
      minDisplayInput = Math.max(0, parsedMin);
    }
    if (Number.isFinite(parsedMax)) {
      maxDisplayInput = Math.max(0, parsedMax);
    }
  }

  return {
    minKEurInput: String(minDisplayInput),
    maxKEurInput: String(maxDisplayInput),
  };
}

function convertInputBetweenDisplayContexts(inputValue, fromContext, toContext) {
  const parsed = Number(inputValue);
  const fromCurrencyToEur = fromContext?.currencyToEur;
  const toCurrencyToEur = toContext?.currencyToEur;
  const fromPeriodsPerYear = fromContext?.periodsPerYear;
  const toPeriodsPerYear = toContext?.periodsPerYear;
  const fromInputScale = fromContext?.inputScale;
  const toInputScale = toContext?.inputScale;

  if (
    !Number.isFinite(parsed) ||
    !Number.isFinite(fromCurrencyToEur) ||
    fromCurrencyToEur <= 0 ||
    !Number.isFinite(toCurrencyToEur) ||
    toCurrencyToEur <= 0 ||
    !Number.isFinite(fromPeriodsPerYear) ||
    fromPeriodsPerYear <= 0 ||
    !Number.isFinite(toPeriodsPerYear) ||
    toPeriodsPerYear <= 0 ||
    !Number.isFinite(fromInputScale) ||
    fromInputScale <= 0 ||
    !Number.isFinite(toInputScale) ||
    toInputScale <= 0
  ) {
    return inputValue;
  }

  const annualEurValue = parsed * fromInputScale * fromPeriodsPerYear * fromCurrencyToEur;
  const converted = annualEurValue / (toCurrencyToEur * toPeriodsPerYear * toInputScale);
  return String(Number(converted.toFixed(6)));
}

function loadInitialStateFromHash() {
  const defaultPeriodsPerYear = PAY_PERIODS_PER_YEAR[DEFAULT_PAY_PERIOD];
  const defaultDisplayInputScale = getDisplayInputScale(
    DEFAULT_DISPLAY_CURRENCY,
    DEFAULT_DISPLAY_CURRENCY_TO_EUR,
    DEFAULT_PAY_PERIOD
  );
  const defaultState = {
    enabledCountries: { ...DEFAULT_ENABLED_COUNTRIES },
    enabledSchedules: { ...DEFAULT_ENABLED_SCHEDULES },
    rateType: 'marginal',
    displayCurrency: DEFAULT_DISPLAY_CURRENCY,
    payPeriod: DEFAULT_PAY_PERIOD,
    minKEurInput: String(
      DEFAULT_MIN_EUR /
        (DEFAULT_DISPLAY_CURRENCY_TO_EUR * defaultPeriodsPerYear * defaultDisplayInputScale)
    ),
    maxKEurInput: String(
      DEFAULT_MAX_EUR /
        (DEFAULT_DISPLAY_CURRENCY_TO_EUR * defaultPeriodsPerYear * defaultDisplayInputScale)
    ),
  };

  if (typeof window === 'undefined' || !window.location.hash) {
    return defaultState;
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const hashRateType = hashParams.get('type') ?? hashParams.get('r');
  const hashDisplayCurrency = hashParams.get('currency') ?? hashParams.get('u');
  const hashPayPeriod = hashParams.get('period');
  const payPeriod = PAY_PERIOD_SET.has(hashPayPeriod)
    ? hashPayPeriod
    : defaultState.payPeriod;
  const displayCurrency = DISPLAY_CURRENCY_SET.has(hashDisplayCurrency)
    ? hashDisplayCurrency
    : defaultState.displayCurrency;
  const displayCurrencyToEur =
    CURRENCY_TO_EUR_MAP.get(displayCurrency) ?? DEFAULT_DISPLAY_CURRENCY_TO_EUR;
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod] ?? defaultPeriodsPerYear;
  const displayInputScale = getDisplayInputScale(
    displayCurrency,
    displayCurrencyToEur,
    payPeriod
  );
  const parsedRange = parseHashRange(
    hashParams.get('x_range') ?? hashParams.get('x'),
    displayCurrencyToEur,
    periodsPerYear,
    displayInputScale
  );
  const countriesParam = hashParams.get('countries');
  const schedulesParam = hashParams.get('schedules');
  const useExplicitCountryList = countriesParam !== null;
  const useExplicitScheduleList = schedulesParam !== null;

  return {
    enabledCountries: useExplicitCountryList
      ? decodeCountriesFromList(countriesParam, defaultState.enabledCountries)
      : decodeEnabledMap(hashParams.get('c'), COUNTRY_KEYS, defaultState.enabledCountries),
    enabledSchedules: useExplicitScheduleList
      ? decodeSchedulesFromList(schedulesParam, defaultState.enabledSchedules)
      : decodeEnabledMap(hashParams.get('s'), SCHEDULE_TYPES, defaultState.enabledSchedules),
    rateType: decodeRateType(hashRateType, defaultState.rateType),
    displayCurrency,
    payPeriod,
    minKEurInput: parsedRange.minKEurInput,
    maxKEurInput: parsedRange.maxKEurInput,
  };
}

function fractionDigitsForStep(step) {
  if (!Number.isFinite(step) || step <= 0) {
    return 0;
  }

  return Math.max(0, -Math.floor(Math.log10(step)));
}

function chooseNiceStep(range, targetTicks = 8) {
  if (!Number.isFinite(range) || range <= 0) {
    return 1;
  }

  const roughStep = range / targetTicks;
  const exponent = Math.floor(Math.log10(roughStep));
  const magnitude = 10 ** exponent;
  const residual = roughStep / magnitude;

  let niceResidual = 1;
  if (residual > 5) {
    niceResidual = 10;
  } else if (residual > 2) {
    niceResidual = 5;
  } else if (residual > 1) {
    niceResidual = 2;
  }

  return niceResidual * magnitude;
}

function chooseXAxisStep(range) {
  if (!Number.isFinite(range) || range <= 0) {
    return DEFAULT_X_TICK_STEP;
  }

  if (range > 500000) {
    return 100000;
  }

  if (range > 300000) {
    return 50000;
  }

  if (range < 20000) {
    return 2500;
  }

  if (range < 50000) {
    return 5000;
  }

  if (range < 100000) {
    return 10000;
  }

  return DEFAULT_X_TICK_STEP;
}

function clampInputAtZero(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(Math.max(0, parsed));
}

function App() {
  const initialHashState = useMemo(() => loadInitialStateFromHash(), []);
  const [enabledCountries, setEnabledCountries] = useState(initialHashState.enabledCountries);
  const [enabledSchedules, setEnabledSchedules] = useState(initialHashState.enabledSchedules);
  const [rateType, setRateType] = useState(initialHashState.rateType);
  const [displayCurrency, setDisplayCurrency] = useState(initialHashState.displayCurrency);
  const [payPeriod, setPayPeriod] = useState(initialHashState.payPeriod);
  const [minKEurInput, setMinKEurInput] = useState(initialHashState.minKEurInput);
  const [maxKEurInput, setMaxKEurInput] = useState(initialHashState.maxKEurInput);
  const [taxSpecificationInput, setTaxSpecificationInput] = useState(taxSpecification);
  const [runtimeInterpreter, setRuntimeInterpreter] = useState(() => TAX_INTERPRETER);
  const [taxSpecificationError, setTaxSpecificationError] = useState('');
  const hasSyncedHashRef = useRef(false);
  const editorOptions = useMemo(
    () => ({
      automaticLayout: true,
      fontSize: 13,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: 'on',
    }),
    []
  );

  const displayCurrencyToEur =
    CURRENCY_TO_EUR_MAP.get(displayCurrency) ?? DEFAULT_DISPLAY_CURRENCY_TO_EUR;
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod] ?? PAY_PERIODS_PER_YEAR[DEFAULT_PAY_PERIOD];
  const displayInputScale = getDisplayInputScale(
    displayCurrency,
    displayCurrencyToEur,
    payPeriod
  );
  const defaultMinKForDisplayCurrency =
    DEFAULT_MIN_EUR / (displayCurrencyToEur * periodsPerYear * displayInputScale);
  const defaultMaxKForDisplayCurrency =
    DEFAULT_MAX_EUR / (displayCurrencyToEur * periodsPerYear * displayInputScale);
  const payPeriodLabel =
    PAY_PERIOD_OPTIONS.find((payPeriodOption) => payPeriodOption.id === payPeriod)?.label ??
    'Annually';
  const xInputUsesThousands = displayInputScale === 1000;
  const xInputStep = payPeriod === 'annual' ? 1 : 10;
  const handleDisplayCurrencyChange = (event) => {
    const nextDisplayCurrency = event.target.value;
    if (
      !DISPLAY_CURRENCY_SET.has(nextDisplayCurrency) ||
      nextDisplayCurrency === displayCurrency
    ) {
      return;
    }

    const nextCurrencyToEur =
      CURRENCY_TO_EUR_MAP.get(nextDisplayCurrency) ?? DEFAULT_DISPLAY_CURRENCY_TO_EUR;
    const currentCurrencyToEur = displayCurrencyToEur;
    const nextDisplayInputScale = getDisplayInputScale(
      nextDisplayCurrency,
      nextCurrencyToEur,
      payPeriod
    );

    setMinKEurInput((current) =>
      convertInputBetweenDisplayContexts(
        current,
        {
          currencyToEur: currentCurrencyToEur,
          periodsPerYear,
          inputScale: displayInputScale,
        },
        {
          currencyToEur: nextCurrencyToEur,
          periodsPerYear,
          inputScale: nextDisplayInputScale,
        }
      )
    );
    setMaxKEurInput((current) =>
      convertInputBetweenDisplayContexts(
        current,
        {
          currencyToEur: currentCurrencyToEur,
          periodsPerYear,
          inputScale: displayInputScale,
        },
        {
          currencyToEur: nextCurrencyToEur,
          periodsPerYear,
          inputScale: nextDisplayInputScale,
        }
      )
    );
    setDisplayCurrency(nextDisplayCurrency);
  };
  const handlePayPeriodChange = (event) => {
    const nextPayPeriod = event.target.value;
    if (!PAY_PERIOD_SET.has(nextPayPeriod) || nextPayPeriod === payPeriod) {
      return;
    }

    const nextPeriodsPerYear =
      PAY_PERIODS_PER_YEAR[nextPayPeriod] ?? PAY_PERIODS_PER_YEAR[DEFAULT_PAY_PERIOD];
    const nextDisplayInputScale = getDisplayInputScale(
      displayCurrency,
      displayCurrencyToEur,
      nextPayPeriod
    );

    setMinKEurInput((current) =>
      convertInputBetweenDisplayContexts(
        current,
        {
          currencyToEur: displayCurrencyToEur,
          periodsPerYear,
          inputScale: displayInputScale,
        },
        {
          currencyToEur: displayCurrencyToEur,
          periodsPerYear: nextPeriodsPerYear,
          inputScale: nextDisplayInputScale,
        }
      )
    );
    setMaxKEurInput((current) =>
      convertInputBetweenDisplayContexts(
        current,
        {
          currencyToEur: displayCurrencyToEur,
          periodsPerYear,
          inputScale: displayInputScale,
        },
        {
          currencyToEur: displayCurrencyToEur,
          periodsPerYear: nextPeriodsPerYear,
          inputScale: nextDisplayInputScale,
        }
      )
    );
    setPayPeriod(nextPayPeriod);
  };

  const parsedMinKEur = Number(minKEurInput);
  const parsedMaxKEur = Number(maxKEurInput);
  const minKEur = Number.isFinite(parsedMinKEur) ? Math.max(0, parsedMinKEur) : NaN;
  const maxKEur = Number.isFinite(parsedMaxKEur) ? Math.max(0, parsedMaxKEur) : NaN;
  const minKEurForHash = Number.isFinite(minKEur) ? minKEur : defaultMinKForDisplayCurrency;
  const maxKEurForHash = Number.isFinite(maxKEur) ? maxKEur : defaultMaxKForDisplayCurrency;
  const hasValidXRange =
    Number.isFinite(minKEur) &&
    Number.isFinite(maxKEur) &&
    maxKEur > minKEur;
  const minDisplayCurrency = hasValidXRange
    ? minKEur * displayInputScale
    : defaultMinKForDisplayCurrency * displayInputScale;
  const maxDisplayCurrency = hasValidXRange
    ? maxKEur * displayInputScale
    : defaultMaxKForDisplayCurrency * displayInputScale;
  const xRenderBufferDisplayCurrency = (maxDisplayCurrency - minDisplayCurrency) * 0.05;
  const renderMinDisplayCurrency = minDisplayCurrency - xRenderBufferDisplayCurrency;
  const renderMaxDisplayCurrency = maxDisplayCurrency + xRenderBufferDisplayCurrency;
  const xAxisStep = useMemo(
    () => chooseXAxisStep(maxDisplayCurrency - minDisplayCurrency),
    [minDisplayCurrency, maxDisplayCurrency]
  );

  useEffect(() => {
    try {
      const nextInterpreter = new TaxSpecInterpreter(taxSpecificationInput, CURRENCY_TO_EUR_RATES);
      setRuntimeInterpreter(nextInterpreter);
      setTaxSpecificationError('');
    } catch (error) {
      setTaxSpecificationError(error instanceof Error ? error.message : String(error));
    }
  }, [taxSpecificationInput]);

  const allCountryLines = useMemo(() => COUNTRY_LINES, []);

  const visibleCountryLines = useMemo(
    () =>
      allCountryLines
        .filter((countryLine) => Boolean(enabledCountries[countryLine.country]))
        .map((countryLine) => {
          const activeScheduleKinds = countryLine.scheduleKinds.filter((scheduleKind) =>
            Boolean(enabledSchedules[scheduleLabelFromKind(scheduleKind)])
          );
          let preparedEvaluator = null;
          if (activeScheduleKinds.length > 0) {
            try {
              preparedEvaluator = runtimeInterpreter.prepare(
                countryLine.country,
                activeScheduleKinds,
                displayCurrency
              );
            } catch {
              preparedEvaluator = null;
            }
          }

          const marginalRateAtDisplayIncome = (grossIncomeDisplayCurrency) => {
            if (grossIncomeDisplayCurrency < 0 || !preparedEvaluator) {
              return undefined;
            }

            const grossIncomeAnnualDisplayCurrency = grossIncomeDisplayCurrency * periodsPerYear;
            const marginalRate = preparedEvaluator.marginalRate(grossIncomeAnnualDisplayCurrency);
            return Number.isFinite(marginalRate) ? marginalRate * RATE_PERCENT_SCALE : 0;
          };

          const cumulativeTaxPaidAtDisplayIncome = (grossIncomeDisplayCurrency) => {
            if (grossIncomeDisplayCurrency < 0 || !preparedEvaluator) {
              return undefined;
            }

            const grossIncomeAnnualDisplayCurrency = grossIncomeDisplayCurrency * periodsPerYear;
            const overallRate = preparedEvaluator.overallRate(grossIncomeAnnualDisplayCurrency);
            if (!Number.isFinite(overallRate)) {
              return undefined;
            }

            return (overallRate * grossIncomeAnnualDisplayCurrency) / periodsPerYear;
          };

          const netPayAtDisplayIncome = (grossIncomeDisplayCurrency) => {
            if (grossIncomeDisplayCurrency < 0) {
              return undefined;
            }

            return grossIncomeDisplayCurrency - cumulativeTaxPaidAtDisplayIncome(grossIncomeDisplayCurrency);
          };

          const cumulativeRateAtDisplayIncome = (grossIncomeDisplayCurrency) => {
            if (grossIncomeDisplayCurrency < 0) {
              return undefined;
            }

            if (grossIncomeDisplayCurrency === 0) {
              return 0;
            }

            return (
              cumulativeTaxPaidAtDisplayIncome(grossIncomeDisplayCurrency) /
              grossIncomeDisplayCurrency *
              RATE_PERCENT_SCALE
            );
          };

          return {
            ...countryLine,
            activeScheduleKinds,
            marginalRateAtDisplayIncome,
            cumulativeRateAtDisplayIncome,
            cumulativeTaxPaidAtDisplayIncome,
            netPayAtDisplayIncome,
          };
        }),
    [
      allCountryLines,
      enabledCountries,
      enabledSchedules,
      displayCurrency,
      periodsPerYear,
      runtimeInterpreter,
    ]
  );

  const plottedCountryLines = useMemo(
    () => visibleCountryLines.filter((countryLine) => countryLine.activeScheduleKinds.length > 0),
    [visibleCountryLines]
  );

  const hasEnabledCountry = visibleCountryLines.length > 0;
  const hasPlottedLines = plottedCountryLines.length > 0;

  const xAxisLabel = useMemo(
    () => createCurrencyLabelFormatter(displayCurrency),
    [displayCurrency]
  );

  const yAxisConfig = useMemo(() => {
    const isAbsoluteMode = rateType === 'tax-paid' || rateType === 'net-pay';
    const absoluteValueLabel = createCurrencyLabelFormatter(displayCurrency);
    let maxValue = 0;
    let minValue = 0;
    const sampleCount = 160;

    if (hasPlottedLines) {
      for (const countryLine of plottedCountryLines) {
        for (let index = 0; index <= sampleCount; index += 1) {
          const incomeDisplayCurrency =
            renderMinDisplayCurrency +
            ((renderMaxDisplayCurrency - renderMinDisplayCurrency) * index) / sampleCount;
          const value =
            rateType === 'marginal'
              ? countryLine.marginalRateAtDisplayIncome(incomeDisplayCurrency)
              : rateType === 'cumulative'
                ? countryLine.cumulativeRateAtDisplayIncome(incomeDisplayCurrency)
                : rateType === 'tax-paid'
                  ? countryLine.cumulativeTaxPaidAtDisplayIncome(incomeDisplayCurrency)
                  : countryLine.netPayAtDisplayIncome(incomeDisplayCurrency);

          if (Number.isFinite(value)) {
            if (value > maxValue) {
              maxValue = value;
            }
            if (value < minValue) {
              minValue = value;
            }
          }
        }
      }
    }

    const fallbackMax = isAbsoluteMode ? 1000 : RATE_PERCENT_SCALE;
    const safeMaxValue = maxValue > 0 ? maxValue : fallbackMax;
    const safeMinValue = minValue < 0 ? minValue : 0;
    const computedYMin = Math.min(-0.1 * safeMaxValue, 1.1 * safeMinValue);
    const yMin = rateType === 'cumulative' ? Math.max(computedYMin, -10) : computedYMin;
    const yMax = 1.1 * safeMaxValue;
    const yStep = chooseNiceStep(yMax - yMin, 8);

    if (isAbsoluteMode) {
      return {
        yMin,
        yMax,
        yStep,
        yLabel: absoluteValueLabel,
      };
    }

    const decimals = fractionDigitsForStep(yStep);
    return {
      yMin,
      yMax,
      yStep,
      yLabel: (value) => `${value.toFixed(decimals)}%`,
    };
  }, [
    rateType,
    hasPlottedLines,
    plottedCountryLines,
    renderMinDisplayCurrency,
    renderMaxDisplayCurrency,
    displayCurrency,
  ]);
  const viewYMax = yAxisConfig.yMax;
  const viewYMin = yAxisConfig.yMin;
  const netPayReferenceStartX = Math.max(0, renderMinDisplayCurrency);
  const showNetPayReference =
    rateType === 'net-pay' && renderMaxDisplayCurrency > netPayReferenceStartX;
  const enabledCountriesForHash = useMemo(
    () => COUNTRY_KEYS.filter((country) => Boolean(enabledCountries[country])).join(','),
    [enabledCountries]
  );
  const enabledSchedulesForHash = useMemo(
    () =>
      SCHEDULE_TYPES
        .filter((scheduleType) => Boolean(enabledSchedules[scheduleType]))
        .map((scheduleType) => SCHEDULE_TYPE_TO_HASH[scheduleType])
        .join(','),
    [enabledSchedules]
  );
  const rateTypeForHash = RATE_TYPE_TO_HASH[rateType] ?? RATE_TYPE_TO_HASH.marginal;
  const displayCurrencyForHash = DISPLAY_CURRENCY_SET.has(displayCurrency)
    ? displayCurrency
    : DEFAULT_DISPLAY_CURRENCY;
  const payPeriodForHash = PAY_PERIOD_SET.has(payPeriod) ? payPeriod : DEFAULT_PAY_PERIOD;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const applyStateFromHash = () => {
      const nextHashState = loadInitialStateFromHash();
      setEnabledCountries(nextHashState.enabledCountries);
      setEnabledSchedules(nextHashState.enabledSchedules);
      setRateType(nextHashState.rateType);
      setDisplayCurrency(nextHashState.displayCurrency);
      setPayPeriod(nextHashState.payPeriod);
      setMinKEurInput(nextHashState.minKEurInput);
      setMaxKEurInput(nextHashState.maxKEurInput);
    };

    const handleHashChange = () => {
      applyStateFromHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hashParams = new URLSearchParams();
    hashParams.set('countries', enabledCountriesForHash);
    hashParams.set('schedules', enabledSchedulesForHash);
    hashParams.set('currency', displayCurrencyForHash);
    hashParams.set('period', payPeriodForHash);
    hashParams.set('x_range', `${minKEurForHash},${maxKEurForHash}`);
    hashParams.set('type', rateTypeForHash);

    const nextHash = hashParams.toString().replace(/%2C/gi, ',');
    if (nextHash !== window.location.hash.slice(1)) {
      if (!hasSyncedHashRef.current) {
        const nextUrl = `${window.location.pathname}${window.location.search}#${nextHash}`;
        window.history.replaceState(null, '', nextUrl);
        hasSyncedHashRef.current = true;
      } else {
        window.location.hash = nextHash;
      }
    } else {
      hasSyncedHashRef.current = true;
    }
  }, [
    enabledCountriesForHash,
    enabledSchedulesForHash,
    rateTypeForHash,
    displayCurrencyForHash,
    payPeriodForHash,
    minKEurForHash,
    maxKEurForHash,
  ]);

  return (
    <main className="app">
      <h1>Income Tax Plotter</h1>

      <section className="controls-panel">
        {/* <div className="control-card">
          <h2>Countries</h2>
          {COUNTRY_LINES.map((countryLine) => (
            <label key={countryLine.country} className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(enabledCountries[countryLine.country])}
                onChange={() =>
                  setEnabledCountries((previous) => ({
                    ...previous,
                    [countryLine.country]: !previous[countryLine.country],
                  }))
                }
              />
              {countryLine.countryLabel}
            </label>
          ))}
        </div> */}

        <div className="control-card">
          <h2>Schedules</h2>
          {SCHEDULE_TYPES.map((scheduleType) => (
            <label key={scheduleType} className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(enabledSchedules[scheduleType])}
                onChange={() =>
                  setEnabledSchedules((previous) => ({
                    ...previous,
                    [scheduleType]: !previous[scheduleType],
                  }))
                }
              />
              {scheduleType}
            </label>
          ))}
        </div>

        <div className="control-card">
          <h2>Currency</h2>
          <label className="select-row">
            Display currency
            <select
              value={displayCurrency}
              onChange={handleDisplayCurrencyChange}
            >
              {DISPLAY_CURRENCIES.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="control-card">
          <h2>Frequency</h2>
          <label className="select-row">
            Income frequency
            <select value={payPeriod} onChange={handlePayPeriodChange}>
              {PAY_PERIOD_OPTIONS.map((payPeriodOption) => (
                <option key={payPeriodOption.id} value={payPeriodOption.id}>
                  {payPeriodOption.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="control-card">
          <h2>
            {xInputUsesThousands
              ? `X Range (thousand ${displayCurrency} ${payPeriodLabel.toLowerCase()})`
              : `X Range (${displayCurrency} ${payPeriodLabel.toLowerCase()})`}
          </h2>
          <div className="range-inputs">
            <label>
              {xInputUsesThousands
                ? `Min (k${displayCurrency})`
                : `Min (${displayCurrency})`}
              <input
                type="number"
                min="0"
                step={xInputStep}
                value={minKEurInput}
                onChange={(event) => setMinKEurInput(event.target.value)}
                onBlur={() =>
                  setMinKEurInput((current) =>
                    clampInputAtZero(current, String(defaultMinKForDisplayCurrency))
                  )
                }
              />
            </label>
            <label>
              {xInputUsesThousands
                ? `Max (k${displayCurrency})`
                : `Max (${displayCurrency})`}
              <input
                type="number"
                min="0"
                step={xInputStep}
                value={maxKEurInput}
                onChange={(event) => setMaxKEurInput(event.target.value)}
                onBlur={() =>
                  setMaxKEurInput((current) =>
                    clampInputAtZero(current, String(defaultMaxKForDisplayCurrency))
                  )
                }
              />
            </label>
          </div>
          {!hasValidXRange && (
            <p className="validation-error">
              {xInputUsesThousands
                ? `Enter a valid x range in thousand ${displayCurrency} where max is greater than min.`
                : `Enter a valid x range in ${displayCurrency} where max is greater than min.`}
            </p>
          )}
        </div>

        <div className="control-card">
          <h2>Rate Type</h2>
          <label className="toggle-row">
            <input
              type="radio"
              name="rate-type"
              checked={rateType === 'marginal'}
              onChange={() => setRateType('marginal')}
            />
            Marginal tax rate
          </label>
          <label className="toggle-row">
            <input
              type="radio"
              name="rate-type"
              checked={rateType === 'cumulative'}
              onChange={() => setRateType('cumulative')}
            />
            Overall tax rate
          </label>
          <label className="toggle-row">
            <input
              type="radio"
              name="rate-type"
              checked={rateType === 'tax-paid'}
              onChange={() => setRateType('tax-paid')}
            />
            Overall tax paid
          </label>
          <label className="toggle-row">
            <input
              type="radio"
              name="rate-type"
              checked={rateType === 'net-pay'}
              onChange={() => setRateType('net-pay')}
            />
            Net pay
          </label>
        </div>
      </section>

      <section className="legend-panel">
        <div className="legend-country-list">
          {COUNTRY_LINES.map((countryLine) => {
            const isActive = Boolean(enabledCountries[countryLine.country]);

            return (
              <button
                type="button"
                key={countryLine.country}
                className={`legend-item legend-item-button${isActive ? '' : ' legend-item-muted'}`}
                onClick={() =>
                  setEnabledCountries((previous) => ({
                    ...previous,
                    [countryLine.country]: !previous[countryLine.country],
                  }))
                }
                aria-pressed={isActive}
                title={
                  isActive
                    ? `Hide ${countryLine.countryLabel}`
                    : `Show ${countryLine.countryLabel}`
                }
              >
                <span
                  className="legend-color"
                  style={{ backgroundColor: countryLine.color }}
                />
                {countryLine.countryLabel}
              </button>
            );
          })}
        </div>
      </section>

      <section className="graph-panel">
        <Mafs
          height={460}
          pan={false}
          zoom={false}
          preserveAspectRatio={false}
          viewBox={{
            x: [renderMinDisplayCurrency, renderMaxDisplayCurrency],
            y: [viewYMin, viewYMax],
            padding: 0,
          }}
        >
          <Coordinates.Cartesian
            xAxis={{ labels: xAxisLabel, lines: xAxisStep }}
            yAxis={{ axis: true, labels: yAxisConfig.yLabel, lines: yAxisConfig.yStep }}
          />
          {showNetPayReference && (
            <Plot.OfX
              y={(x) => x}
              domain={[netPayReferenceStartX, renderMaxDisplayCurrency]}
              color="#94a3b8"
              weight={1.5}
              svgPathProps={{ strokeDasharray: '2 6' }}
            />
          )}
          {plottedCountryLines.map((countryLine) => (
            <Plot.OfX
              key={countryLine.country}
              y={
                rateType === 'marginal'
                  ? countryLine.marginalRateAtDisplayIncome
                  : rateType === 'cumulative'
                    ? countryLine.cumulativeRateAtDisplayIncome
                    : rateType === 'tax-paid'
                      ? countryLine.cumulativeTaxPaidAtDisplayIncome
                      : countryLine.netPayAtDisplayIncome
              }
              domain={[renderMinDisplayCurrency, renderMaxDisplayCurrency]}
              color={countryLine.color}
              weight={2}
            />
          ))}
          <Coordinates.Cartesian
            xAxis={{ axis: true, labels: false, lines: false }}
            yAxis={{ axis: true, labels: false, lines: false }}
          />
        </Mafs>
        {!hasEnabledCountry && (
          <p className="validation-error">Enable at least one country.</p>
        )}
        {hasEnabledCountry && !hasPlottedLines && (
          <p className="validation-error">Enable at least one schedule.</p>
        )}
        {allCountryLines
          .filter((countryLine) => countryLine.scheduleKinds.length === 0)
          .map((countryLine) => (
            <p key={countryLine.country} className="validation-error">
              No {countryLine.countryLabel} schedule found in `income.tax`.
            </p>
          ))}
      </section>

      <section className="taxspec-workbench">
        <div className="taxspec-doc-panel">
          <h2>Tax Specification Documentation</h2>
          <div className="taxspec-doc-content">
            <div className="taxspec-doc-section">
              <h3>1. File Structure</h3>
              <p>
                A tax specification file is a sequence of country blocks. Each country declares currency
                metadata and component formulas.
              </p>
              <pre className="taxspec-doc-code"><code>{`Germany (EUR) {
  IncomeTax : income_tax = { brackets(x; [0..50000]: 0.2; [50000..inf]: 0.4;) };
  Pension : social_security = { 0.093 * x };
}`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>2. Currency Metadata</h3>
              <p>
                Country headers support three forms. Conversion declarations are relative to EUR
                and drive plotting conversion directly.
              </p>
              <pre className="taxspec-doc-code"><code>{`Germany (EUR) { ... }                     // bare currency
Australia (AUD = 0.59642094 * EUR) { ... } // direct
Norway (11.26032290 NOK = EUR) { ... }     // reverse`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>3. Components And Kinds</h3>
              <p>
                Components use <code>Name : kind = {'{ ... }'}</code>. Kinds control UI grouping
                (for example <code>income_tax</code>, <code>social_security</code>). Kind <code>_</code> is for helper components.
              </p>
              <pre className="taxspec-doc-code"><code>{`BaseTax : income_tax = { ... };
Pension : social_security = { ... };
HelperValue : _ = { ... };`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>4. Wrapper Semantics</h3>
              <p>
                Component bodies are always wrapped in braces. The expression inside braces is the
                total amount function; marginal rates are derived from that.
              </p>
              <pre className="taxspec-doc-code"><code>{`IncomeTax : income_tax = {
  brackets(
    x;
    [0..18200]: 0;
    [18200..45000]: 0.16;
    [45000..inf]: 0.30;
  )
};`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>5. Expressions And Control Flow</h3>
              <p>
                Expressions support arithmetic (<code>+ - * / ^</code>), comparisons
                (<code>&lt; &lt;= &gt; &gt;= == !=</code>), boolean logic
                (<code>and or not</code>), boolean literals (<code>true false</code>), and local
                bindings with <code>let</code>. Income selector is <code>x</code>.
              </p>
              <pre className="taxspec-doc-code"><code>{`Levy : social_security = {
  let threshold = 27222;
  piece {
    x <= threshold: 0;
    else: 0.02 * x;
  }
};`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>6. Schedule Helpers</h3>
              <ul className="taxspec-doc-bullets">
                <li>
                  <code>brackets(selector; [a..b]: rate; ...)</code>: computes total banded tax by
                  integrating the per-band rate expression over each bracket. Example:
                  <code>{`brackets(x; [0..20000]: 0.1; [20000..inf]: 0.2;)`}</code>
                </li>
                <li>
                  <code>bracketsTaxable(income, allowanceExpr, allowanceBase; ...)</code>:
                  computes bracket tax after reducing taxable income by an allowance expression,
                  capped by <code>allowanceBase</code>. Example:
                  <code>{`bracketsTaxable(x, PA, 12570; [0..12570]: 0; [12570..inf]: 0.2;)`}</code>
                </li>
              </ul>
              <pre className="taxspec-doc-code"><code>{`IncomeTax : income_tax = {
  bracketsTaxable(x, 12570, 12570;
    [0..12570]: 0;
    [12570..50270]: 0.20;
    [50270..inf]: 0.40;
  )
};`}</code></pre>
            </div>

            <div className="taxspec-doc-section">
              <h3>7. References And Runtime Calls</h3>
              <p>
                References can be written as <code>Name</code>, <code>Kind.Name</code>,
                <code>Country.Name</code>, or <code>Country.Kind.Name</code>.
              </p>
              <ul className="taxspec-doc-bullets">
                <li>
                  <code>T(ref)</code>: total value of another component at the current income.
                  Example:
                  <code>{`0.09 * T(IncomeTax)`}</code>
                </li>
                <li>
                  <code>eval(ref, income)</code>: evaluate a component at an explicit income.
                  Example:
                  <code>{`eval(IncomeTax, x - 5000)`}</code>
                </li>
                <li>
                  <code>fix(init, updateExpr)</code>: fixed-point iteration with state variable
                  <code>k</code>, used for circular dependencies. Example:
                  <code>{`fix(0, 0.09 * eval(IncomeTax, pos(x - k)))`}</code>
                </li>
              </ul>
              <pre className="taxspec-doc-code"><code>{`ChurchTax : religious = {
  0.09 * T(IncomeTax)
};`}</code></pre>
              <p>
                Direct bare component references are not supported; use <code>T(...)</code> for
                cross-component lookups.
              </p>
            </div>

            <div className="taxspec-doc-section">
              <h3>8. Built-In Functions (All With Examples)</h3>
              <ul className="taxspec-doc-bullets">
                <li><code>min(...values)</code>: smallest value. Example: <code>{`min(0.19, 0.2, 0.4)`}</code></li>
                <li><code>max(...values)</code>: largest value. Example: <code>{`max(0, x - 12570)`}</code></li>
                <li><code>abs(x)</code>: absolute value. Example: <code>{`abs(x - 50000)`}</code></li>
                <li><code>pow(a, b)</code>: exponentiation. Example: <code>{`pow(x, 2)`}</code></li>
                <li><code>sqrt(x)</code>: square root. Example: <code>{`sqrt(max(0, x - 10000))`}</code></li>
                <li><code>log(x)</code>: natural log. Example: <code>{`log(max(1, x))`}</code></li>
                <li><code>exp(x)</code>: natural exponential. Example: <code>{`exp(0.01)`}</code></li>
                <li><code>floor(x, increment)</code>: floor to increment (default 1). Example: <code>{`floor(x, 100)`}</code></li>
                <li><code>ceil(x, increment)</code>: ceil to increment (default 1). Example: <code>{`ceil(x, 100)`}</code></li>
                <li><code>round(x, increment)</code>: round to increment (default 1). Example: <code>{`round(x, 100)`}</code></li>
                <li><code>sum(...values)</code>: numeric sum. Example: <code>{`sum(T(IncomeTax), T(SocialSecurity))`}</code></li>
                <li><code>if(cond, whenTrue, whenFalse)</code>: conditional expression. Example: <code>{`if(x > 50000, 0.02 * x, 0)`}</code></li>
                <li><code>pos(x)</code>: positive part, equivalent to <code>max(0, x)</code>. Example: <code>{`pos(x - 12570)`}</code></li>
              </ul>
              <pre className="taxspec-doc-code"><code>{`Helper : _ = {
  floor(x, 100) + max(0, min(5000, x - 20000))
};`}</code></pre>
            </div>
          </div>
        </div>
        <div className="taxspec-editor-panel">
          <h2>Tax Code</h2>
          <p className="taxspec-editor-hint">
            Edit `income.tax` syntax here. Valid edits are applied to the chart immediately.
          </p>
          <div className="taxspec-editor-frame">
            <Editor
              defaultLanguage="plaintext"
              value={taxSpecificationInput}
              onChange={(nextValue) => setTaxSpecificationInput(nextValue ?? '')}
              options={editorOptions}
              height="100%"
            />
          </div>
          {taxSpecificationError && (
            <p className="validation-error taxspec-editor-error">{taxSpecificationError}</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
