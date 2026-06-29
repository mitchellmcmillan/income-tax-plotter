import { performance } from 'node:perf_hooks';
import TaxSpecInterpreter from '../src/TaxSpecInterpreter.js';
import { createPlotPlanner } from '../src/plotPlanning.js';

const countries = Array.from({ length: 8 }, (_, index) => `Country_${index}`);
const interpreter = new TaxSpecInterpreter(countries.map((country) => `
${country} (EUR) {
  Income : income_tax = { brackets(x; [0..50000]: 0.2; [50000..inf]: 0.4;) };
}`).join('\n'));
const planInput = {
  countries,
  enabledSchedules: { 'Income tax': true },
  displayCurrency: 'EUR',
  periodsPerYear: 1,
  rateType: 'marginal-overall',
};

function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

function runBatch() {
  const planner = createPlotPlanner(interpreter);
  const start = performance.now();
  planner.plan({
    ...planInput,
    domainMin: 0,
    domainMax: 150000,
  });
  const initial = performance.now() - start;

  const panStart = performance.now();
  for (let offset = 1000; offset <= 10000; offset += 1000) {
    planner.plan({
      ...planInput,
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
