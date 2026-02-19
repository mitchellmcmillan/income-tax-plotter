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
  parseStringLiteral,
} from './taxspec/shared.js';
import { installEvaluationMethods } from './taxspec/evaluationMethods.js';
import { installRuntimeCompileMethods } from './taxspec/runtimeCompileMethods.js';
import { installCodegenMethods } from './taxspec/codegenMethods.js';

export default class TaxSpecInterpreter {
  constructor(taxSpecification, currencyConversions = {}) {
    if (typeof taxSpecification !== 'string' || taxSpecification.trim() === '') {
      throw new Error('taxSpecification must be a non-empty string.');
    }

    this.modelByCountry = this._buildModel(this._parseProgram(taxSpecification));
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
    const prepared = this._prepareEvaluation(country, enabledSchedules, currency, { compile: true });
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

  prepareEvaluator(country, enabledSchedules, currency) {
    return this.prepare(country, enabledSchedules, currency);
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

  _buildModel(programCtx) {
    const countries = new Map();

    for (const countryCtx of programCtx.countryBlock()) {
      // countryName: IDENT | STRING
      const countryNameNode = countryCtx.countryName?.() ?? null;
      let countryName = null;

      if (countryNameNode?.IDENT && countryNameNode.IDENT()) {
        countryName = countryNameNode.IDENT().getText();
      } else if (countryNameNode?.STRING && countryNameNode.STRING()) {
        countryName = parseStringLiteral(countryNameNode.STRING().getText());
      } else if (countryCtx.IDENT && countryCtx.IDENT()) {
        // fallback if your generated parser exposes IDENT directly
        countryName = countryCtx.IDENT().getText();
      } else if (countryCtx.STRING && countryCtx.STRING()) {
        countryName = parseStringLiteral(countryCtx.STRING().getText());
      } else {
        throw new Error('Country block missing name.');
      }

      const countryKey = normalizeIdentifier(countryName);
      if (countries.has(countryKey)) {
        throw new Error(`Duplicate country definition: ${countryName}`);
      }

      // currencyMeta is optional; conversion can be declared as:
      // Country (CUR = 0.60 * EUR) { ... } or Country (11.25 CUR = EUR) { ... }
      let currency = 'EUR';
      let currencyToEur = null;
      if (countryCtx.currencyMeta && countryCtx.currencyMeta()) {
        const currencyMetaCtx = countryCtx.currencyMeta();
        const currencyMetaText = currencyMetaCtx
          .getText()
          .replace(/^\(/, '')
          .replace(/\)$/, '');

        const directMatch = currencyMetaText.match(
          /^([A-Za-z_][A-Za-z0-9_]*)(?:=([0-9]+(?:\.[0-9]+)?)\*([A-Za-z_][A-Za-z0-9_]*))?$/
        );
        const reverseMatch = currencyMetaText.match(
          /^([0-9]+(?:\.[0-9]+)?)([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z_][A-Za-z0-9_]*)$/
        );

        if (directMatch) {
          currency = directMatch[1];

          if (directMatch[2] !== undefined) {
            const conversionRate = Number(directMatch[2]);
            const referenceCurrency = normalizeCurrency(directMatch[3]);
            if (referenceCurrency !== 'EUR') {
              throw new Error(
                `Currency metadata for ${countryName} must reference EUR, e.g. (${currency} = 0.60 * EUR).`
              );
            }

            if (!Number.isFinite(conversionRate) || conversionRate <= 0) {
              throw new Error(`Conversion rate must be positive for currency "${currency}".`);
            }

            currencyToEur = conversionRate;
          }
        } else if (reverseMatch) {
          currency = reverseMatch[2];
          const quotedCurrencyAmount = Number(reverseMatch[1]);
          const referenceCurrency = normalizeCurrency(reverseMatch[3]);
          if (referenceCurrency !== 'EUR') {
            throw new Error(
              `Currency metadata for ${countryName} must reference EUR, e.g. (${currency} = 0.60 * EUR) or (${quotedCurrencyAmount} ${currency} = EUR).`
            );
          }

          if (!Number.isFinite(quotedCurrencyAmount) || quotedCurrencyAmount <= 0) {
            throw new Error(`Conversion rate must be positive for currency "${currency}".`);
          }

          currencyToEur = 1 / quotedCurrencyAmount;
        } else {
          throw new Error(
            `Invalid currency metadata for ${countryName}. Use (CUR = 0.60 * EUR) or (11.25 CUR = EUR).`
          );
        }
      }

      const components = [];

      for (const componentCtx of countryCtx.componentDef()) {
        // componentDef : IDENT (COLON kindToken)? ASSIGN cell SEMI?
        const componentName = componentCtx.IDENT().getText();

        let kind = '_';
        if (componentCtx.kindToken && componentCtx.kindToken()) {
          // kindToken : IDENT | UNDERSCORE
          const kt = componentCtx.kindToken();
          if (kt.IDENT && kt.IDENT()) kind = kt.IDENT().getText();
          else kind = '_';
        }

        const cellCtx = componentCtx.cell();
        const wrapper = cellCtx.wrapper();
        const wrapperKind = 't';
        const bodyType = 'block';
        const bodyCtx = wrapper.block();
        const constantValue = null;

        const kindKey = normalizeIdentifier(kind);
        const componentKey = normalizeIdentifier(componentName);

        components.push({
          id: `${kindKey}:${componentKey}`,
          countryName,
          countryKey,
          currency,
          kind,
          kindKey,
          componentName,
          componentKey,
          wrapperKind,
          bodyType,
          bodyCtx,
          constantValue,
        });
      }

      // Indexes
      const byKindAndName = new Map(); // `${kindKey}:${componentKey}` -> component
      const byKind = new Map();        // kindKey -> [components]
      const byName = new Map();        // componentKey -> [components]

      for (const component of components) {
        const pairKey = `${component.kindKey}:${component.componentKey}`;
        if (byKindAndName.has(pairKey)) {
          throw new Error(
            `Duplicate component in ${countryName}: ${component.kind}:${component.componentName}`
          );
        }
        byKindAndName.set(pairKey, component);

        if (!byKind.has(component.kindKey)) byKind.set(component.kindKey, []);
        byKind.get(component.kindKey).push(component);

        if (!byName.has(component.componentKey)) byName.set(component.componentKey, []);
        byName.get(component.componentKey).push(component);
      }

      countries.set(countryKey, {
        countryName,
        countryKey,
        currency,
        currencyKey: normalizeCurrency(currency),
        currencyToEur,
        components,
        byKindAndName,
        byKind,
        byName,
      });
    }

    return countries;
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

  _prepareEvaluation(country, enabledSchedules, currency, options = {}) {
    const countryModel = this._resolveCountry(country);
    const enabledSet = this._normalizeEnabledSchedules(enabledSchedules);
    const prepared = {
      countryModel,
      enabledSet,
      sourceCurrency: normalizeCurrency(currency),
      activeComponents: this._activeComponents(countryModel, enabledSet),
    };

    if (options.compile) {
      this._initializeCompiledPrepared(prepared);
      this._compilePreparedCountryComponents(prepared, countryModel);
    }

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
installRuntimeCompileMethods(TaxSpecInterpreter);
installCodegenMethods(TaxSpecInterpreter);
