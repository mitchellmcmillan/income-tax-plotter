#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Australia',
  currency: 'AUD',
  enabledSchedules: ['income tax', 'social security'], // Medicare included; HECS excluded
  scenarioLabel: 'Income Tax + Medicare (No HECS)',
  locale: 'en-AU',
  maxIncome: 200_000,
  marginalRateYFloor: 0.5,
  overallRateYFloor: 0.1,
});
