import antlr4 from 'antlr4';
import TaxSpecLexer from './antlr/TaxSpecLexer.js';
import TaxSpecParser from './antlr/TaxSpecParser.js';
import {
  CollectingErrorListener,
  ensureArray,
  extractConversionRate,
  maybeFinite,
  normalizeCurrency,
  normalizeEnabledScheduleToken,
  normalizeIdentifier,
} from './taxspec/shared.js';
import { lowerTaxSpec } from './taxspec/lowerTaxSpec.js';
import { installEvaluationMethods } from './taxspec/evaluationMethods.js';
import { installCodegenMethods } from './taxspec/codegenMethods.js';

export default class TaxSpecInterpreter {
  constructor(taxSpecification, currencyConversions = {}) {
    if (typeof taxSpecification !== 'string' || taxSpecification.trim() === '') {
      throw new Error('taxSpecification must be a non-empty string.');
    }

    this.modelByCountry = lowerTaxSpec(this._parseProgram(taxSpecification));
    this.currencyToEur = this._buildCurrencyConversions(currencyConversions, this.modelByCountry);
  }

  marginalRate(country, enabledSchedules, currency, grossIncome) {
    const prepared = this._prepareEvaluation(country, enabledSchedules, currency);
    return this._evaluateMarginalFromPrepared(prepared, grossIncome);
  }

  overallRate(country, enabledSchedules, currency, grossIncome) {
    const prepared = this._prepareEvaluation(country, enabledSchedules, currency);
    return this._evaluateOverallFromPrepared(prepared, grossIncome);
  }

  prepare(country, enabledSchedules, currency) {
    const prepared = this._prepareEvaluation(country, enabledSchedules, currency);
    const generated = this._tryBuildPreparedCodegen(prepared);
    if (generated) {
      return {
        marginalRate: generated.marginalRate,
        overallRate: generated.overallRate,
        generatedCode: generated.source,
      };
    }

    return {
      marginalRate: (grossIncome) => this._evaluateMarginalFromPrepared(prepared, grossIncome),
      overallRate: (grossIncome) => this._evaluateOverallFromPrepared(prepared, grossIncome),
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

  _resolveCountry(country) {
    const countryKey = normalizeIdentifier(country);
    const countryModel = this.modelByCountry.get(countryKey);
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

  _evaluateMarginalFromPrepared(prepared, grossIncome) {
    const baseState = this._createBaseStateFromPrepared(prepared, grossIncome);
    if (baseState.localIncome < 0) return 0;

    let totalMarginalRate = 0;
    for (const component of prepared.activeComponents) {
      totalMarginalRate += this._evaluateComponentMarginal(component, baseState);
    }
    return maybeFinite(totalMarginalRate);
  }

  _evaluateOverallFromPrepared(prepared, grossIncome) {
    const baseState = this._createBaseStateFromPrepared(prepared, grossIncome);
    if (baseState.localIncome <= 0) return 0;

    let totalTax = 0;
    for (const component of prepared.activeComponents) {
      totalTax += this._evaluateComponentTotal(component, baseState);
    }
    return maybeFinite(totalTax / baseState.localIncome);
  }

  _createBaseStateFromPrepared(prepared, grossIncome) {
    const numericIncome = Number(grossIncome);
    if (!Number.isFinite(numericIncome)) throw new Error('grossIncome must be numeric.');

    const localIncome = this._convertIncomeToCountry(
      numericIncome,
      prepared.sourceCurrency,
      prepared.countryModel.currencyKey
    );

    return {
      prepared,
      countryModel: prepared.countryModel,
      enabledSet: prepared.enabledSet,
      localIncome,
      scope: this._createIncomeScope(localIncome),
      callStack: new Set(),
      memo: new Map(),
    };
  }

  _createIncomeScope(localIncome) {
    const scope = Object.create(null);
    scope.x = localIncome;
    return scope;
  }

  _convertIncomeToCountry(amount, sourceCurrency, targetCurrency) {
    if (sourceCurrency === targetCurrency) return amount;

    const sourceRate = this.currencyToEur.get(sourceCurrency);
    const targetRate = this.currencyToEur.get(targetCurrency);
    if (!sourceRate || !targetRate) {
      throw new Error(`Missing currency conversion for ${sourceCurrency} -> ${targetCurrency}`);
    }
    return (amount * sourceRate) / targetRate;
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

installEvaluationMethods(TaxSpecInterpreter);
installCodegenMethods(TaxSpecInterpreter);
