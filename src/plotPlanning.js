const MAX_JUMP_SAMPLES = 120000;
const BASELINE_SAMPLE_SIZE = 4096;
const JUMP_FACTOR = 8;
const RELATIVE_JUMP_FLOOR = 0.008;
const ABSOLUTE_JUMP_FLOOR = 0.05;
const DOMAIN_EPSILON = 1e-3;
const MIN_SEGMENT_WIDTH = 1e-6;
const CACHE_LOOKAHEAD = 0.5;
const AUTOSCALE_SAMPLES = 160;
const AUTOSCALE_MIN_SAMPLES = 96;
const AUTOSCALE_MAX_SAMPLES = 2048;

function seriesForMode(rateType, countryLines) {
  if (rateType === 'marginal-overall') {
    return countryLines.flatMap((line) => [
      {
        key: `${line.country}-overall`,
        yAccessor: line.cumulativeRateAtDisplayIncome,
        forcedBreaks: line.lineBreaksDisplayIncome,
        style: { color: line.color, dashed: false },
      },
      {
        key: `${line.country}-marginal`,
        yAccessor: line.marginalRateAtDisplayIncome,
        forcedBreaks: line.lineBreaksDisplayIncome,
        style: { color: line.color, dashed: true },
      },
    ]);
  }

  const accessor = {
    marginal: 'marginalRateAtDisplayIncome',
    cumulative: 'cumulativeRateAtDisplayIncome',
    'tax-paid': 'cumulativeTaxPaidAtDisplayIncome',
    'net-pay': 'netPayAtDisplayIncome',
  }[rateType] ?? 'netPayAtDisplayIncome';

  return countryLines.map((line) => ({
    key: line.country,
    yAccessor: line[accessor],
    forcedBreaks: line.lineBreaksDisplayIncome,
    style: { color: line.color, dashed: false },
  }));
}

function samplePoints(yAccessor, domainMin, domainMax, sampleCount) {
  const points = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const x = domainMin + ((domainMax - domainMin) * index) / sampleCount;
    points.push({ x, value: yAccessor(x) });
  }
  return points;
}

function boundsInDomain(points, domainMin, domainMax) {
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const point of points) {
    if (
      Number.isFinite(point.x)
      && point.x >= domainMin
      && point.x <= domainMax
      && Number.isFinite(point.value)
    ) {
      minValue = Math.min(minValue, point.value);
      maxValue = Math.max(maxValue, point.value);
    }
  }
  return Number.isFinite(minValue) && Number.isFinite(maxValue)
    ? { minValue, maxValue }
    : null;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function evenly(values, maxCount) {
  if (values.length <= maxCount) return values;
  const stride = (values.length - 1) / (maxCount - 1);
  return Array.from({ length: maxCount }, (_, index) => values[Math.round(index * stride)]);
}

function largestUnitJump(yAccessor, start, end) {
  let best = null;
  let leftValue = yAccessor(start);
  for (let income = start + 1; income <= end; income += 1) {
    const rightValue = yAccessor(income);
    if (Number.isFinite(leftValue) && Number.isFinite(rightValue)) {
      const delta = Math.abs(rightValue - leftValue);
      if (!best || delta > best.delta) {
        best = { boundaryIncome: income, leftValue, rightValue, delta };
      }
    }
    leftValue = rightValue;
  }
  return best;
}

function domainsFromJumps(domainMin, domainMax, jumps) {
  const domains = [];
  let start = domainMin;
  for (const jump of jumps) {
    const end = Math.max(start, Math.min(domainMax, jump.x - DOMAIN_EPSILON));
    if (end - start > MIN_SEGMENT_WIDTH) domains.push([start, end]);
    start = Math.max(start, Math.min(domainMax, jump.x + DOMAIN_EPSILON));
  }
  if (domainMax - start > MIN_SEGMENT_WIDTH) domains.push([start, domainMax]);
  return domains.length ? domains : [[domainMin, domainMax]];
}

function splitAtBreaks(domain, forcedBreaks = []) {
  const breaks = forcedBreaks.filter(
    (value) => Number.isFinite(value)
      && value > domain[0] + MIN_SEGMENT_WIDTH
      && value < domain[1] - MIN_SEGMENT_WIDTH
  );
  if (breaks.length === 0) return [domain];

  const domains = [];
  let start = domain[0];
  for (const value of breaks) {
    if (value - start > MIN_SEGMENT_WIDTH) domains.push([start, value]);
    start = value;
  }
  if (domain[1] - start > MIN_SEGMENT_WIDTH) domains.push([start, domain[1]]);
  return domains.length ? domains : [domain];
}

