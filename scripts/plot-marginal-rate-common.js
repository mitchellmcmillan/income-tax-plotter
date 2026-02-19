import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import TaxSpecInterpreter from '../src/TaxSpecInterpreter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_CURRENCY_CONVERSIONS = {
  AUD: 1,
  DKK: 1,
  EUR: 1,
  GBP: 1,
  NOK: 1,
  NZD: 1,
};

function buildLinearTicks(min, max, count = 6) {
  if (!(Number.isFinite(min) && Number.isFinite(max)) || max <= min || count < 2) {
    return [min, max];
  }
  const span = max - min;
  const step = span / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    ticks.push(min + step * i);
  }
  return ticks;
}

function downsampleRowsForSvg(rows, maxPoints) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Number.isFinite(maxPoints) || maxPoints < 2 || rows.length <= maxPoints) return rows;

  const stride = Math.ceil((rows.length - 1) / (maxPoints - 1));
  const sampled = [];
  for (let i = 0; i < rows.length; i += stride) {
    sampled.push(rows[i]);
  }
  if (sampled[sampled.length - 1] !== rows[rows.length - 1]) {
    sampled.push(rows[rows.length - 1]);
  }
  return sampled;
}

function resolveEvaluators(config) {
  if (config.evaluators) return config.evaluators;

  const specPath = path.resolve(rootDir, 'income.tax');
  const specification = fs.readFileSync(specPath, 'utf8');

  const interpreter = new TaxSpecInterpreter(
    specification,
    config.currencyConversions || DEFAULT_CURRENCY_CONVERSIONS
  );
  const prepared = interpreter.prepare(config.country, config.enabledSchedules, config.currency);
  return {
    marginalRate: (income) => prepared.marginalRate(income),
    overallRate: (income) => prepared.overallRate(income),
  };
}

function buildRows(config, evaluators) {
  const rows = [];
  const minIncome = config.minIncome ?? 0;
  const maxIncome = config.maxIncome ?? 200_000;
  const step = config.step ?? 1;

  const startOverall = performance.now();
  for (let grossIncome = minIncome; grossIncome <= maxIncome; grossIncome += step) {
    const marginalRate = evaluators.marginalRate(grossIncome);
    if (!Number.isFinite(marginalRate)) {
      throw new Error(`Non-finite marginalRate at income ${grossIncome}: ${marginalRate}`);
    }

    let overallRate = null;
    if (typeof evaluators.overallRate === 'function') {
      overallRate = evaluators.overallRate(grossIncome);
    }

    let overallTaxValue = null;
    if (typeof evaluators.overallTaxValue === 'function') {
      overallTaxValue = evaluators.overallTaxValue(grossIncome);
    }

    if (!Number.isFinite(overallRate) && Number.isFinite(overallTaxValue)) {
      overallRate = grossIncome <= 0 ? 0 : overallTaxValue / grossIncome;
    }
    if (!Number.isFinite(overallTaxValue) && Number.isFinite(overallRate)) {
      overallTaxValue = overallRate * grossIncome;
    }

    if (!Number.isFinite(overallRate)) {
      throw new Error(`Non-finite overallRate at income ${grossIncome}: ${overallRate}`);
    }
    if (!Number.isFinite(overallTaxValue)) {
      throw new Error(`Non-finite overallTaxValue at income ${grossIncome}: ${overallTaxValue}`);
    }

    let netPay = null;
    if (typeof evaluators.netPay === 'function') {
      netPay = evaluators.netPay(grossIncome);
    } else {
      netPay = grossIncome - overallTaxValue;
    }
    if (!Number.isFinite(netPay)) {
      throw new Error(`Non-finite netPay at income ${grossIncome}: ${netPay}`);
    }

    rows.push({
      grossIncome,
      marginalRate,
      overallRate,
      overallTaxValue,
      netPay,
    });
  }
  const elapsedMs = performance.now() - startOverall;

  return { rows, elapsedMs };
}

function formatYTick(tick, mode, locale) {
  if (mode === 'rate') return `${(tick * 100).toFixed(0)}%`;
  return Math.round(tick).toLocaleString(locale);
}

