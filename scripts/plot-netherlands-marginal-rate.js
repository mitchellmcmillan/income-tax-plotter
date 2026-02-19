#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Netherlands',
  countryLabel: 'Netherlands',
  currency: 'EUR',
  enabledSchedules: ['income tax'],
  scenarioLabel: 'Income Tax',
  locale: 'nl-NL',
  maxIncome: 200_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.2,
  lineColors: {
    marginalRate: '#db2777',
    overallRate: '#0ea5e9',
    overallTaxValue: '#c2410c',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'netherlands-marginal-rate-income-tax-only.csv',
      svgFileName: 'netherlands-marginal-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeEUR,marginalRateIncomeTax',
    },
    overallRate: {
      csvFileName: 'netherlands-overall-rate-income-tax-only.csv',
      svgFileName: 'netherlands-overall-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeEUR,overallRateIncomeTax',
    },
    overallTaxValue: {
      csvFileName: 'netherlands-overall-tax-value-income-tax-only.csv',
      svgFileName: 'netherlands-overall-tax-value-income-tax-only.svg',
      csvHeader: 'grossIncomeEUR,overallTaxValueIncomeTaxEUR',
    },
    netPay: {
      csvFileName: 'netherlands-net-pay-income-tax-only.csv',
      svgFileName: 'netherlands-net-pay-income-tax-only.svg',
      csvHeader: 'grossIncomeEUR,netPayIncomeTaxEUR',
    },
  },
});

