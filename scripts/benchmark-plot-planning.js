import { performance } from 'node:perf_hooks';
import { createPlotPlanner } from '../src/plotPlanning.js';

const countryLines = Array.from({ length: 8 }, (_, index) => ({
  country: `Country-${index}`,
  color: '#000',
  lineBreaksDisplayIncome: [12570, 50270, 125140],
  marginalRateAtDisplayIncome: (income) => (Math.round(income) < 50000 ? 20 : 40),
  cumulativeRateAtDisplayIncome: (income) => 20 + Math.min(20, income / 5000),
  cumulativeTaxPaidAtDisplayIncome: (income) => income * 0.3,
  netPayAtDisplayIncome: (income) => income * 0.7,
}));

function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

function runBatch() {
  const planner = createPlotPlanner();
  const start = performance.now();
  planner.plan({
    rateType: 'marginal-overall',
    countryLines,
    domainMin: 0,
    domainMax: 150000,
  });
  const initial = performance.now() - start;

  const panStart = performance.now();
  for (let offset = 1000; offset <= 10000; offset += 1000) {
    planner.plan({
      rateType: 'marginal-overall',
      countryLines,
      domainMin: offset,
      domainMax: 150000 + offset,
    });
  }
  return { initial, pans: performance.now() - panStart };
}

const batches = Array.from({ length: 5 }, runBatch);
console.log(JSON.stringify({
  initialMedianMs: median(batches.map(({ initial }) => initial)),
  overlappingPansMedianMs: median(batches.map(({ pans }) => pans)),
}));
