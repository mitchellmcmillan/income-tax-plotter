#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Netherlands',
  currency: 'EUR',
  enabledSchedules: ['income tax'],
  scenarioLabel: 'Income Tax',
  locale: 'nl-NL',
  maxIncome: 200_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.2,
});
