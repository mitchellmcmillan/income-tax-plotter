#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

const common = {
  country: 'Germany',
  currency: 'EUR',
  locale: 'de-DE',
  maxIncome: 200_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.2,
};

plotTaxCurves({
  ...common,
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + Social Security',
});

plotTaxCurves({
  ...common,
  enabledSchedules: ['income tax'],
  scenarioLabel: 'Income Tax',
});
