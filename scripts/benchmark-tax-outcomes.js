import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import TaxSpec from '../src/TaxSpec.js';

const interpreter = new TaxSpec(fs.readFileSync('income.tax', 'utf8'));
const prepared = interpreter.prepare('UK_ex_Scotland', ['income tax'], 'GBP');
const durations = [];

for (let batch = 0; batch < 5; batch += 1) {
  const start = performance.now();
  for (let income = 1; income <= 100_000; income += 1) {
    prepared.marginalRate(income);
    prepared.overallRate(income);
    prepared.taxPaid(income);
    prepared.netPay(income);
  }
  durations.push(performance.now() - start);
}

durations.sort((left, right) => left - right);
console.log(JSON.stringify({ hotPathMedianMs: durations[2] }));
