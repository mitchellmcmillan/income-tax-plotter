#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Denmark',
  countryLabel: 'Denmark',
  currency: 'DKK',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + Labour Market Contribution',
  locale: 'da-DK',
  maxIncome: 1_500_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.3,
  lineColors: {
    marginalRate: '#b45309',
    overallRate: '#0369a1',
    overallTaxValue: '#7c3aed',
    netPay: '#0f766e',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'denmark-marginal-rate-income-tax-social-security.csv',
      svgFileName: 'denmark-marginal-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeDKK,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: 'denmark-overall-rate-income-tax-social-security.csv',
      svgFileName: 'denmark-overall-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeDKK,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: 'denmark-overall-tax-value-income-tax-social-security.csv',
      svgFileName: 'denmark-overall-tax-value-income-tax-social-security.svg',
      csvHeader: 'grossIncomeDKK,overallTaxValueIncomeTaxAndSocialSecurityDKK',
    },
    netPay: {
      csvFileName: 'denmark-net-pay-income-tax-social-security.csv',
      svgFileName: 'denmark-net-pay-income-tax-social-security.svg',
      csvHeader: 'grossIncomeDKK,netPayIncomeTaxAndSocialSecurityDKK',
    },
  },
});

