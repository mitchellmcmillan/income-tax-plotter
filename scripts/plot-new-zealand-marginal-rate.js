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
  lineColors: {
    marginalRate: '#0369a1',
    overallRate: '#0891b2',
    overallTaxValue: '#b45309',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'new-zealand-marginal-rate-income-tax-only.csv',
      svgFileName: 'new-zealand-marginal-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeNZD,marginalRateIncomeTax',
    },
    overallRate: {
      csvFileName: 'new-zealand-overall-rate-income-tax-only.csv',
      svgFileName: 'new-zealand-overall-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeNZD,overallRateIncomeTax',
    },
    overallTaxValue: {
      csvFileName: 'new-zealand-overall-tax-value-income-tax-only.csv',
      svgFileName: 'new-zealand-overall-tax-value-income-tax-only.svg',
      csvHeader: 'grossIncomeNZD,overallTaxValueIncomeTaxNZD',
    },
    netPay: {
      csvFileName: 'new-zealand-net-pay-income-tax-only.csv',
      svgFileName: 'new-zealand-net-pay-income-tax-only.svg',
      csvHeader: 'grossIncomeNZD,netPayIncomeTaxNZD',
    },
  },
});

