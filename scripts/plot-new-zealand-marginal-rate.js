#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'New_Zealand',
  countryLabel: 'New Zealand',
  currency: 'NZD',
  enabledSchedules: ['income tax'],
  scenarioLabel: 'Income Tax',
  locale: 'en-NZ',
  maxIncome: 200_000,
  marginalRateYFloor: 0.4,
  overallRateYFloor: 0.2,
});
