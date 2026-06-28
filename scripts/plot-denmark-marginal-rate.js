#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Denmark',
  currency: 'DKK',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + Labour Market Contribution',
  locale: 'da-DK',
  maxIncome: 1_500_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.3,
});
