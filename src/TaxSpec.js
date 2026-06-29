import antlr4 from 'antlr4';
import TaxSpecLexer from './antlr/TaxSpecLexer.js';
import TaxSpecParser from './antlr/TaxSpecParser.js';
import {
  CollectingErrorListener,
  ensureArray,
  extractConversionRate,
  normalizeCurrency,
  normalizeEnabledScheduleToken,
  normalizeIdentifier,
} from './taxspec/shared.js';
import { analyzePlotBreaks, lowerTaxSpec } from './taxspec/lowerTaxSpec.js';
import { installCodegenMethods } from './taxspec/codegenMethods.js';

const INTERNALS = new WeakMap();

export default class TaxSpec {
  constructor(taxSpecification, currencyConversions = {}) {
    if (typeof taxSpecification !== 'string' || taxSpecification.trim() === '') {
      throw new Error('taxSpecification must be a non-empty string.');
    }

    const models = lowerTaxSpec(this._parseProgram(taxSpecification));
    const plotBreaks = analyzePlotBreaks(models);
    const currencies = this._buildCurrencyConversions(currencyConversions, models);
    INTERNALS.set(this, {
      models,
      currencies,
      plotBreaks,
      catalogue: this._buildCatalogue(models, currencies, plotBreaks),
    });
  }

  getCatalogue() {
    return INTERNALS.get(this).catalogue;
  }

