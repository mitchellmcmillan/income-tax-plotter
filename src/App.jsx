import { useEffect, useMemo, useState } from 'react';
import { Coordinates, Line, Mafs, Plot } from 'mafs';
import Editor from '@monaco-editor/react';
import taxSpecification from '../income.tax?raw';
import TaxSpecInterpreter from './TaxSpecInterpreter.js';
import { createPlotPlanner } from './plotPlanning.js';
import { createUrlPlotState } from './urlPlotState.js';
import githubMark from './assets/github-mark.svg';
import './App.css';

const DEFAULT_MIN_EUR = 0;
const DEFAULT_MAX_EUR = 150000;
const DEFAULT_X_TICK_STEP = 25000;
const X_AXIS_TARGET_TICKS = 6.5;
const X_AXIS_MIN_TICKS = 5;
const X_AXIS_MAX_TICKS = 8;
const X_AXIS_STEP_MULTIPLIERS = [2.5, 5, 10];
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

function createCompactNumberLabelFormatter() {
  const integerFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  });
  const compactThresholds = [
    { threshold: 1e12, suffix: 'T' },
    { threshold: 1e9, suffix: 'B' },
    { threshold: 1e6, suffix: 'M' },
    { threshold: 1e3, suffix: 'K' },
  ];

  return (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '';
    }

    const absolute = Math.abs(numeric);
    const sign = numeric < 0 ? '-' : '';
    for (const { threshold, suffix } of compactThresholds) {
      if (absolute >= threshold) {
        const scaled = absolute / threshold;
        const rounded =
          scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
        const compact = Number.isInteger(rounded)
          ? String(rounded)
          : rounded.toFixed(1).replace(/\.0$/, '');
        return `${sign}${compact}${suffix}`;
      }
    }

    return `${sign}${integerFormatter.format(absolute)}`;
  };
}

const TAX_INTERPRETER = new TaxSpecInterpreter(taxSpecification);
const TAX_CATALOGUE = TAX_INTERPRETER.getCatalogue();
const INITIAL_PLOT_PLANNER = createPlotPlanner(TAX_INTERPRETER);
const INITIAL_PLOT_CATALOGUE = INITIAL_PLOT_PLANNER.getCatalogue();
const CURRENCY_TO_EUR_RATES = Object.fromEntries(
  TAX_CATALOGUE.currencies.map(({ code, eurRate }) => [code, eurRate])
);
const COUNTRY_LINES = INITIAL_PLOT_CATALOGUE.countries.map((country) => ({
  country: country.id,
  countryLabel: country.label,
  currency: country.currency,
  scheduleKinds: country.schedules.map(({ id }) => id),
  color: country.color,
}));
const COUNTRY_KEYS = COUNTRY_LINES.map((countryLine) => countryLine.country);
const SCHEDULE_TYPES = [
  ...new Set(INITIAL_PLOT_CATALOGUE.countries.flatMap((country) =>
    country.schedules.map(({ label }) => label)
  )),
].sort((left, right) => {
  return (SCHEDULE_PRIORITY[left] ?? 99) - (SCHEDULE_PRIORITY[right] ?? 99)
    || left.localeCompare(right);
});
const DEFAULT_ENABLED_COUNTRIES = Object.fromEntries(
  COUNTRY_KEYS.map((country) => [country, true])
);
const DEFAULT_ENABLED_SCHEDULES = Object.fromEntries(
  SCHEDULE_TYPES.map((scheduleType) => [
    scheduleType,
    !/(?:student|education)\s+loan|religious\s+tax/i.test(scheduleType),
  ])
);
const DISPLAY_CURRENCIES = Object.keys(CURRENCY_TO_EUR_RATES).sort((left, right) => {
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
  CURRENCY_TO_EUR_RATES[DEFAULT_DISPLAY_CURRENCY] ?? 1;
const RATE_PERCENT_SCALE = 100;
const URL_PLOT_STATE = createUrlPlotState({
  countries: COUNTRY_LINES,
  schedules: SCHEDULE_TYPES,
  currenciesToEur: CURRENCY_TO_EUR_RATES,
  periodsPerYear: PAY_PERIODS_PER_YEAR,
  defaults: {
    enabledCountries: DEFAULT_ENABLED_COUNTRIES,
    enabledSchedules: DEFAULT_ENABLED_SCHEDULES,
    rateType: 'marginal',
    displayCurrency: DEFAULT_DISPLAY_CURRENCY,
    payPeriod: DEFAULT_PAY_PERIOD,
    minKEurInput: String(DEFAULT_MIN_EUR / (DEFAULT_DISPLAY_CURRENCY_TO_EUR * 1000)),
    maxKEurInput: String(DEFAULT_MAX_EUR / (DEFAULT_DISPLAY_CURRENCY_TO_EUR * 1000)),
  },
});

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

  const desiredStep = range / X_AXIS_TARGET_TICKS;
  const baseExponent = Math.floor(Math.log10(desiredStep));
  const stepCandidates = [];

  for (let exponent = baseExponent - 2; exponent <= baseExponent + 2; exponent += 1) {
    const magnitude = 10 ** exponent;
    for (const multiplier of X_AXIS_STEP_MULTIPLIERS) {
      const step = multiplier * magnitude;
      if (Number.isFinite(step) && step > 0) {
        stepCandidates.push(step);
      }
    }
  }

  const uniqueCandidates = [...new Set(stepCandidates)].sort((left, right) => left - right);
  if (uniqueCandidates.length === 0) {
    return DEFAULT_X_TICK_STEP;
  }

  const ratedCandidates = uniqueCandidates.map((step) => ({
    step,
    ticks: range / step,
  }));
  const candidatesWithinTickBand = ratedCandidates.filter(
    ({ ticks }) => ticks >= X_AXIS_MIN_TICKS && ticks <= X_AXIS_MAX_TICKS
  );
  const candidates = candidatesWithinTickBand.length > 0
    ? candidatesWithinTickBand
    : ratedCandidates;

  candidates.sort((left, right) => {
    const leftDelta = Math.abs(left.ticks - X_AXIS_TARGET_TICKS);
    const rightDelta = Math.abs(right.ticks - X_AXIS_TARGET_TICKS);
    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta;
    }

    return right.step - left.step;
  });

  return candidates[0].step;
}

