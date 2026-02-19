#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';


const config = {
  country: 'Germany',
  countryLabel: 'Germany',
  currency: 'EUR',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: `Income Tax + Social Security`,
  locale: 'de-DE',
  maxIncome: 200_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.2,
  lineColors: {
    marginalRate: '#b45309',
    overallRate: '#0369a1',
    overallTaxValue: '#7c3aed',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: `germany-marginal-rate-income-tax-social-security.csv`,
      svgFileName: `germany-marginal-rate-income-tax-social-security.svg`,
      csvHeader: 'grossIncomeEUR,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: `germany-overall-rate-income-tax-social-security.csv`,
      svgFileName: `germany-overall-rate-income-tax-social-security.svg`,
      csvHeader: 'grossIncomeEUR,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: `germany-overall-tax-value-income-tax-social-security.csv`,
      svgFileName: `germany-overall-tax-value-income-tax-social-security.svg`,
      csvHeader: 'grossIncomeEUR,overallTaxValueIncomeTaxAndSocialSecurityEUR',
    },
    netPay: {
      csvFileName: `germany-net-pay-income-tax-social-security.csv`,
      svgFileName: `germany-net-pay-income-tax-social-security.svg`,
      csvHeader: 'grossIncomeEUR,netPayIncomeTaxAndSocialSecurityEUR',
    },
  },
};

plotTaxCurves(config);



const config_income_only = {
  country: 'Germany',
  countryLabel: 'Germany',
  currency: 'EUR',
  enabledSchedules: ['income tax'],
  scenarioLabel: `Income Tax`,
  locale: 'de-DE',
  maxIncome: 200_000,
  marginalRateYFloor: 0.7,
  overallRateYFloor: 0.2,
  lineColors: {
    marginalRate: '#b45309',
    overallRate: '#0369a1',
    overallTaxValue: '#7c3aed',
    netPay: '#15803d',
  },
  chartOverrides: {
    marginalRate: {
      csvFileName: `germany-marginal-rate-income-tax.csv`,
      svgFileName: `germany-marginal-rate-income-tax.svg`,
      csvHeader: 'grossIncomeEUR,marginalRateIncomeTax',
    },
    overallRate: {
      csvFileName: `germany-overall-rate-income-tax.csv`,
      svgFileName: `germany-overall-rate-income-tax.svg`,
      csvHeader: 'grossIncomeEUR,overallRateIncomeTax',
    },
    overallTaxValue: {
      csvFileName: `germany-overall-tax-value-income-tax.csv`,
      svgFileName: `germany-overall-tax-value-income-tax.svg`,
      csvHeader: 'grossIncomeEUR,overallTaxValueIncomeTaxEUR',
    },
    netPay: {
      csvFileName: `germany-net-pay-income-tax.csv`,
      svgFileName: `germany-net-pay-income-tax.svg`,
      csvHeader: 'grossIncomeEUR,netPayIncomeTaxEUR',
    },
  },
};

plotTaxCurves(config_income_only);

