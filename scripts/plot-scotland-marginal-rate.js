#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Scotland',
  countryLabel: 'Scotland',
  currency: 'GBP',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + NI',
  locale: 'en-GB',
  maxIncome: 200_000,
  marginalRateYFloor: 0.8,
  overallRateYFloor: 0.2,
  lineColors: {
    marginalRate: '#7c3aed',
    overallRate: '#0ea5e9',
    overallTaxValue: '#b45309',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'scotland-marginal-rate-income-tax-social-security.csv',
      svgFileName: 'scotland-marginal-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeGBP,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: 'scotland-overall-rate-income-tax-social-security.csv',
      svgFileName: 'scotland-overall-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeGBP,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: 'scotland-overall-tax-value-income-tax-social-security.csv',
      svgFileName: 'scotland-overall-tax-value-income-tax-social-security.svg',
      csvHeader: 'grossIncomeGBP,overallTaxValueIncomeTaxAndSocialSecurityGBP',
    },
    netPay: {
      csvFileName: 'scotland-net-pay-income-tax-social-security.csv',
      svgFileName: 'scotland-net-pay-income-tax-social-security.svg',
      csvHeader: 'grossIncomeGBP,netPayIncomeTaxAndSocialSecurityGBP',
    },
  },
});