function resolveYDomain(rows, valueKey, mode, chartConfig) {
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const row of rows) {
    const value = row[valueKey];
    if (!Number.isFinite(value)) continue;
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }
  if (!Number.isFinite(minValue)) minValue = 0;
  if (!Number.isFinite(maxValue)) maxValue = 0;

  if (mode === 'rate') {
    const yMin = 0;
    const yFloor = Number.isFinite(chartConfig.yFloor) ? chartConfig.yFloor : 0.5;
    const yMax = Math.max(yFloor, Math.ceil((maxValue + 0.01) * 20) / 20);
    const yTickStep = Number.isFinite(chartConfig.yTickStep) ? chartConfig.yTickStep : 0.05;

    const ticks = [];
    for (let y = yMin; y <= yMax + 1e-12; y += yTickStep) {
      ticks.push(Number(y.toFixed(6)));
    }
    return { yMin, yMax, ticks };
  }

  const yMin = Math.min(0, minValue);
  const yMax = Math.max(1, maxValue);
  const ticks = buildLinearTicks(yMin, yMax, 6);
  return { yMin, yMax, ticks };
}

function writeChartArtifacts(config, rows, chartConfig, valueKey) {
  const locale = config.locale;
  const minIncome = config.minIncome ?? 0;
  const maxIncome = config.maxIncome ?? 200_000;
  const svgMaxPoints = config.svgMaxPoints ?? 500_000;
  const xTicks = Array.isArray(config.xTicks) && config.xTicks.length > 0
    ? config.xTicks
    : buildLinearTicks(minIncome, maxIncome, 5).map((tick) => Math.round(tick));

  const artifactsDir = path.resolve(rootDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const csvPath = path.resolve(artifactsDir, chartConfig.csvFileName);
  const csvLines = [chartConfig.csvHeader];
  for (const row of rows) {
    csvLines.push(`${row.grossIncome},${row[valueKey]}`);
  }
  fs.writeFileSync(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

  const width = 1400;
  const height = 800;
  const margin = { top: 50, right: 40, bottom: 60, left: 100 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const yDomain = resolveYDomain(rows, valueKey, chartConfig.mode, chartConfig);
  const yMin = yDomain.yMin;
  const yMax = yDomain.yMax;
  const yTicks = yDomain.ticks;

  function xToPx(x) {
    const t = (x - minIncome) / (maxIncome - minIncome);
    return margin.left + t * plotWidth;
  }

  function yToPx(y) {
    const t = (y - yMin) / (yMax - yMin || 1);
    return margin.top + (1 - t) * plotHeight;
  }

  const svgRows = downsampleRowsForSvg(rows, svgMaxPoints);
  if (svgRows.length !== rows.length) {
    console.log(
      `[${chartConfig.label}] Downsampled SVG points from ${rows.length.toLocaleString(locale)} to ${svgRows.length.toLocaleString(locale)} (max ${svgMaxPoints.toLocaleString(locale)}).`
    );
  }

  const polylinePoints = svgRows
    .map((row) => `${xToPx(row.grossIncome).toFixed(2)},${yToPx(row[valueKey]).toFixed(2)}`)
    .join(' ');

  const xTickMarkup = xTicks
    .map((tick) => {
      const x = xToPx(tick);
      return [
        `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#e5e7eb" stroke-width="1" />`,
        `<text x="${x}" y="${height - margin.bottom + 20}" font-size="12" text-anchor="middle" fill="#374151">${Math.round(tick).toLocaleString(locale)}</text>`,
      ].join('\n');
    })
    .join('\n');

  const yTickMarkup = yTicks
    .map((tick) => {
      const y = yToPx(tick);
      return [
        `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`,
        `<text x="${margin.left - 10}" y="${y + 4}" font-size="12" text-anchor="end" fill="#374151">${formatYTick(tick, chartConfig.mode, locale)}</text>`,
      ].join('\n');
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />

  <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" fill="#111827" font-family="sans-serif">
    ${chartConfig.title}
  </text>

  ${xTickMarkup}
  ${yTickMarkup}

  <line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#111827" stroke-width="1.5" />
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#111827" stroke-width="1.5" />

  <polyline fill="none" stroke="${chartConfig.lineColor}" stroke-width="2" points="${polylinePoints}" />

  <text x="${width / 2}" y="${height - 15}" text-anchor="middle" font-size="13" fill="#111827" font-family="sans-serif">
    Gross Income (${config.currency})
  </text>

  <text x="20" y="${height / 2}" text-anchor="middle" font-size="13" fill="#111827" font-family="sans-serif" transform="rotate(-90, 20, ${height / 2})">
    ${chartConfig.yAxisLabel}
  </text>
</svg>
`;

  const svgPath = path.resolve(artifactsDir, chartConfig.svgFileName);
  fs.writeFileSync(svgPath, svg, 'utf8');

  console.log(`[${chartConfig.label}] CSV: ${csvPath}`);
  console.log(`[${chartConfig.label}] SVG: ${svgPath}`);
}

function defaultChartSet(config) {
  const countryLabel = config.countryLabel || config.country;
  const scenarioLabel = config.scenarioLabel || 'Selected Schedules';
  const suffix = config.outputSuffix || '';
  const basePrefix = config.filePrefix || `${config.country.toLowerCase().replaceAll('_', '-')}`;

  const defaultLineColors = {
    marginalRate: '#1d4ed8',
    overallRate: '#0891b2',
    overallTaxValue: '#b45309',
    netPay: '#0f766e',
    ...(config.lineColors || {}),
  };

  return {
    marginalRate: {
      label: 'marginalRate',
      mode: 'rate',
      title: `${countryLabel} Marginal Rate (${scenarioLabel})${suffix}`,
      csvFileName: `${basePrefix}-marginal-rate.csv`,
      svgFileName: `${basePrefix}-marginal-rate.svg`,
      csvHeader: `grossIncome${config.currency},marginalRate`,
      yFloor: config.marginalRateYFloor ?? 0.5,
      yTickStep: config.rateYTickStep ?? 0.05,
      yAxisLabel: 'Marginal Rate',
      lineColor: defaultLineColors.marginalRate,
    },
    overallRate: {
      label: 'overallRate',
      mode: 'rate',
      title: `${countryLabel} Overall Tax Rate (${scenarioLabel})${suffix}`,
      csvFileName: `${basePrefix}-overall-rate.csv`,
      svgFileName: `${basePrefix}-overall-rate.svg`,
      csvHeader: `grossIncome${config.currency},overallTaxRate`,
      yFloor: config.overallRateYFloor ?? 0.3,
      yTickStep: config.rateYTickStep ?? 0.05,
      yAxisLabel: 'Overall Tax Rate',
      lineColor: defaultLineColors.overallRate,
    },
    overallTaxValue: {
      label: 'overallTaxValue',
      mode: 'value',
      title: `${countryLabel} Overall Tax Value (${scenarioLabel})${suffix}`,
      csvFileName: `${basePrefix}-overall-tax-value.csv`,
      svgFileName: `${basePrefix}-overall-tax-value.svg`,
      csvHeader: `grossIncome${config.currency},overallTaxValue${config.currency}`,
      yAxisLabel: `Overall Tax (${config.currency})`,
      lineColor: defaultLineColors.overallTaxValue,
    },
    netPay: {
      label: 'netPay',
      mode: 'value',
      title: `${countryLabel} Net Pay (${scenarioLabel})${suffix}`,
      csvFileName: `${basePrefix}-net-pay.csv`,
      svgFileName: `${basePrefix}-net-pay.svg`,
      csvHeader: `grossIncome${config.currency},netPay${config.currency}`,
      yAxisLabel: `Net Pay (${config.currency})`,
      lineColor: defaultLineColors.netPay,
    },
  };
}

export function plotTaxCurves(config) {
  const evaluators = resolveEvaluators(config);
  const { rows, elapsedMs } = buildRows(config, evaluators);

  console.log(
    `Computed tax curves for ${rows.length.toLocaleString(config.locale)} income levels in ${elapsedMs.toFixed(2)}ms (average ${(elapsedMs / rows.length).toFixed(6)}ms per income level)`
  );

  const chartSet = defaultChartSet(config);
  const overrides = config.chartOverrides || {};
  const finalChartSet = {
    marginalRate: { ...chartSet.marginalRate, ...(overrides.marginalRate || {}) },
    overallRate: { ...chartSet.overallRate, ...(overrides.overallRate || {}) },
    overallTaxValue: { ...chartSet.overallTaxValue, ...(overrides.overallTaxValue || {}) },
    netPay: { ...chartSet.netPay, ...(overrides.netPay || {}) },
  };

  writeChartArtifacts(config, rows, finalChartSet.marginalRate, 'marginalRate');
  writeChartArtifacts(config, rows, finalChartSet.overallRate, 'overallRate');
  writeChartArtifacts(config, rows, finalChartSet.overallTaxValue, 'overallTaxValue');
  writeChartArtifacts(config, rows, finalChartSet.netPay, 'netPay');

  console.log(`Wrote ${rows.length.toLocaleString(config.locale)} points for each chart.`);
}