function clampInputAtZero(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(Math.max(0, parsed));
}

function App() {
  const initialHashState = useMemo(() => URL_PLOT_STATE.parse(), []);
  const [enabledCountries, setEnabledCountries] = useState(initialHashState.enabledCountries);
  const [enabledSchedules, setEnabledSchedules] = useState(initialHashState.enabledSchedules);
  const [rateType, setRateType] = useState(initialHashState.rateType);
  const [displayCurrency, setDisplayCurrency] = useState(initialHashState.displayCurrency);
  const [payPeriod, setPayPeriod] = useState(initialHashState.payPeriod);
  const [minKEurInput, setMinKEurInput] = useState(initialHashState.minKEurInput);
  const [maxKEurInput, setMaxKEurInput] = useState(initialHashState.maxKEurInput);
  const [taxSpecificationInput, setTaxSpecificationInput] = useState(taxSpecification);
  const [plotPlanner, setPlotPlanner] = useState(() => INITIAL_PLOT_PLANNER);
  const [taxSpecificationError, setTaxSpecificationError] = useState('');
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
    CURRENCY_TO_EUR_RATES[displayCurrency] ?? DEFAULT_DISPLAY_CURRENCY_TO_EUR;
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod] ?? PAY_PERIODS_PER_YEAR[DEFAULT_PAY_PERIOD];
  const displayInputScale = URL_PLOT_STATE.getInputScale(displayCurrency, payPeriod);
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

    setMinKEurInput((current) =>
      URL_PLOT_STATE.convertInput(
        current,
        {
          displayCurrency,
          payPeriod,
        },
        {
          displayCurrency: nextDisplayCurrency,
          payPeriod,
        }
      )
    );
    setMaxKEurInput((current) =>
      URL_PLOT_STATE.convertInput(
        current,
        {
          displayCurrency,
          payPeriod,
        },
        {
          displayCurrency: nextDisplayCurrency,
          payPeriod,
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

    setMinKEurInput((current) =>
      URL_PLOT_STATE.convertInput(
        current,
        {
          displayCurrency,
          payPeriod,
        },
        {
          displayCurrency,
          payPeriod: nextPayPeriod,
        }
      )
    );
    setMaxKEurInput((current) =>
      URL_PLOT_STATE.convertInput(
        current,
        {
          displayCurrency,
          payPeriod,
        },
        {
          displayCurrency,
          payPeriod: nextPayPeriod,
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
      setPlotPlanner(createPlotPlanner(nextInterpreter));
      setTaxSpecificationError('');
    } catch (error) {
      setTaxSpecificationError(error instanceof Error ? error.message : String(error));
    }
  }, [taxSpecificationInput]);

  const plotCatalogue = plotPlanner.getCatalogue();
  const plotScheduleTypes = [...new Set(plotCatalogue.countries.flatMap((country) =>
    country.schedules.map(({ label }) => label)
  ))].sort((left, right) =>
    (SCHEDULE_PRIORITY[left] ?? 99) - (SCHEDULE_PRIORITY[right] ?? 99)
      || left.localeCompare(right)
  );
  const plotCurrencies = plotCatalogue.currencies.map(({ code }) => code).sort((left, right) => {
    if (left === 'EUR') return -1;
    if (right === 'EUR') return 1;
    return left.localeCompare(right);
  });
  const enabledCountryIds = plotCatalogue.countries
    .filter(({ id }) => Boolean(enabledCountries[id]))
    .map(({ id }) => id);
  const hasEnabledCountry = enabledCountryIds.length > 0;

  const xAxisLabel = useMemo(() => createCompactNumberLabelFormatter(), []);
  const plotPlan = useMemo(
    () =>
      plotPlanner.plan({
        rateType,
        countries: enabledCountryIds,
        enabledSchedules,
        displayCurrency,
        periodsPerYear,
        domainMin: renderMinDisplayCurrency,
        domainMax: renderMaxDisplayCurrency,
      }),
    [
      plotPlanner,
      enabledCountryIds,
      enabledSchedules,
      displayCurrency,
      periodsPerYear,
      rateType,
      renderMinDisplayCurrency,
      renderMaxDisplayCurrency,
    ]
  );
  const hasPlottedLines = plotPlan.series.length > 0;

  const yAxisConfig = useMemo(() => {
    const isAbsoluteMode = rateType === 'tax-paid' || rateType === 'net-pay';
    const absoluteValueLabel = createCurrencyLabelFormatter(displayCurrency);
    const maxValue = plotPlan.bounds?.maxValue ?? 0;
    const minValue = plotPlan.bounds?.minValue ?? 0;

    const fallbackMax = isAbsoluteMode ? 1000 : RATE_PERCENT_SCALE;
    const safeMaxValue = maxValue > 0 ? maxValue : fallbackMax;
    const safeMinValue = minValue < 0 ? minValue : 0;
    const computedYMin = Math.min(-0.1 * safeMaxValue, 1.1 * safeMinValue);
    const yMin =
      rateType === 'cumulative' || rateType === 'marginal-overall'
        ? Math.max(computedYMin, -10)
        : computedYMin;
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
    displayCurrency,
    plotPlan.bounds,
  ]);
  const viewYMax = yAxisConfig.yMax;
  const viewYMin = yAxisConfig.yMin;
  const netPayReferenceStartX = Math.max(0, renderMinDisplayCurrency);
  const showNetPayReference =
    rateType === 'net-pay' && renderMaxDisplayCurrency > netPayReferenceStartX;
  const discontinuityAwareSeries = plotPlan.series;

  useEffect(() => {
    return URL_PLOT_STATE.subscribe((nextHashState) => {
      setEnabledCountries(nextHashState.enabledCountries);
      setEnabledSchedules(nextHashState.enabledSchedules);
      setRateType(nextHashState.rateType);
      setDisplayCurrency(nextHashState.displayCurrency);
      setPayPeriod(nextHashState.payPeriod);
      setMinKEurInput(nextHashState.minKEurInput);
      setMaxKEurInput(nextHashState.maxKEurInput);
    });
  }, []);

  useEffect(() => {
    URL_PLOT_STATE.sync({
      enabledCountries,
      enabledSchedules,
      rateType,
      displayCurrency,
      payPeriod,
      minKEurInput: String(minKEurForHash),
      maxKEurInput: String(maxKEurForHash),
    });
  }, [
    enabledCountries,
    enabledSchedules,
    rateType,
    displayCurrency,
    payPeriod,
    minKEurForHash,
    maxKEurForHash,
  ]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Income Tax Plotter</h1>
        <a
          className="github-link"
          href="https://github.com/mitchellmcmillan/income-tax-plotter"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <img src={githubMark} alt="" aria-hidden="true" />
        </a>
      </header>

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
          {plotScheduleTypes.map((scheduleType) => (
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
              checked={rateType === 'marginal-overall'}
              onChange={() => setRateType('marginal-overall')}
            />
            Marginal + overall tax rate
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

        <div className="control-card control-card-combined">
          <h2>Display</h2>
          <div className="combined-select-grid">
            <label className="select-row">
              Display currency
              <select
                value={displayCurrency}
                onChange={handleDisplayCurrencyChange}
              >
                {plotCurrencies.map((currencyCode) => (
                  <option key={currencyCode} value={currencyCode}>
                    {currencyCode}
                  </option>
                ))}
              </select>
            </label>
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
          <p className="control-subheading">
            X range ({xInputUsesThousands ? `k${displayCurrency}` : displayCurrency} {payPeriodLabel.toLowerCase()})
          </p>
          <div className="range-inputs">
            <label>
              Min ({xInputUsesThousands ? `k${displayCurrency}` : displayCurrency})
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
              Max ({xInputUsesThousands ? `k${displayCurrency}` : displayCurrency})
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
                ? `Enter a valid x range in thousand ${displayCurrency} ${payPeriodLabel.toLowerCase()} where max is greater than min.`
                : `Enter a valid x range in ${displayCurrency} ${payPeriodLabel.toLowerCase()} where max is greater than min.`}
            </p>
          )}
        </div>
      </section>

      <section className="legend-panel">
        <div className="legend-country-list">
          {plotCatalogue.countries.map((country) => {
            const isActive = Boolean(enabledCountries[country.id]);

            return (
              <button
                type="button"
                key={country.id}
                className={`legend-item legend-item-button${isActive ? '' : ' legend-item-muted'}`}
                onClick={() =>
                  setEnabledCountries((previous) => ({
                    ...previous,
                    [country.id]: !previous[country.id],
                  }))
                }
                aria-pressed={isActive}
                title={
                  isActive
                    ? `Hide ${country.label}`
                    : `Show ${country.label}`
                }
              >
                <span
                  className="legend-color"
                  style={{ backgroundColor: country.color }}
                />
                {country.label}
              </button>
            );
          })}
        </div>
        {rateType === 'marginal-overall' && (
          <div className="legend-metric-list">
            <span className="legend-item">
              <span className="legend-line" />
              Overall tax rate
            </span>
            <span className="legend-item">
              <span className="legend-line dashed" />
              Marginal tax rate
            </span>
          </div>
        )}
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
          {discontinuityAwareSeries.flatMap((series) => [
            ...series.continuousDomains.map((domain, domainIndex) => (
              <Plot.OfX
                key={`${series.key}-segment-${domainIndex}`}
                y={series.yAccessor}
                domain={domain}
                color={series.style.color}
                weight={2}
                minSamplingDepth={7}
                maxSamplingDepth={14}
                svgPathProps={series.style.dashed ? { strokeDasharray: '6 6' } : undefined}
              />
            )),
            ...series.jumps.map((jump, jumpIndex) => (
              <Line.Segment
                key={`${series.key}-jump-${jumpIndex}`}
                point1={[jump.x, jump.y1]}
                point2={[jump.x, jump.y2]}
                color={series.style.color}
                weight={2}
                style={series.style.dashed ? 'dashed' : 'solid'}
              />
            )),
          ])}
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
        {plotCatalogue.countries
          .filter((country) => country.schedules.length === 0)
          .map((country) => (
            <p key={country.id} className="validation-error">
              No {country.label} schedule found in `income.tax`.
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
          <div className="taxspec-editor-frame">
            <Editor
              defaultLanguage="plaintext"
              value={taxSpecificationInput}
              onChange={(nextValue) => setTaxSpecificationInput(nextValue ?? '')}
              options={editorOptions}
              height="100%"
            />
          </div>
          <p className="taxspec-editor-hint">
            Edit <code>income.tax</code> syntax here. Valid edits are applied to the chart immediately.
          </p>
          {taxSpecificationError && (
            <p className="validation-error taxspec-editor-error">{taxSpecificationError}</p>
          )}
        </div>
      </section>

      <footer className="disclaimer-panel" aria-label="Disclaimer">
        <h2>Disclaimer</h2>
        <p>
          All tax rates displayed are approximations and may be completely inaccurate,
          and should not be used for anything at all.
        </p>
      </footer>
    </main>
  );
}

export default App;