  prepare(country, enabledSchedules, currency, periodsPerYear = 1) {
    const prepared = this._prepareEvaluation(country, enabledSchedules, currency);
    let generated;
    try {
      generated = this._buildPreparedCodegen(prepared);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to compile TaxSpec for ${prepared.countryModel.countryName}: ${message}`);
    }
    const evaluateMarginalRate = generated.marginalRate;
    const evaluateOverallRate = generated.overallRate;
    const finite = (name, income, outcome) => {
      if (!Number.isFinite(outcome)) {
        throw new Error(
          `Non-finite ${name} for ${prepared.countryModel.countryName} at income ${income}.`
        );
      }
      return outcome;
    };
    const marginalRate = (grossIncome) => {
      const income = Number(grossIncome);
      return income < 0
        ? 0
        : finite('marginalRate', income, evaluateMarginalRate(income * periodsPerYear));
    };
    const overallRate = (grossIncome) => {
      const income = Number(grossIncome);
      return income <= 0
        ? 0
        : finite('overallRate', income, evaluateOverallRate(income * periodsPerYear));
    };
    const taxPaid = (grossIncome) => {
      const income = Number(grossIncome);
      return income <= 0 ? 0 : finite('taxPaid', income, overallRate(income) * income);
    };
    const breakAnalysis = INTERNALS.get(this).plotBreaks.get(prepared.countryModel.countryKey);
    const sourceRate = this._currencies().get(prepared.sourceCurrency);
    const countryRate = this._currencies().get(prepared.countryModel.currencyKey);
    const plotBreaks = Object.freeze(breakAnalysis.breaks.map((value) =>
      Number(((value * countryRate) / (sourceRate * periodsPerYear)).toFixed(9))
    ));
    return {
      marginalRate,
      overallRate,
      taxPaid,
      netPay: (grossIncome) => {
        const income = Number(grossIncome);
        return income <= 0 ? income : finite('netPay', income, income - taxPaid(income));
      },
      plotBreaks,
      plotBreakCoverageComplete: breakAnalysis.complete,
    };
  }

  _parseProgram(taxSpecification) {
    const input = antlr4.CharStreams.fromString(taxSpecification);
    const lexer = new TaxSpecLexer(input);
    const parser = new TaxSpecParser(new antlr4.CommonTokenStream(lexer));

    const errorListener = new CollectingErrorListener();
    lexer.removeErrorListeners();
    parser.removeErrorListeners();
    lexer.addErrorListener(errorListener);
    parser.addErrorListener(errorListener);

    parser.buildParseTrees = true;
    const tree = parser.program();

    if (errorListener.errors.length > 0 || parser._syntaxErrors > 0) {
      const message = errorListener.errors.join('\n') || 'Unknown parse error.';
      throw new Error(`Failed to parse tax specification:\n${message}`);
    }
    return tree;
  }

  _normalizeCurrencyConversions(currencyConversions) {
    const conversions = new Map();

    if (currencyConversions instanceof Map) {
      for (const [currencyCode, rawRate] of currencyConversions.entries()) {
        const normalizedCode = normalizeCurrency(currencyCode);
        const rate = extractConversionRate(rawRate, normalizedCode);
        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error(`Conversion rate must be positive for currency "${normalizedCode}".`);
        }
        conversions.set(normalizedCode, rate);
      }
    } else if (currencyConversions && typeof currencyConversions === 'object') {
      for (const [currencyCode, rawRate] of Object.entries(currencyConversions)) {
        const normalizedCode = normalizeCurrency(currencyCode);
        const rate = extractConversionRate(rawRate, normalizedCode);
        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error(`Conversion rate must be positive for currency "${normalizedCode}".`);
        }
        conversions.set(normalizedCode, rate);
      }
    } else {
      throw new Error('currencyConversions must be an object or Map.');
    }

    if (!conversions.has('EUR')) conversions.set('EUR', 1);
    return conversions;
  }

  _buildCurrencyConversions(currencyConversions, modelByCountry) {
    const conversions = this._normalizeCurrencyConversions(currencyConversions);

    for (const countryModel of modelByCountry.values()) {
      if (Number.isFinite(countryModel.currencyToEur)) {
        conversions.set(countryModel.currencyKey, countryModel.currencyToEur);
      }
    }

    for (const countryModel of modelByCountry.values()) {
      if (!conversions.has(countryModel.currencyKey)) {
        throw new Error(
          `Missing conversion rate for currency "${countryModel.currencyKey}" in country "${countryModel.countryName}".`
        );
      }
    }

    return conversions;
  }

  _buildCatalogue(models, currencyConversions, plotBreakAnalysis) {
    const countries = [...models.values()].map((country) =>
      Object.freeze({
        id: country.countryName,
        label: country.countryName.replace(/_/g, ' '),
        currency: country.currencyKey,
        scheduleKinds: Object.freeze([
          ...new Set(
            country.components
              .map((component) => component.kindKey)
              .filter((kind) => kind !== '_')
          ),
        ]),
        plotBreaks: plotBreakAnalysis.get(country.countryKey).breaks,
      })
    );
    const currencies = [...currencyConversions].map(([code, eurRate]) =>
      Object.freeze({ code, eurRate })
    );
    return Object.freeze({
      countries: Object.freeze(countries),
      currencies: Object.freeze(currencies),
    });
  }

  _resolveCountry(country) {
    const countryKey = normalizeIdentifier(country);
    const countryModel = this._models().get(countryKey);
    if (!countryModel) throw new Error(`Unknown country: ${country}`);
    return countryModel;
  }

  _normalizeEnabledSchedules(enabledSchedules) {
    const scheduleList = ensureArray(enabledSchedules);
    if (scheduleList === null) return null;

    const normalized = scheduleList
      .map((value) => normalizeEnabledScheduleToken(value))
      .filter(Boolean);

    if (normalized.includes('_')) {
      throw new Error('enabledSchedules cannot include "_" (internal helper kind).');
    }

    return new Set(normalized);
  }

  _prepareEvaluation(country, enabledSchedules, currency) {
    const countryModel = this._resolveCountry(country);
    const enabledSet = this._normalizeEnabledSchedules(enabledSchedules);
    const prepared = {
      countryModel,
      enabledSet,
      sourceCurrency: normalizeCurrency(currency),
      activeComponents: this._activeComponents(countryModel, enabledSet),
    };

    return prepared;
  }

  _models() {
    return INTERNALS.get(this).models;
  }

  _currencies() {
    return INTERNALS.get(this).currencies;
  }

  _activeComponents(countryModel, enabledSet) {
    if (enabledSet === null) {
      return countryModel.components.filter((component) => component.kindKey !== '_');
    }
    if (enabledSet.size === 0) return [];
    return countryModel.components.filter((component) => this._isComponentEnabled(component, enabledSet));
  }

  _isComponentEnabled(component, enabledSet) {
    if (enabledSet === null) return true;
    if (component.kindKey === '_') return false;

    // Enable keys supported:
    // - kind (e.g. "income_tax")
    // - component name (e.g. "de_est")
    // - kind:component or kind.component
    // - country:kind, country:component, country:kind:component
    const kind = component.kindKey;
    const name = component.componentKey;
    const country = component.countryKey;

    const kindColon = `${kind}:${name}`;
    const kindDot = `${kind}.${name}`;

    const countryKind = `${country}:${kind}`;
    const countryName = `${country}:${name}`;
    const countryKindColon = `${country}:${kindColon}`;
    const countryKindDot = `${country}:${kindDot}`;

    return (
      enabledSet.has(kind) ||
      enabledSet.has(name) ||
      enabledSet.has(kindColon) ||
      enabledSet.has(kindDot) ||
      enabledSet.has(countryKind) ||
      enabledSet.has(countryName) ||
      enabledSet.has(countryKindColon) ||
      enabledSet.has(countryKindDot)
    );
  }

}

installCodegenMethods(TaxSpec);
