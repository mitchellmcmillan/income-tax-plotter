#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Norway',
  currency: 'NOK',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + Social Security',
  locale: 'nb-NO',
  maxIncome: 2_250_000,
  marginalRateYFloor: 0.6,
  overallRateYFloor: 0.2,
});
