#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'UK_ex_Scotland',
  countryLabel: 'UK (ex Scotland)',
  currency: 'GBP',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + NI',
  locale: 'en-GB',
  maxIncome: 200_000,
  marginalRateYFloor: 0.8,
  overallRateYFloor: 0.2,
});