function detectJumps(yAccessor, domainMin, domainMax) {
  const minIncome = Math.floor(Math.max(0, domainMin));
  const maxIncome = Math.ceil(domainMax);
  const stride = Math.max(1, Math.ceil((maxIncome - minIncome) / MAX_JUMP_SAMPLES));
  const samples = [];
  for (let income = minIncome; income <= maxIncome; income += stride) {
    samples.push({ income, value: yAccessor(income) });
  }
  if (samples.at(-1)?.income !== maxIncome) {
    samples.push({ income: maxIncome, value: yAccessor(maxIncome) });
  }

  let minValue = Infinity;
  let maxValue = -Infinity;
  const deltas = [];
  const intervals = [];
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (Number.isFinite(sample.value)) {
      minValue = Math.min(minValue, sample.value);
      maxValue = Math.max(maxValue, sample.value);
    }
    if (index === 0) continue;
    const previous = samples[index - 1];
    if (!Number.isFinite(previous.value) || !Number.isFinite(sample.value)) continue;
    const delta = Math.abs(sample.value - previous.value);
    deltas.push(delta);
    if (delta > 0) intervals.push({ left: previous, right: sample, delta });
  }

  const threshold = Math.max(
    ABSOLUTE_JUMP_FLOOR,
    Math.max(0, maxValue - minValue) * RELATIVE_JUMP_FLOOR,
    median(evenly(deltas, BASELINE_SAMPLE_SIZE)) * JUMP_FACTOR
  );
  const jumps = [];
  for (const interval of intervals) {
    if (interval.delta <= threshold) continue;
    const resolved = interval.right.income - interval.left.income <= 1
      ? {
          boundaryIncome: interval.right.income,
          leftValue: interval.left.value,
          rightValue: interval.right.value,
          delta: interval.delta,
        }
      : largestUnitJump(yAccessor, interval.left.income, interval.right.income);
    if (!resolved || resolved.delta <= threshold) continue;

    const x = resolved.boundaryIncome - 0.5;
    if (x <= domainMin || x >= domainMax) continue;
    const left = yAccessor(x - DOMAIN_EPSILON);
    const right = yAccessor(x + DOMAIN_EPSILON);
    if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(right - left) <= threshold) {
      continue;
    }
    jumps.push({ x, y1: Math.min(left, right), y2: Math.max(left, right) });
  }

  jumps.sort((a, b) => a.x - b.x);
  return jumps.filter((jump, index) => index === 0 || Math.abs(jump.x - jumps[index - 1].x) > 1e-6);
}

function retainActive(cache, descriptors) {
  const active = new Set(descriptors.map(({ key }) => key));
  for (const key of cache.keys()) {
    if (!active.has(key)) cache.delete(key);
  }
}

export function createPlotPlanner() {
  const autoscaleCache = new Map();
  const jumpCache = new Map();

  return {
    plan({ rateType, countryLines, domainMin, domainMax }) {
      if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax) || domainMax <= domainMin) {
        return { series: [], bounds: null };
      }

      const descriptors = seriesForMode(rateType, countryLines);
      retainActive(autoscaleCache, descriptors);
      retainActive(jumpCache, descriptors);
      const span = Math.max(1, domainMax - domainMin);
      const lookahead = Math.max(1, span * CACHE_LOOKAHEAD);
      const prefetchMin = domainMin - lookahead;
      const jumpPrefetchMin = Math.max(0, prefetchMin);
      const prefetchMax = domainMax + lookahead;
      const renderDomainMin = Math.max(0, domainMin);
      const spacing = span / AUTOSCALE_SAMPLES;
      let minValue = Infinity;
      let maxValue = -Infinity;

      const series = descriptors.map((descriptor) => {
        let autoscale = autoscaleCache.get(descriptor.key);
        const reusable = autoscale?.yAccessor === descriptor.yAccessor;
        const scanMin = reusable ? Math.min(autoscale.domainMin, prefetchMin) : prefetchMin;
        const scanMax = reusable ? Math.max(autoscale.domainMax, prefetchMax) : prefetchMax;
        if (!reusable || scanMin < autoscale.domainMin || scanMax > autoscale.domainMax) {
          const count = Math.min(
            AUTOSCALE_MAX_SAMPLES,
            Math.max(AUTOSCALE_MIN_SAMPLES, Math.ceil((scanMax - scanMin) / spacing))
          );
          autoscale = {
            yAccessor: descriptor.yAccessor,
            domainMin: scanMin,
            domainMax: scanMax,
            points: samplePoints(descriptor.yAccessor, scanMin, scanMax, count),
          };
          autoscaleCache.set(descriptor.key, autoscale);
        }
        const bounds = boundsInDomain(autoscale.points, domainMin, domainMax);
        if (bounds) {
          minValue = Math.min(minValue, bounds.minValue);
          maxValue = Math.max(maxValue, bounds.maxValue);
        }

        let jumpEntry = jumpCache.get(descriptor.key);
        const jumpReusable = jumpEntry?.yAccessor === descriptor.yAccessor;
        const jumpMin = jumpReusable
          ? Math.min(jumpEntry.domainMin, jumpPrefetchMin)
          : jumpPrefetchMin;
        const jumpMax = jumpReusable ? Math.max(jumpEntry.domainMax, prefetchMax) : prefetchMax;
        if (!jumpReusable || jumpMin < jumpEntry.domainMin || jumpMax > jumpEntry.domainMax) {
          jumpEntry = {
            yAccessor: descriptor.yAccessor,
            domainMin: jumpMin,
            domainMax: jumpMax,
            jumps: detectJumps(descriptor.yAccessor, jumpMin, jumpMax),
          };
          jumpCache.set(descriptor.key, jumpEntry);
        }
        const jumps = jumpEntry.jumps.filter(
          (jump) => jump.x > renderDomainMin && jump.x < domainMax
        );
        const continuousDomains = domainsFromJumps(renderDomainMin, domainMax, jumps)
          .flatMap((domain) => splitAtBreaks(domain, descriptor.forcedBreaks));

        return { ...descriptor, continuousDomains, jumps };
      });

      return {
        series,
        bounds: Number.isFinite(minValue) && Number.isFinite(maxValue)
          ? { minValue, maxValue }
          : null,
      };
    },
  };
}
