import antlr4 from 'antlr4';

export const DEFAULT_INTEGRATION_STEP = 2500;
export const MIN_INTEGRATION_SEGMENTS = 8;
export const MAX_INTEGRATION_SEGMENTS = 256;
export const MIN_DERIVATIVE_STEP = 1e-4;
export const FIX_MAX_ITERATIONS = 128;
export const FIX_RELATIVE_TOLERANCE = 1e-10;
export const FIX_ABSOLUTE_TOLERANCE = 1e-8;
export const FIX_MIN_BOUND = -1e12;
export const FIX_MAX_BOUND = 1e12;
export const FIX_NEWTON_MIN_DENOM = 1e-8;

export class CollectingErrorListener extends antlr4.error.ErrorListener {
  constructor() {
    super();
    this.errors = [];
  }

  syntaxError(recognizer, offendingSymbol, line, column, msg) {
    this.errors.push(`line ${line}:${column} ${msg}`);
  }
}

export function normalizeIdentifier(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

export function normalizeEnabledScheduleToken(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function normalizeCurrency(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase();
}

export function toNumber(value, fallback = 0) {
  if (value === Infinity || value === -Infinity) return value;
  if (value === true) return 1;
  if (value === false || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseStringLiteral(tokenText) {
  try {
    return JSON.parse(tokenText);
  } catch {
    return tokenText.slice(1, -1).replace(/\\(.)/gs, '$1');
  }
}

export function integrateNumerically(evaluate, lower, upper) {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) return 0;

  const span = upper - lower;
  const segmentCount = Math.min(
    MAX_INTEGRATION_SEGMENTS,
    Math.max(MIN_INTEGRATION_SEGMENTS, Math.ceil(span / DEFAULT_INTEGRATION_STEP))
  );
  const step = span / segmentCount;

  let total = 0;
  for (let index = 0; index < segmentCount; index += 1) {
    const midpoint = lower + (index + 0.5) * step;
    total += toNumber(evaluate(midpoint)) * step;
  }
  return total;
}

export function derivativeAt(evaluate, x) {
  if (!Number.isFinite(x) || x < 0) return 0;

  const h = MIN_DERIVATIVE_STEP;
  const valueAtX = toNumber(evaluate(x));

  if (x > 0) {
    const lower = Math.max(0, x - h);
    if (x <= lower) return 0;
    const valueAtLower = toNumber(evaluate(lower));
    return (valueAtX - valueAtLower) / (x - lower);
  }

  const upper = x + h;
  if (upper <= x) return 0;
  const valueAtUpper = toNumber(evaluate(upper));
  return (valueAtUpper - valueAtX) / (upper - x);
}

export function maybeFinite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function extractConversionRate(value, currencyCode) {
  if (typeof value === 'number') return value;

  if (value && typeof value === 'object') {
    const candidates = [
      value.toEUR,
      value.toEur,
      value.currencyToEur,
      value.rate,
      value.value,
      value['Currency to EUR'],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    }
  }

  throw new Error(`Invalid conversion rate for currency "${currencyCode}".`);
}

export function ensureArray(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value.values()];
  if (typeof value === 'string') return [value];
  throw new Error('enabledSchedules must be an array, set, string, or null.');
}

export function floorToStep(v, increment = 1) {
  const value = toNumber(v);
  const s = Math.abs(toNumber(increment, 1));
  if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.floor(value);
  return Math.floor(value / s) * s;
}

export function ceilToStep(v, increment = 1) {
  const value = toNumber(v);
  const s = Math.abs(toNumber(increment, 1));
  if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.ceil(value);
  return Math.ceil(value / s) * s;
}

export function roundToStep(v, increment = 1) {
  const value = toNumber(v);
  const s = Math.abs(toNumber(increment, 1));
  if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.round(value);
  return Math.round(value / s) * s;
}
