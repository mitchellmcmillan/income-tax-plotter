#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Australia',
  countryLabel: 'Australia',
  currency: 'AUD',
  enabledSchedules: ['income tax', 'social security'], // Medicare included; HECS excluded
  scenarioLabel: 'Income Tax + Medicare (No HECS)',
  locale: 'en-AU',
  maxIncome: 200_000,
  marginalRateYFloor: 0.5,
  overallRateYFloor: 0.1,
  lineColors: {
    marginalRate: '#0f766e',
    overallRate: '#0369a1',
    overallTaxValue: '#b45309',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'australia-marginal-rate-no-hecs.csv',
      svgFileName: 'australia-marginal-rate-no-hecs.svg',
      csvHeader: 'grossIncomeAUD,marginalRateNoHECS',
    },
    overallRate: {
      csvFileName: 'australia-overall-rate-no-hecs.csv',
      svgFileName: 'australia-overall-rate-no-hecs.svg',
      csvHeader: 'grossIncomeAUD,overallRateNoHECS',
    },
    overallTaxValue: {
      csvFileName: 'australia-overall-tax-value-no-hecs.csv',
      svgFileName: 'australia-overall-tax-value-no-hecs.svg',
      csvHeader: 'grossIncomeAUD,overallTaxValueNoHECSAUD',
    },
    netPay: {
      csvFileName: 'australia-net-pay-no-hecs.csv',
      svgFileName: 'australia-net-pay-no-hecs.svg',
      csvHeader: 'grossIncomeAUD,netPayNoHECSAUD',
    },
  },
});

