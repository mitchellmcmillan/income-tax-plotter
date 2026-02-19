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
  lineColors: {
    marginalRate: '#1d4ed8',
    overallRate: '#0369a1',
    overallTaxValue: '#b45309',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'uk-marginal-rate-income-tax-only.csv',
      svgFileName: 'uk-marginal-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeGBP,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: 'uk-overall-rate-income-tax-only.csv',
      svgFileName: 'uk-overall-rate-income-tax-only.svg',
      csvHeader: 'grossIncomeGBP,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: 'uk-overall-tax-value-income-tax-only.csv',
      svgFileName: 'uk-overall-tax-value-income-tax-only.svg',
      csvHeader: 'grossIncomeGBP,overallTaxValueIncomeTaxAndSocialSecurityGBP',
    },
    netPay: {
      csvFileName: 'uk-net-pay-income-tax-only.csv',
      svgFileName: 'uk-net-pay-income-tax-only.svg',
      csvHeader: 'grossIncomeGBP,netPayIncomeTaxAndSocialSecurityGBP',
    },
  },
});

