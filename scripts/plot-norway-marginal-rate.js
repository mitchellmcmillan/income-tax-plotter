#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';

plotTaxCurves({
  country: 'Norway',
  countryLabel: 'Norway',
  currency: 'NOK',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: 'Income Tax + Social Security',
  locale: 'nb-NO',
  maxIncome: 2_250_000,
  marginalRateYFloor: 0.6,
  overallRateYFloor: 0.2,
  lineColors: {
    marginalRate: '#0f766e',
    overallRate: '#0369a1',
    overallTaxValue: '#c2410c',
    netPay: '#4f46e5',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: 'norway-marginal-rate-income-tax-social-security.csv',
      svgFileName: 'norway-marginal-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeNOK,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: 'norway-overall-rate-income-tax-social-security.csv',
      svgFileName: 'norway-overall-rate-income-tax-social-security.svg',
      csvHeader: 'grossIncomeNOK,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: 'norway-overall-tax-value-income-tax-social-security.csv',
      svgFileName: 'norway-overall-tax-value-income-tax-social-security.svg',
      csvHeader: 'grossIncomeNOK,overallTaxValueIncomeTaxAndSocialSecurityNOK',
    },
    netPay: {
      csvFileName: 'norway-net-pay-income-tax-social-security.csv',
      svgFileName: 'norway-net-pay-income-tax-social-security.svg',
      csvHeader: 'grossIncomeNOK,netPayIncomeTaxAndSocialSecurityNOK',
    },
  },
});

