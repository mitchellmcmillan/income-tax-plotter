#!/usr/bin/env node
import { plotTaxCurves } from './plot-marginal-rate-common.js';
import {
  DE_IncomeTaxPlusSocial_m,
  DE_IncomeTaxPlusSocial_v,
} from '../artifacts/germany-handwritten-fast.js';

function parseImplementationFlag(argv) {
  let implementation = 'taxspec';

  for (const arg of argv) {
    if (arg === '--handwritten' || arg === '--impl=handwritten') {
      implementation = 'handwritten';
      continue;
    }
    if (arg === '--taxspec' || arg === '--impl=taxspec') {
      implementation = 'taxspec';
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/plot-germany-marginal-rate.js [--impl=taxspec|handwritten]');
      console.log('       node scripts/plot-germany-marginal-rate.js [--taxspec|--handwritten]');
      process.exit(0);
    }
    if (arg.startsWith('--impl=')) {
      throw new Error(`Unknown implementation "${arg.slice('--impl='.length)}". Use "taxspec" or "handwritten".`);
    }
  }

  return implementation;
}

const implementation = parseImplementationFlag(process.argv.slice(2));
console.log(`Implementation: ${implementation}`);

const outputSuffix = implementation === 'taxspec' ? '' : '-handwritten';
const titleSuffix = implementation === 'taxspec' ? '' : ' (handwritten)';

const config = {
  country: 'Germany',
  countryLabel: 'Germany',
  currency: 'EUR',
  enabledSchedules: ['income tax', 'social security'],
  scenarioLabel: `Income Tax + Social Security${titleSuffix}`,
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
      csvFileName: `germany-marginal-rate-income-tax-social-security${outputSuffix}.csv`,
      svgFileName: `germany-marginal-rate-income-tax-social-security${outputSuffix}.svg`,
      csvHeader: 'grossIncomeEUR,marginalRateIncomeTaxAndSocialSecurity',
    },
    overallRate: {
      csvFileName: `germany-overall-rate-income-tax-social-security${outputSuffix}.csv`,
      svgFileName: `germany-overall-rate-income-tax-social-security${outputSuffix}.svg`,
      csvHeader: 'grossIncomeEUR,overallRateIncomeTaxAndSocialSecurity',
    },
    overallTaxValue: {
      csvFileName: `germany-overall-tax-value-income-tax-social-security${outputSuffix}.csv`,
      svgFileName: `germany-overall-tax-value-income-tax-social-security${outputSuffix}.svg`,
      csvHeader: 'grossIncomeEUR,overallTaxValueIncomeTaxAndSocialSecurityEUR',
    },
    netPay: {
      csvFileName: `germany-net-pay-income-tax-social-security${outputSuffix}.csv`,
      svgFileName: `germany-net-pay-income-tax-social-security${outputSuffix}.svg`,
      csvHeader: 'grossIncomeEUR,netPayIncomeTaxAndSocialSecurityEUR',
    },
  },
};

if (implementation === 'handwritten') {
  config.evaluators = {
    marginalRate: (grossIncome) => DE_IncomeTaxPlusSocial_m(grossIncome),
    overallTaxValue: (grossIncome) => DE_IncomeTaxPlusSocial_v(grossIncome),
  };
}

plotTaxCurves(config);

