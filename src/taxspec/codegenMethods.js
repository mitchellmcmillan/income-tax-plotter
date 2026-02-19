import {
  DEFAULT_INTEGRATION_STEP,
  FIX_ABSOLUTE_TOLERANCE,
  FIX_MAX_BOUND,
  FIX_MAX_ITERATIONS,
  FIX_MIN_BOUND,
  FIX_NEWTON_MIN_DENOM,
  FIX_RELATIVE_TOLERANCE,
  MAX_INTEGRATION_SEGMENTS,
  MIN_DERIVATIVE_STEP,
  MIN_INTEGRATION_SEGMENTS,
  normalizeIdentifier,
  parseStringLiteral,
} from './shared.js';

class CodegenMethods {
  _tryBuildPreparedCodegen(prepared) {
    try {
      const source = this._buildPreparedCodegenSource(prepared);
      if (!source) return null;

      const compiled = new Function(source)();
      if (!compiled || typeof compiled.marginalRate !== 'function' || typeof compiled.overallRate !== 'function') {
        return null;
      }

      return {
        source,
        marginalRate: compiled.marginalRate,
        overallRate: compiled.overallRate,
      };
    } catch {
      return null;
    }
  }

  _buildPreparedCodegenSource(prepared) {
    const allCountryComponents = [...prepared.countryModel.components];
    const countryByKey = new Map();
    for (const [countryKey, countryModel] of this.modelByCountry.entries()) {
      countryByKey.set(countryKey, countryModel);
    }

    const fullDependencyGraph = this._codegenBuildPreparedCountryDependencyGraph(prepared, allCountryComponents);
    const reachableKeys = this._codegenCollectReachableComponentKeys(prepared.activeComponents, fullDependencyGraph);
    const componentList = fullDependencyGraph.fullyResolved
      ? allCountryComponents.filter((component) => reachableKeys.has(this._codegenComponentMapKey(component)))
      : allCountryComponents;
    if (componentList.length === 0) return null;

    const componentIndexByKey = new Map();
    for (let index = 0; index < componentList.length; index += 1) {
      const component = componentList[index];
      componentIndexByKey.set(this._codegenComponentMapKey(component), index);
    }

    const sourceRate = this.currencyToEur.get(prepared.sourceCurrency);
    const targetRate = this.currencyToEur.get(prepared.countryModel.currencyKey);
    if (!sourceRate || !targetRate) {
      throw new Error(`Missing currency conversion for ${prepared.sourceCurrency} -> ${prepared.countryModel.currencyKey}`);
    }
    const sourceToCountryFactor = sourceRate / targetRate;

    const context = {
      prepared,
      componentList,
      componentIndexByKey,
      countryByKey,
      fixWarmStateNames: [],
      tempCounter: 0,
    };
    const dependencyGraph = this._codegenBuildPreparedCountryDependencyGraph(prepared, componentList);
    context.dependencyGraph = dependencyGraph;
    const useCycleGuards = !dependencyGraph.acyclic;

    const componentFunctionDefs = componentList
      .flatMap((component) => this._codegenEmitComponentFunctions(component, context));

    const activeMarginalFunctionNames = prepared.activeComponents
      .map((component) => {
        const index = componentIndexByKey.get(this._codegenComponentMapKey(component));
        return this._codegenMarginalFunctionName(index);
      });
    const activeMarginalCalls = activeMarginalFunctionNames
      .map((fnName) => `${fnName}(localIncome, c)`);
    const activeMarginalExpression = activeMarginalCalls.join(' + ') || '0';

    const activeTotalFunctionNames = prepared.activeComponents
      .map((component) => {
        const index = componentIndexByKey.get(this._codegenComponentMapKey(component));
        return this._codegenTotalFunctionName(index);
      });
    const activeTotalCalls = activeTotalFunctionNames
      .map((fnName) => `${fnName}(localIncome, c)`);
    const activeTotalExpression = activeTotalCalls.join(' + ') || '0';

    const rootFunctionNames = new Set([...activeMarginalFunctionNames, ...activeTotalFunctionNames]);
    const reachableFunctionNames = this._codegenCollectReachableGeneratedFunctions(
      componentFunctionDefs,
      rootFunctionNames
    );
    const emittedFunctionDefs = componentFunctionDefs.filter((def) => reachableFunctionNames.has(def.name));
    const componentFunctionBlocks = emittedFunctionDefs.map((def) => def.code).join('\n\n');
    const emittedComponentIndexSet = new Set(
      [...reachableFunctionNames]
        .map((name) => {
          const match = name.match(/^__[vmt](\d+)(?:_u)?$/);
          return match ? Number(match[1]) : null;
        })
        .filter((index) => Number.isInteger(index))
    );
    const needsCacheState = componentList.some(
      (component, index) => emittedComponentIndexSet.has(index) && !this._codegenCanBypassMemoForComponent(component, context)
    );

    const enabledArrayLiteral = prepared.enabledSet === null
      ? 'null'
      : JSON.stringify([...prepared.enabledSet.values()]);
    const runtimeUsageSource = `${componentFunctionBlocks}\n${activeMarginalExpression}\n${activeTotalExpression}`;
    const helperUsage = this._codegenDetectHelperUsage(runtimeUsageSource);
    const runtimeHelperBlocks = this._codegenEmitRuntimeHelperBlocks(helperUsage);
    const fixWarmStateDeclarations = context.fixWarmStateNames
      .map((name) => `let ${name} = 0;`)
      .join('\n  ');
    const enabledSetDeclaration = helperUsage.enabledToken
      ? `const __enabledSet = ${enabledArrayLiteral} === null ? null : new Set(${enabledArrayLiteral});`
      : '';
    const runtimeHelpersSource = runtimeHelperBlocks.join('\n\n');

    return `return (() => {
  "use strict";

  const __DEFAULT_INTEGRATION_STEP = ${DEFAULT_INTEGRATION_STEP};
  const __MIN_INTEGRATION_SEGMENTS = ${MIN_INTEGRATION_SEGMENTS};
  const __MAX_INTEGRATION_SEGMENTS = ${MAX_INTEGRATION_SEGMENTS};
  const __MIN_DERIVATIVE_STEP = ${MIN_DERIVATIVE_STEP};
  const __FIX_MAX_ITERATIONS = ${FIX_MAX_ITERATIONS};
  const __FIX_RELATIVE_TOLERANCE = ${FIX_RELATIVE_TOLERANCE};
  const __FIX_ABSOLUTE_TOLERANCE = ${FIX_ABSOLUTE_TOLERANCE};
  const __FIX_MIN_BOUND = ${FIX_MIN_BOUND};
  const __FIX_MAX_BOUND = ${FIX_MAX_BOUND};
  const __FIX_NEWTON_MIN_DENOM = ${FIX_NEWTON_MIN_DENOM};
  const __COMPONENT_COUNT = ${componentList.length};
  const __SOURCE_TO_COUNTRY = ${this._codegenNumberLiteral(sourceToCountryFactor)};
  const __USE_CYCLE_GUARDS = ${useCycleGuards ? 'true' : 'false'};
  const __NEEDS_CACHE_STATE = ${needsCacheState ? 'true' : 'false'};

  ${enabledSetDeclaration}

  ${runtimeHelpersSource}

  ${fixWarmStateDeclarations}

${componentFunctionBlocks}

  function __newCacheState() {
    return {
      vx: new Array(__COMPONENT_COUNT),
      vv: new Array(__COMPONENT_COUNT),
      vh: new Uint8Array(__COMPONENT_COUNT),
      mx: new Array(__COMPONENT_COUNT),
      mv: new Array(__COMPONENT_COUNT),
      mh: new Uint8Array(__COMPONENT_COUNT),
      tx: new Array(__COMPONENT_COUNT),
      tv: new Array(__COMPONENT_COUNT),
      th: new Uint8Array(__COMPONENT_COUNT),
      iv: __USE_CYCLE_GUARDS ? new Uint8Array(__COMPONENT_COUNT) : null,
      im: __USE_CYCLE_GUARDS ? new Uint8Array(__COMPONENT_COUNT) : null,
      it: __USE_CYCLE_GUARDS ? new Uint8Array(__COMPONENT_COUNT) : null,
    };
  }

  function __toCountryIncome(grossIncome) {
    return grossIncome * __SOURCE_TO_COUNTRY;
  }

  const __persistentCacheState = __NEEDS_CACHE_STATE ? __newCacheState() : null;

  return {
    marginalRate(grossIncome) {
      const numericIncome = Number(grossIncome);
      if (!Number.isFinite(numericIncome)) throw new Error('grossIncome must be numeric.');

      const localIncome = __toCountryIncome(numericIncome);
      if (localIncome < 0) return 0;

      const c = __persistentCacheState;
      const totalMarginal = ${activeMarginalExpression};
      return __maybeFinite(totalMarginal);
    },

    overallRate(grossIncome) {
      const numericIncome = Number(grossIncome);
      if (!Number.isFinite(numericIncome)) throw new Error('grossIncome must be numeric.');

      const localIncome = __toCountryIncome(numericIncome);
      if (localIncome <= 0) return 0;

      const c = __persistentCacheState;
      const totalTax = ${activeTotalExpression};
      return __maybeFinite(totalTax / localIncome);
    },
  };
})();`;
  }

  _codegenCollectReachableGeneratedFunctions(functionDefs, rootFunctionNames) {
    const byName = new Map();
    for (const def of functionDefs) {
      byName.set(def.name, def);
    }

    const refsByName = new Map();
    for (const def of functionDefs) {
      const refs = new Set();
      const callPattern = /\b(__[vmt]\d+(?:_u)?)\(/g;
      for (const match of def.code.matchAll(callPattern)) {
        const calledName = match[1];
        if (calledName && calledName !== def.name) refs.add(calledName);
      }
      refsByName.set(def.name, refs);
    }

    const reachable = new Set();
    const stack = [...rootFunctionNames].filter((name) => byName.has(name));
    while (stack.length > 0) {
      const current = stack.pop();
      if (reachable.has(current)) continue;
      reachable.add(current);
      const refs = refsByName.get(current) || new Set();
      for (const next of refs) {
        if (!reachable.has(next) && byName.has(next)) stack.push(next);
      }
    }

    return reachable;
  }

  _codegenDetectHelperUsage(source) {
    const includes = (token) => source.includes(token);

    const usage = {
      maybeFinite: true,
      floorToStep: includes('__floorToStep('),
      ceilToStep: includes('__ceilToStep('),
      roundToStep: includes('__roundToStep('),
      clampFixValue: includes('__clampFixValue('),
      derivativeAt: includes('__derivativeAt('),
      integrate: includes('__integrate('),
      enabledToken: includes('__enabledToken('),
      normalizeIdentifier: includes('__normalizeIdentifier('),
      toNumber: includes('__toNumber('),
    };

    usage.normalizeIdentifier = usage.normalizeIdentifier || usage.enabledToken;
    usage.toNumber = usage.toNumber
      || usage.floorToStep
      || usage.ceilToStep
      || usage.roundToStep
      || usage.derivativeAt
      || usage.integrate;

    return usage;
  }

  _codegenEmitRuntimeHelperBlocks(helperUsage) {
    const blocks = [];

    if (helperUsage.normalizeIdentifier) {
      blocks.push(`function __normalizeIdentifier(value) {
    return String(value ?? '').normalize('NFKC').trim().toLowerCase();
  }`);
    }

    if (helperUsage.toNumber) {
      blocks.push(`function __toNumber(value, fallback = 0) {
    if (value === Infinity || value === -Infinity) return value;
    if (value === true) return 1;
    if (value === false || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }`);
    }

    if (helperUsage.maybeFinite) {
      blocks.push(`function __maybeFinite(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }`);
    }

    if (helperUsage.floorToStep) {
      blocks.push(`function __floorToStep(v, increment = 1) {
    const value = __toNumber(v);
    const s = Math.abs(__toNumber(increment, 1));
    if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.floor(value);
    return Math.floor(value / s) * s;
  }`);
    }

    if (helperUsage.ceilToStep) {
      blocks.push(`function __ceilToStep(v, increment = 1) {
    const value = __toNumber(v);
    const s = Math.abs(__toNumber(increment, 1));
    if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.ceil(value);
    return Math.ceil(value / s) * s;
  }`);
    }

    if (helperUsage.roundToStep) {
      blocks.push(`function __roundToStep(v, increment = 1) {
    const value = __toNumber(v);
    const s = Math.abs(__toNumber(increment, 1));
    if (!Number.isFinite(value) || !Number.isFinite(s) || s === 0) return Math.round(value);
    return Math.round(value / s) * s;
  }`);
    }

    if (helperUsage.clampFixValue) {
      blocks.push(`function __clampFixValue(value) {
    const numeric = Number.isFinite(value) ? value : 0;
    return Math.min(__FIX_MAX_BOUND, Math.max(__FIX_MIN_BOUND, numeric));
  }`);
    }

    if (helperUsage.derivativeAt) {
      blocks.push(`function __derivativeAt(evaluate, x) {
    if (!Number.isFinite(x) || x < 0) return 0;

    const h = __MIN_DERIVATIVE_STEP;
    const valueAtX = __toNumber(evaluate(x));

    if (x > 0) {
      const lower = Math.max(0, x - h);
      if (x <= lower) return 0;
      const valueAtLower = __toNumber(evaluate(lower));
      return (valueAtX - valueAtLower) / (x - lower);
    }

    const upper = x + h;
    if (upper <= x) return 0;
    const valueAtUpper = __toNumber(evaluate(upper));
    return (valueAtUpper - valueAtX) / (upper - x);
  }`);
    }

    if (helperUsage.integrate) {
      blocks.push(`function __integrate(evaluate, lower, upper) {
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) return 0;
    const span = upper - lower;
    const segmentCount = Math.min(
      __MAX_INTEGRATION_SEGMENTS,
      Math.max(__MIN_INTEGRATION_SEGMENTS, Math.ceil(span / __DEFAULT_INTEGRATION_STEP))
    );
    const step = span / segmentCount;

    let total = 0;
    for (let index = 0; index < segmentCount; index += 1) {
      const midpoint = lower + (index + 0.5) * step;
      total += __toNumber(evaluate(midpoint)) * step;
    }
    return total;
  }`);
    }

    if (helperUsage.enabledToken) {
      blocks.push(`function __enabledToken(value) {
    if (__enabledSet === null) return true;
    return __enabledSet.has(__normalizeIdentifier(value));
  }`);
    }

    return blocks;
  }

  _codegenExtractBodyReturnExpression(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return null;

    for (let index = 0; index < lines.length - 1; index += 1) {
      if (/\breturn\b/.test(lines[index])) return null;
    }

    const finalLine = lines[lines.length - 1]?.trim() || '';
    const match = finalLine.match(/^return\s+(.+);$/);
    if (!match) return null;

    return {
      lines: lines.slice(0, -1),
      expression: match[1],
    };
  }

  _codegenCanBypassMemoForComponent(component, context) {
    const componentKey = this._codegenComponentMapKey(component);
    const dependencyCount = context.dependencyGraph?.depsByKey?.get(componentKey)?.size ?? 0;
    const inboundCount = context.dependencyGraph?.inboundByKey?.get(componentKey) ?? 0;
    if (dependencyCount === 0 && inboundCount === 0) return true;
    if (context.dependencyGraph?.acyclic && inboundCount === 0) return true;
    return false;
  }

  _codegenEmitComponentFunctions(component, context) {
    const componentIndex = context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) throw new Error(`Missing codegen component index for ${component.componentName}`);
    const canBypassMemo = this._codegenCanBypassMemoForComponent(component, context);

    const valueFunctionName = this._codegenValueFunctionName(componentIndex);
    const marginalFunctionName = this._codegenMarginalFunctionName(componentIndex);
    const totalFunctionName = this._codegenTotalFunctionName(componentIndex);
    const valueFunctionUncachedName = this._codegenUncachedValueFunctionName(componentIndex);
    const marginalFunctionUncachedName = this._codegenUncachedMarginalFunctionName(componentIndex);
    const totalFunctionUncachedName = this._codegenUncachedTotalFunctionName(componentIndex);

    const fastBracketPlan = this._getFastBracketPlan(component);
    const bracketClosedFormPlan = this._codegenBuildBracketClosedFormPlan(component, context);
    const fastPieceValuePlan = this._getFastPieceValuePlan(component);
    const fastPieceMarginalPlan = this._getFastPieceMarginalPlan(component);
    const symbolicMarginalBodyLines = this._codegenEmitSymbolicMarginalBodyLines(component, context, 'x');

    let valueSetupLines = [];
    let valueExpression = null;
    if (bracketClosedFormPlan) {
      valueExpression = this._codegenEmitBracketClosedFormExpression(bracketClosedFormPlan, context);
    } else if (fastPieceValuePlan) {
      valueExpression = this._codegenEmitFastPieceValueExpression(fastPieceValuePlan, context, 'x');
    } else {
      const valueCode = this._codegenEmitComponentValueExpression(component, context);
      if (valueCode === null) throw new Error(`Unsupported value expression for ${component.componentName}`);
      valueSetupLines = valueCode.lines || [];
      valueExpression = valueCode.expression;
    }

    let marginalExpression = null;
    let marginalSetupLines = [];
    if (component.wrapperKind === 't') {
      if (fastBracketPlan) {
        marginalExpression = this._codegenEmitFastBracketMarginalExpression(fastBracketPlan, context, 'x');
      } else if (bracketClosedFormPlan) {
        marginalExpression = this._codegenEmitBracketClosedFormMarginalExpression(component, bracketClosedFormPlan, context, 'x');
      } else if (fastPieceMarginalPlan) {
        marginalExpression = this._codegenEmitFastPieceMarginalExpression(fastPieceMarginalPlan, context, 'x');
      } else if (symbolicMarginalBodyLines) {
        const extracted = this._codegenExtractBodyReturnExpression(symbolicMarginalBodyLines);
        if (extracted) {
          marginalSetupLines = extracted.lines;
          marginalExpression = extracted.expression;
        } else {
          marginalExpression = `(() => {\n  ${symbolicMarginalBodyLines.join('\n  ')}\n})()`;
        }
      } else {
        marginalExpression = `__derivativeAt((__income) => ${valueFunctionName}(__income, c), x)`;
      }
    } else if (component.wrapperKind === 'l') {
      marginalExpression = '0';
    } else {
      marginalExpression = `${valueFunctionName}(x, c)`;
    }

    let totalExpression = null;
    if (component.wrapperKind === 't') {
      if (bracketClosedFormPlan) {
        totalExpression = this._codegenEmitBracketClosedFormExpression(bracketClosedFormPlan, context);
      } else if (fastPieceValuePlan) {
        totalExpression = `${valueFunctionName}(x, c)`;
      } else {
        totalExpression = `${valueFunctionName}(x, c)`;
      }
    } else if (component.wrapperKind === 'l') {
      totalExpression = `${valueFunctionName}(x, c)`;
    } else {
      if (component.bodyType === 'number') {
        const valueLiteral = this._codegenNumberLiteral(component.constantValue);
        totalExpression = component.constantValue === 0 ? '0' : `(${valueLiteral}) * x`;
      } else {
        totalExpression = `__integrate((__income) => ${marginalFunctionName}(__income, c), 0, x)`;
      }
    }

    const circularErrorMessage = JSON.stringify(
      `Circular component reference detected: ${component.countryName}.${component.kind}.${component.componentName}`
    );

    if (canBypassMemo) {
      const valueBypassBody = bracketClosedFormPlan
        ? this._codegenEmitBracketClosedFormBodyLines(bracketClosedFormPlan, context)
        : fastPieceValuePlan
          ? this._codegenEmitFastPieceValueBodyLines(fastPieceValuePlan, context, 'x')
          : [
              ...valueSetupLines,
              `return ${valueExpression};`,
            ];

      const marginalBypassBody = fastBracketPlan
        ? this._codegenEmitFastBracketMarginalBodyLines(fastBracketPlan, context, 'x')
        : bracketClosedFormPlan
          ? this._codegenEmitBracketClosedFormMarginalBodyLines(component, bracketClosedFormPlan, context, 'x')
        : fastPieceMarginalPlan
          ? this._codegenEmitFastPieceMarginalBodyLines(fastPieceMarginalPlan, context, 'x')
        : symbolicMarginalBodyLines
          ? symbolicMarginalBodyLines
          : [`return ${marginalExpression};`];

      const totalBypassBody = component.wrapperKind === 't' && fastBracketPlan
        ? this._codegenEmitFastBracketTotalBodyLines(fastBracketPlan, context, 'x')
        : component.wrapperKind === 't' && bracketClosedFormPlan
          ? this._codegenEmitBracketClosedFormBodyLines(bracketClosedFormPlan, context)
        : component.wrapperKind === 't' && fastPieceValuePlan
          ? [
              'if (x <= 0) return 0;',
              ...this._codegenEmitFastPieceValueBodyLines(fastPieceValuePlan, context, 'x'),
            ]
          : [`return x <= 0 ? 0 : (${totalExpression});`];

      return [
        {
          name: valueFunctionName,
          code: `function ${valueFunctionName}(x, c) {
  ${valueBypassBody.join('\n  ')}
}`,
        },
        {
          name: valueFunctionUncachedName,
          code: `function ${valueFunctionUncachedName}(x) {
  return ${valueFunctionName}(x, null);
}`,
        },
        {
          name: marginalFunctionName,
          code: `function ${marginalFunctionName}(x, c) {
  ${marginalBypassBody.join('\n  ')}
}`,
        },
        {
          name: marginalFunctionUncachedName,
          code: `function ${marginalFunctionUncachedName}(x) {
  return ${marginalFunctionName}(x, null);
}`,
        },
        {
          name: totalFunctionName,
          code: `function ${totalFunctionName}(x, c) {
  ${totalBypassBody.join('\n  ')}
}`,
        },
        {
          name: totalFunctionUncachedName,
          code: `function ${totalFunctionUncachedName}(x) {
  return ${totalFunctionName}(x, null);
}`,
        },
      ];
    }

    const useCycleGuardsInBody = !context.dependencyGraph?.acyclic;
    const valueEvalLines = [
      ...valueSetupLines,
      `__value = ${valueExpression};`,
    ];
    const marginalEvalLines = [
      ...marginalSetupLines,
      `__value = ${marginalExpression};`,
    ];
    const totalEvalLines = [
      `__value = x <= 0 ? 0 : (${totalExpression});`,
    ];

    const valueBodyLines = useCycleGuardsInBody
      ? [
          `if (__USE_CYCLE_GUARDS) {`,
          `  if (c.iv[${componentIndex}]) throw new Error(${circularErrorMessage});`,
          `  c.iv[${componentIndex}] = 1;`,
          '}',
          'let __value;',
          'try {',
          ...valueEvalLines.map((line) => `  ${line}`),
          '} finally {',
          `  if (__USE_CYCLE_GUARDS) c.iv[${componentIndex}] = 0;`,
          '}',
        ]
      : [
          'let __value;',
          ...valueEvalLines,
        ];

    const marginalBodyLines = useCycleGuardsInBody
      ? [
          `if (__USE_CYCLE_GUARDS) {`,
          `  if (c.im[${componentIndex}]) throw new Error(${circularErrorMessage});`,
          `  c.im[${componentIndex}] = 1;`,
          '}',
          'let __value;',
          'try {',
          ...marginalEvalLines.map((line) => `  ${line}`),
          '} finally {',
          `  if (__USE_CYCLE_GUARDS) c.im[${componentIndex}] = 0;`,
          '}',
        ]
      : [
          'let __value;',
          ...marginalEvalLines,
        ];

    const totalBodyLines = useCycleGuardsInBody
      ? [
          `if (__USE_CYCLE_GUARDS) {`,
          `  if (c.it[${componentIndex}]) throw new Error(${circularErrorMessage});`,
          `  c.it[${componentIndex}] = 1;`,
          '}',
          'let __value;',
          'try {',
          ...totalEvalLines.map((line) => `  ${line}`),
          '} finally {',
          `  if (__USE_CYCLE_GUARDS) c.it[${componentIndex}] = 0;`,
          '}',
        ]
      : [
          'let __value;',
          ...totalEvalLines,
        ];

    const uncachedFunctionDefs = useCycleGuardsInBody
      ? []
      : [
          {
            name: valueFunctionUncachedName,
            code: `function ${valueFunctionUncachedName}(x) {
  ${valueBodyLines.join('\n  ')}
  return __value;
}`,
          },
          {
            name: marginalFunctionUncachedName,
            code: `function ${marginalFunctionUncachedName}(x) {
  ${marginalBodyLines.join('\n  ')}
  return __value;
}`,
          },
          {
            name: totalFunctionUncachedName,
            code: `function ${totalFunctionUncachedName}(x) {
  ${totalBodyLines.join('\n  ')}
  return __value;
}`,
          },
        ];

    return [
      ...uncachedFunctionDefs,
      {
        name: valueFunctionName,
        code: `function ${valueFunctionName}(x, c) {
  if (c.vh[${componentIndex}] && c.vx[${componentIndex}] === x) return c.vv[${componentIndex}];
  ${valueBodyLines.join('\n  ')}
  c.vh[${componentIndex}] = 1;
  c.vx[${componentIndex}] = x;
  c.vv[${componentIndex}] = __value;
  return __value;
}`,
      },

      {
        name: marginalFunctionName,
        code: `function ${marginalFunctionName}(x, c) {
  if (c.mh[${componentIndex}] && c.mx[${componentIndex}] === x) return c.mv[${componentIndex}];
  ${marginalBodyLines.join('\n  ')}
  c.mh[${componentIndex}] = 1;
  c.mx[${componentIndex}] = x;
  c.mv[${componentIndex}] = __value;
  return __value;
}`,
      },

      {
        name: totalFunctionName,
        code: `function ${totalFunctionName}(x, c) {
  if (c.th[${componentIndex}] && c.tx[${componentIndex}] === x) return c.tv[${componentIndex}];
  ${totalBodyLines.join('\n  ')}
  c.th[${componentIndex}] = 1;
  c.tx[${componentIndex}] = x;
  c.tv[${componentIndex}] = __value;
  return __value;
}`,
      },
    ];
  }

  _codegenEmitComponentValueExpression(component, context, options = {}) {
    if (component.bodyType === 'number') {
      return {
        lines: [],
        expression: this._codegenNumberLiteral(component.constantValue),
      };
    }

    const countryModel = options.countryModel || context.countryByKey.get(component.countryKey);
    if (!countryModel) return null;

    const localNames = options.localNames instanceof Map
      ? new Map(options.localNames)
      : new Map();
    const inlineStack = options.inlineStack instanceof Set
      ? new Set(options.inlineStack)
      : new Set();
    inlineStack.add(this._codegenComponentMapKey(component));

    const env = {
      context,
      prepared: context.prepared,
      component,
      countryModel,
      localNames,
      xExpr: options.xExpr ?? 'x',
      inlineStack,
    };

    if (component.bodyType === 'expr') {
      const expression = this._codegenExpr(component.bodyCtx, env);
      if (expression === null) return null;
      return { lines: [], expression };
    }

    return this._codegenCompileTopLevelBlock(component.bodyCtx, env);
  }

  _codegenBuildBracketClosedFormPlan(component, context, options = {}) {
    if (component.wrapperKind !== 't' || component.bodyType !== 'block') return null;

    const countryModel = context.countryByKey.get(component.countryKey);
    if (!countryModel) return null;
    const xExpr = options.xExpr ?? 'x';

    const blockCtx = component.bodyCtx;
    const localNames = new Map();
    const setupLines = [];

    const baseEnv = {
      context,
      prepared: context.prepared,
      component,
      countryModel,
      localNames,
      xExpr,
      inlineStack: options.inlineStack instanceof Set ? options.inlineStack : undefined,
    };

    for (const stmt of blockCtx.stmt()) {
      const variableName = stmt.IDENT().getText();
      const safeName = this._codegenSafeLocalName(variableName, context);
      const valueExpr = this._codegenExpr(stmt.expr(), { ...baseEnv, localNames });
      if (valueExpr === null) return null;
      setupLines.push(`const ${safeName} = ${valueExpr};`);
      localNames.set(variableName, safeName);
    }

    const bracketsLike = this._extractDirectBracketsLikeExpr(blockCtx.expr());
    if (!bracketsLike) return null;

    let selectorExpr = null;
    let rangeArms = null;
    let transformedBounds = null;

    if (bracketsLike.kind === 'brackets') {
      const scheduleCtx = bracketsLike.ctx;
      selectorExpr = this._codegenExpr(scheduleCtx.expr(), { ...baseEnv, localNames });
      if (selectorExpr === null) return null;
      rangeArms = scheduleCtx.rangeArm();
      transformedBounds = rangeArms.map((rangeArm) => {
        const lowerRaw = this._extractNumericBoundLiteral(rangeArm.range().bound(0));
        const upperRaw = this._extractNumericBoundLiteral(rangeArm.range().bound(1));
        return {
          lower: lowerRaw,
          upper: upperRaw,
        };
      });
    } else {
      const bracketsTaxableCtx = bracketsLike.ctx;
      const incomeExpr = this._codegenExpr(bracketsTaxableCtx.expr(0), { ...baseEnv, localNames });
      const allowanceExpr = this._codegenExpr(bracketsTaxableCtx.expr(1), { ...baseEnv, localNames });
      if (incomeExpr === null || allowanceExpr === null) return null;
      selectorExpr = `Math.max(0, ((${incomeExpr}) - (${allowanceExpr})))`;

      const allowanceBaseLiteral = this._extractNumericLiteral(bracketsTaxableCtx.expr(2));
      if (allowanceBaseLiteral === null) return null;
      const allowanceCap = Math.max(0, allowanceBaseLiteral);
      rangeArms = bracketsTaxableCtx.rangeArm();
      transformedBounds = [];
      for (const rangeArm of rangeArms) {
        const lowerRaw = this._extractNumericBoundLiteral(rangeArm.range().bound(0));
        const upperRaw = this._extractNumericBoundLiteral(rangeArm.range().bound(1));
        if (lowerRaw === null || upperRaw === null) return null;
        if (!Number.isFinite(lowerRaw)) return null;
        if (!(upperRaw === Infinity || Number.isFinite(upperRaw))) return null;

        const lowerAllowanceAtBound = this._tryEvaluateBracketsTaxableAllowanceAtBound(
          component,
          bracketsTaxableCtx,
          context,
          lowerRaw,
          allowanceCap
        );
        if (lowerAllowanceAtBound === null) return null;

        let upperAllowanceAtBound = 0;
        if (upperRaw !== Infinity) {
          upperAllowanceAtBound = this._tryEvaluateBracketsTaxableAllowanceAtBound(
            component,
            bracketsTaxableCtx,
            context,
            upperRaw,
            allowanceCap
          );
          if (upperAllowanceAtBound === null) return null;
        }

        transformedBounds.push({
          lower: lowerRaw - lowerAllowanceAtBound,
          upper: upperRaw === Infinity ? Infinity : upperRaw - upperAllowanceAtBound,
        });
      }
    }

    const literalArms = [];
    for (let armIndex = 0; armIndex < rangeArms.length; armIndex += 1) {
      const rangeArm = rangeArms[armIndex];
      const rate = this._extractNumericLiteral(rangeArm.expr());
      const transformed = transformedBounds[armIndex];
      const lower = transformed?.lower;
      const upper = transformed?.upper;

      if (lower === null || upper === null || rate === null) return null;
      if (!Number.isFinite(lower)) return null;
      if (!(upper === Infinity || Number.isFinite(upper))) return null;
      if (upper !== Infinity && upper <= lower) return null;

      literalArms.push({ lower, upper, rate });
    }

    if (literalArms.length === 0) return null;

    let previousUpper = -Infinity;
    let hasGaps = false;
    for (let index = 0; index < literalArms.length; index += 1) {
      const arm = literalArms[index];
      if (index === 0) {
        if (arm.lower > 0) hasGaps = true;
      } else {
        if (arm.lower < previousUpper) return null;
        if (arm.lower > previousUpper) hasGaps = true;
      }
      if (previousUpper === Infinity) return null;
      previousUpper = arm.upper;
    }

    const arms = [];
    let cumulativeTax = 0;
    for (const arm of literalArms) {
      const baseAtLower = cumulativeTax;
      arms.push({
        lower: arm.lower,
        upper: arm.upper,
        rate: arm.rate,
        baseAtLower,
      });
      if (arm.upper !== Infinity) {
        cumulativeTax += (arm.upper - arm.lower) * arm.rate;
      }
    }

    return {
      setupLines,
      selectorExpr,
      arms,
      finalTotal: cumulativeTax,
      hasGaps,
    };
  }

  _extractDirectBracketsLikeExpr(exprCtx) {
    const primaryCtx = this._extractDirectPrimary(exprCtx);
    if (!primaryCtx) return null;

    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) {
      const scheduleCtx = primaryCtx.scheduleExpr();
      const isTotalBandSchedule = scheduleCtx.BRACKETS && scheduleCtx.BRACKETS();
      if (isTotalBandSchedule) {
        return { kind: 'brackets', ctx: scheduleCtx };
      }
      return null;
    }

    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) {
      return { kind: 'bracketsTaxable', ctx: primaryCtx.bracketsTaxableExpr() };
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._extractDirectBracketsLikeExpr(primaryCtx.expr());
    }

    return null;
  }

  _tryEvaluateBracketsTaxableAllowanceAtBound(component, bracketsTaxableCtx, context, boundGrossIncome, allowanceCap) {
    if (!Number.isFinite(boundGrossIncome)) return null;
    try {
      const state = {
        prepared: context.prepared,
        countryModel: context.countryByKey.get(component.countryKey) || context.prepared.countryModel,
        enabledSet: context.prepared.enabledSet,
        localIncome: boundGrossIncome,
        scope: this._createIncomeScope(boundGrossIncome),
        callStack: new Set(),
        memo: new Map(),
        blockStatements: component.bodyCtx?.stmt ? component.bodyCtx.stmt() : null,
      };

      const evaluateAllowance = (nextState) => this._evaluateExpr(bracketsTaxableCtx.expr(1), nextState);
      const allowanceAtBound = this._evaluateBracketsTaxableAllowanceAtIncome(
        evaluateAllowance,
        state,
        boundGrossIncome,
        allowanceCap
      );
      if (!Number.isFinite(allowanceAtBound)) return null;
      return allowanceAtBound;
    } catch {
      return null;
    }
  }

  _codegenCompileTopLevelBlock(blockCtx, env) {
    const localNames = new Map(env.localNames);
    const lines = [];

    for (const stmt of blockCtx.stmt()) {
      const variableName = stmt.IDENT().getText();
      const safeName = this._codegenSafeLocalName(variableName, env.context);

      const fixAssignmentLines = this._codegenTryCompileInlineFixAssignment(stmt.expr(), { ...env, localNames }, safeName);
      if (fixAssignmentLines) {
        lines.push(...fixAssignmentLines);
        localNames.set(variableName, safeName);
        continue;
      }

      const valueExpr = this._codegenExpr(stmt.expr(), { ...env, localNames });
      if (valueExpr === null) return null;
      lines.push(`const ${safeName} = ${valueExpr};`);
      localNames.set(variableName, safeName);
    }

    const expression = this._codegenExpr(blockCtx.expr(), { ...env, localNames });
    if (expression === null) return null;

    return { lines, expression };
  }

  _codegenTryCompileInlineFixAssignment(exprCtx, env, targetName) {
    const primaryCtx = this._extractDirectPrimary(exprCtx);
    if (!primaryCtx || !(primaryCtx.fixCall && primaryCtx.fixCall())) return null;

    const fixCallCtx = primaryCtx.fixCall();
    const initExpr = this._codegenExpr(fixCallCtx.expr(0), env);
    if (initExpr === null) return null;

    const fixTerms = this._codegenBuildFixUpdateTerms(fixCallCtx, env, targetName, {
      withXDerivative: false,
      withKDerivative: true,
    });
    if (!fixTerms || fixTerms.updateExpr === null) return null;

    return this._codegenBuildFixLoopLines(initExpr, fixTerms.updateExpr, targetName, env.context, {
      withReturn: false,
      updateKDerivativeExpr: fixTerms.updateKDerivativeExpr,
    });
  }

  _codegenBuildFixUpdateTerms(fixCallCtx, env, kName, options = {}) {
    const withXDerivative = Boolean(options.withXDerivative);
    const withKDerivative = Boolean(options.withKDerivative);

    const localNames = new Map(env.localNames);
    localNames.set('k', kName);

    const updateExpr = this._codegenExpr(fixCallCtx.expr(1), { ...env, localNames });
    if (updateExpr === null) return null;

    let updateXDerivativeExpr = null;
    if (withXDerivative) {
      const localDerivatives = env.localDerivatives instanceof Map
        ? new Map(env.localDerivatives)
        : new Map();
      localDerivatives.set('k', '0');
      const localDuals = env.localDuals instanceof Map
        ? new Map(env.localDuals)
        : new Map();
      localDuals.set('k', this._codegenDual(kName, '0'));

      const updateDualX = this._codegenDualExpr(fixCallCtx.expr(1), {
        ...env,
        localNames,
        localDerivatives,
        localDuals,
        dxExpr: env.dxExpr || '1',
      });
      if (updateDualX) updateXDerivativeExpr = updateDualX.derivative;
    }

    let updateKDerivativeExpr = null;
    if (withKDerivative) {
      const localDerivatives = env.localDerivatives instanceof Map
        ? new Map(env.localDerivatives)
        : new Map();
      localDerivatives.set('k', '1');
      const localDuals = env.localDuals instanceof Map
        ? new Map(env.localDuals)
        : new Map();
      localDuals.set('k', this._codegenDual(kName, '1'));

      const updateDualK = this._codegenDualExpr(fixCallCtx.expr(1), {
        ...env,
        localNames,
        localDerivatives,
        localDuals,
        dxExpr: '0',
      });
      if (updateDualK) updateKDerivativeExpr = updateDualK.derivative;
    }

    return {
      updateExpr,
      updateXDerivativeExpr,
      updateKDerivativeExpr,
    };
  }

  _codegenBuildFixLoopLines(initExpr, updateExpr, targetName, context, options = {}) {
    const nextName = this._codegenTempName('next', context);
    const deltaName = this._codegenTempName('delta', context);
    const scaleName = this._codegenTempName('scale', context);
    const indexName = this._codegenTempName('i', context);
    const minIterationCount = Number.isInteger(options.minIterationCount) && options.minIterationCount >= 0
      ? options.minIterationCount
      : 0;
    const updateKDerivativeExpr = options.updateKDerivativeExpr ?? null;
    const updateXDerivativeExpr = options.updateXDerivativeExpr ?? null;
    const derivativeTargetName = options.derivativeTargetName ?? null;
    const warmStateName = options.warmStateName || this._codegenRegisterFixWarmStateName(context);

    const lines = [
      `let ${targetName} = Number.isFinite(${warmStateName}) ? __clampFixValue(${warmStateName}) : __clampFixValue(__toNumber(${initExpr}));`,
    ];

    if (updateKDerivativeExpr !== null) {
      const value0Name = this._codegenTempName('value0', context);
      const slope0Name = this._codegenTempName('slope0', context);
      const denom0Name = this._codegenTempName('denom0', context);
      const candidateName = this._codegenTempName('candidate', context);
      const baselineResidualName = this._codegenTempName('baselineResidual', context);
      const previousKName = this._codegenTempName('previousK', context);
      const candidateValueName = this._codegenTempName('candidateValue', context);
      const candidateResidualName = this._codegenTempName('candidateResidual', context);

      lines.push(
        `const ${value0Name} = __clampFixValue(__toNumber(${updateExpr}, ${targetName}));`,
        `const ${slope0Name} = ${updateKDerivativeExpr};`,
        `const ${denom0Name} = 1 - ${slope0Name};`,
        `if (Number.isFinite(${denom0Name}) && Math.abs(${denom0Name}) >= __FIX_NEWTON_MIN_DENOM) {`,
        `  const ${candidateName} = __clampFixValue(${targetName} - (${targetName} - ${value0Name}) / ${denom0Name});`,
        `  if (Number.isFinite(${candidateName})) {`,
        `    const ${baselineResidualName} = Math.abs(${targetName} - ${value0Name});`,
        `    const ${previousKName} = ${targetName};`,
        `    ${targetName} = ${candidateName};`,
        `    const ${candidateValueName} = __clampFixValue(__toNumber(${updateExpr}, ${targetName}));`,
        `    const ${candidateResidualName} = Math.abs(${targetName} - ${candidateValueName});`,
        `    if (!Number.isFinite(${candidateResidualName}) || ${candidateResidualName} > ${baselineResidualName} + __FIX_ABSOLUTE_TOLERANCE) {`,
        `      ${targetName} = ${value0Name};`,
        '    }',
        '  } else {',
        `    ${targetName} = ${value0Name};`,
        '  }',
        '}'
      );
    }

    lines.push(
      `for (let ${indexName} = 0; ${indexName} < __FIX_MAX_ITERATIONS; ${indexName} += 1) {`,
      `  const ${nextName} = __clampFixValue(__toNumber(${updateExpr}, ${targetName}));`,
      `  const ${deltaName} = Math.abs(${nextName} - ${targetName});`,
      `  const ${scaleName} = Math.max(Math.abs(${targetName}), Math.abs(${nextName}), 1);`,
      `  ${targetName} = ${nextName};`,
      `  if (${indexName} >= ${minIterationCount} && ${deltaName} <= __FIX_ABSOLUTE_TOLERANCE + __FIX_RELATIVE_TOLERANCE * ${scaleName}) break;`,
      '}',
      `${warmStateName} = ${targetName};`
    );

    if (derivativeTargetName !== null) {
      if (updateXDerivativeExpr !== null && updateKDerivativeExpr !== null) {
        const fkName = this._codegenTempName('fk', context);
        const fxName = this._codegenTempName('fx', context);
        const denomName = this._codegenTempName('denom', context);
        lines.push(
          `const ${fkName} = ${updateKDerivativeExpr};`,
          `const ${fxName} = ${updateXDerivativeExpr};`,
          `const ${denomName} = 1 - ${fkName};`,
          `const ${derivativeTargetName} = (Number.isFinite(${fxName}) && Number.isFinite(${denomName}) && Math.abs(${denomName}) >= __FIX_NEWTON_MIN_DENOM)`,
          `  ? (${fxName} / ${denomName})`,
          '  : 0;'
        );
      } else {
        lines.push(`const ${derivativeTargetName} = 0;`);
      }
    }

    if (options.withReturn) lines.push(`return ${targetName};`);
    return lines;
  }

  _codegenEstimateInlineCost(component) {
    if (!component) return Infinity;
    if (component.bodyType === 'number') return 1;
    if (component.bodyType === 'expr') return 4;

    const statementCount = component.bodyCtx?.stmt ? component.bodyCtx.stmt().length : 0;
    const bodyLength = component.bodyCtx?.getText ? component.bodyCtx.getText().length : 0;
    const bodyCost = Math.ceil(bodyLength / 220);
    return 6 + statementCount * 2 + bodyCost;
  }

  _codegenCanInlineComponentValue(component, env) {
    if (!component || !env || !env.context) return false;

    const componentKey = this._codegenComponentMapKey(component);
    const dependencyCount = env.context.dependencyGraph?.depsByKey?.get(componentKey)?.size ?? 0;
    const inlineStack = env.inlineStack instanceof Set ? env.inlineStack : new Set();
    if (inlineStack.has(componentKey)) return false;

    // Keep inlining shallow and avoid duplicating large block bodies at call sites.
    if (inlineStack.size >= 5) return false;

    if (component.bodyType === 'number') return true;
    if (component.bodyType === 'expr') {
      if (dependencyCount > 0) return false;
      return this._codegenEstimateInlineCost(component) <= 16;
    }

    if (component.bodyType === 'block') {
      const stmtCount = component.bodyCtx?.stmt ? component.bodyCtx.stmt().length : 0;
      if (stmtCount !== 0) return false;
      if (this._getFastBracketPlan(component)) return true;
      if (this._getFastPieceValuePlan(component)) return true;
      return this._codegenEstimateInlineCost(component) <= 12;
    }

    return false;
  }

  _codegenCanInlineComponentMarginal(component, env) {
    if (!component || !env || !env.context) return false;

    const componentKey = this._codegenComponentMapKey(component);
    const inlineStack = env.inlineStack instanceof Set ? env.inlineStack : new Set();
    if (inlineStack.has(componentKey)) return false;
    if (inlineStack.size >= 5) return false;

    if (component.wrapperKind === 'l') return true;
    if (component.wrapperKind === 'm') return this._codegenCanInlineComponentValue(component, env);
    if (component.wrapperKind !== 't') return false;

    if (this._getFastBracketPlan(component)) return true;
    if (this._getFastPieceMarginalPlan(component)) return true;
    if (this._codegenBuildBracketClosedFormPlan(component, env.context)) return true;
    if (component.bodyType === 'number') return true;
    if (component.bodyType === 'expr') return this._codegenEstimateInlineCost(component) <= 16;
    if (component.bodyType === 'block') {
      const stmtCount = component.bodyCtx?.stmt ? component.bodyCtx.stmt().length : 0;
      return stmtCount === 0 && this._codegenEstimateInlineCost(component) <= 12;
    }
    return false;
  }

  _codegenWrapValueCodeAsExpression(valueCode) {
    if (!valueCode) return null;
    if (valueCode.lines && valueCode.lines.length > 0) {
      return `(() => {\n  ${valueCode.lines.join('\n  ')}\n  return ${valueCode.expression};\n})()`;
    }
    return valueCode.expression;
  }

  _codegenDual(value, derivative, constValue = undefined) {
    const resolvedConst = constValue === undefined
      ? this._codegenParseNumericExpression(value)
      : constValue;
    return {
      value,
      derivative,
      constValue: resolvedConst,
    };
  }

  _codegenDualHasConst(dual) {
    return dual && dual.constValue !== null && dual.constValue !== undefined;
  }

  _codegenParseNumericExpression(expression) {
    if (typeof expression !== 'string') return null;
    let text = expression.trim();
    if (!text) return null;

    while (text.startsWith('(') && text.endsWith(')')) {
      const inner = text.slice(1, -1).trim();
      if (!inner) break;
      let depth = 0;
      let balanced = true;
      for (const ch of inner) {
        if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth < 0) {
            balanced = false;
            break;
          }
        }
      }
      if (!balanced || depth !== 0) break;
      text = inner;
    }

    if (text === 'Infinity') return Infinity;
    if (text === '-Infinity') return -Infinity;
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
    const numeric = Number(text);
    return Number.isNaN(numeric) ? null : numeric;
  }

  _codegenExprIsZero(expression) {
    const numeric = this._codegenParseNumericExpression(expression);
    if (numeric === null) return false;
    return Object.is(numeric, 0) || Object.is(numeric, -0);
  }

  _codegenExprIsOne(expression) {
    const numeric = this._codegenParseNumericExpression(expression);
    return numeric !== null && Object.is(numeric, 1);
  }

  _codegenExprIsNegativeOne(expression) {
    const numeric = this._codegenParseNumericExpression(expression);
    return numeric !== null && Object.is(numeric, -1);
  }

  _codegenNegExprSimplified(expression) {
    if (this._codegenExprIsZero(expression)) return '0';
    const numeric = this._codegenParseNumericExpression(expression);
    if (numeric !== null) return this._codegenNumberLiteral(-numeric);
    return `(-(${expression}))`;
  }

  _codegenAddExprSimplified(left, right) {
    if (this._codegenExprIsZero(left)) return right;
    if (this._codegenExprIsZero(right)) return left;
    const leftNum = this._codegenParseNumericExpression(left);
    const rightNum = this._codegenParseNumericExpression(right);
    if (leftNum !== null && rightNum !== null) return this._codegenNumberLiteral(leftNum + rightNum);
    return `((${left}) + (${right}))`;
  }

  _codegenSubExprSimplified(left, right) {
    if (this._codegenExprIsZero(right)) return left;
    if (this._codegenExprIsZero(left)) return this._codegenNegExprSimplified(right);
    const leftNum = this._codegenParseNumericExpression(left);
    const rightNum = this._codegenParseNumericExpression(right);
    if (leftNum !== null && rightNum !== null) return this._codegenNumberLiteral(leftNum - rightNum);
    return `((${left}) - (${right}))`;
  }

  _codegenMulExprSimplified(left, right) {
    if (this._codegenExprIsZero(left) || this._codegenExprIsZero(right)) return '0';
    if (this._codegenExprIsOne(left)) return right;
    if (this._codegenExprIsOne(right)) return left;
    if (this._codegenExprIsNegativeOne(left)) return this._codegenNegExprSimplified(right);
    if (this._codegenExprIsNegativeOne(right)) return this._codegenNegExprSimplified(left);
    const leftNum = this._codegenParseNumericExpression(left);
    const rightNum = this._codegenParseNumericExpression(right);
    if (leftNum !== null && rightNum !== null) return this._codegenNumberLiteral(leftNum * rightNum);
    return `((${left}) * (${right}))`;
  }

  _codegenDivExprSimplified(left, right) {
    if (this._codegenExprIsZero(left)) return '0';
    if (this._codegenExprIsOne(right)) return left;
    if (this._codegenExprIsNegativeOne(right)) return this._codegenNegExprSimplified(left);
    const leftNum = this._codegenParseNumericExpression(left);
    const rightNum = this._codegenParseNumericExpression(right);
    if (leftNum !== null && rightNum !== null) return this._codegenNumberLiteral(leftNum / rightNum);
    return `((${left}) / (${right}))`;
  }

  _codegenPowExprSimplified(left, right, leftConst = null, rightConst = null) {
    if (rightConst !== null && Object.is(rightConst, 0)) return { expression: '1', constValue: 1 };
    if (rightConst !== null && Object.is(rightConst, 1)) return { expression: left, constValue: leftConst };
    if (leftConst !== null && rightConst !== null) {
      const folded = leftConst ** rightConst;
      return {
        expression: this._codegenNumberLiteral(folded),
        constValue: folded,
      };
    }
    return {
      expression: `((${left}) ** (${right}))`,
      constValue: null,
    };
  }

  _codegenDualAdd(left, right, operator) {
    const value = operator === '+'
      ? this._codegenAddExprSimplified(left.value, right.value)
      : this._codegenSubExprSimplified(left.value, right.value);
    const derivative = operator === '+'
      ? this._codegenAddExprSimplified(left.derivative, right.derivative)
      : this._codegenSubExprSimplified(left.derivative, right.derivative);

    let constValue = null;
    if (this._codegenDualHasConst(left) && this._codegenDualHasConst(right)) {
      constValue = operator === '+' ? left.constValue + right.constValue : left.constValue - right.constValue;
    }
    return this._codegenDual(value, derivative, constValue);
  }

  _codegenDualMul(left, right) {
    const value = this._codegenMulExprSimplified(left.value, right.value);
    let constValue = null;
    if (this._codegenDualHasConst(left) && this._codegenDualHasConst(right)) {
      constValue = left.constValue * right.constValue;
    }

    const leftDerivativeZero = this._codegenExprIsZero(left.derivative);
    const rightDerivativeZero = this._codegenExprIsZero(right.derivative);

    let derivative = '0';
    if (!leftDerivativeZero || !rightDerivativeZero) {
      if (leftDerivativeZero) {
        derivative = this._codegenMulExprSimplified(left.value, right.derivative);
      } else if (rightDerivativeZero) {
        derivative = this._codegenMulExprSimplified(left.derivative, right.value);
      } else {
        derivative = this._codegenAddExprSimplified(
          this._codegenMulExprSimplified(left.derivative, right.value),
          this._codegenMulExprSimplified(left.value, right.derivative)
        );
      }
    }

    return this._codegenDual(value, derivative, constValue);
  }

  _codegenDualDiv(left, right) {
    const value = this._codegenDivExprSimplified(left.value, right.value);
    let constValue = null;
    if (this._codegenDualHasConst(left) && this._codegenDualHasConst(right)) {
      constValue = left.constValue / right.constValue;
    }

    const leftDerivativeZero = this._codegenExprIsZero(left.derivative);
    const rightDerivativeZero = this._codegenExprIsZero(right.derivative);

    let derivative = '0';
    if (!leftDerivativeZero || !rightDerivativeZero) {
      if (rightDerivativeZero) {
        derivative = this._codegenDivExprSimplified(left.derivative, right.value);
      } else {
        const numerator = leftDerivativeZero
          ? this._codegenNegExprSimplified(this._codegenMulExprSimplified(left.value, right.derivative))
          : this._codegenSubExprSimplified(
              this._codegenMulExprSimplified(left.derivative, right.value),
              this._codegenMulExprSimplified(left.value, right.derivative)
            );
        const denominator = this._codegenMulExprSimplified(right.value, right.value);
        derivative = this._codegenDivExprSimplified(numerator, denominator);
      }
    }

    return this._codegenDual(value, derivative, constValue);
  }

  _codegenDualPow(left, right) {
    const leftConst = this._codegenDualHasConst(left) ? left.constValue : null;
    const rightConst = this._codegenDualHasConst(right) ? right.constValue : null;
    const powInfo = this._codegenPowExprSimplified(left.value, right.value, leftConst, rightConst);
    const value = powInfo.expression;

    const leftDerivativeZero = this._codegenExprIsZero(left.derivative);
    const rightDerivativeZero = this._codegenExprIsZero(right.derivative);
    if (leftDerivativeZero && rightDerivativeZero) {
      return this._codegenDual(value, '0', powInfo.constValue);
    }

    const logTerm = rightDerivativeZero
      ? '0'
      : this._codegenMulExprSimplified(right.derivative, `Math.log(${left.value})`);
    const powerTerm = leftDerivativeZero
      ? '0'
      : this._codegenDivExprSimplified(
          this._codegenMulExprSimplified(right.value, left.derivative),
          left.value
        );
    const derivative = this._codegenMulExprSimplified(
      value,
      this._codegenAddExprSimplified(logTerm, powerTerm)
    );
    return this._codegenDual(value, derivative, powInfo.constValue);
  }

  _codegenEmitSymbolicMarginalBodyLines(component, context, xExpr = 'x', options = {}) {
    if (!component || component.wrapperKind !== 't') return null;

    const countryModel = context.countryByKey.get(component.countryKey);
    if (!countryModel) return null;

    const env = {
      context,
      prepared: context.prepared,
      component,
      countryModel,
      localNames: new Map(),
      localDerivatives: new Map(),
      localDuals: new Map(),
      xExpr,
      dxExpr: '1',
      inlineStack: (() => {
        const stack = options.inlineStack instanceof Set ? new Set(options.inlineStack) : new Set();
        stack.add(this._codegenComponentMapKey(component));
        return stack;
      })(),
    };

    if (component.bodyType === 'number') return ['return 0;'];

    if (component.bodyType === 'expr') {
      const dual = this._codegenDualExpr(component.bodyCtx, env);
      if (!dual) return null;
      return [`return ${dual.derivative};`];
    }

    if (component.bodyType !== 'block') return null;

    const lines = [];
    for (const stmt of component.bodyCtx.stmt()) {
      const stmtPrimary = this._extractDirectPrimary(stmt.expr());
      if (stmtPrimary?.fixCall && stmtPrimary.fixCall()) {
        const variableName = stmt.IDENT().getText();
        const valueName = this._codegenSafeLocalName(variableName, context);
        const derivativeName = this._codegenSafeLocalName(`${variableName}_d`, context);

        const fixCallCtx = stmtPrimary.fixCall();
        const initExpr = this._codegenExpr(fixCallCtx.expr(0), env);
        if (initExpr === null) return null;

        const fixTerms = this._codegenBuildFixUpdateTerms(fixCallCtx, env, valueName, {
          withXDerivative: true,
          withKDerivative: true,
        });
        if (
          !fixTerms ||
          fixTerms.updateExpr === null ||
          fixTerms.updateXDerivativeExpr === null ||
          fixTerms.updateKDerivativeExpr === null
        ) {
          return null;
        }

        lines.push(
          ...this._codegenBuildFixLoopLines(initExpr, fixTerms.updateExpr, valueName, context, {
            withReturn: false,
            derivativeTargetName: derivativeName,
            updateXDerivativeExpr: fixTerms.updateXDerivativeExpr,
            updateKDerivativeExpr: fixTerms.updateKDerivativeExpr,
          })
        );

        env.localNames.set(variableName, valueName);
        env.localDerivatives.set(variableName, derivativeName);
        env.localDuals.set(variableName, this._codegenDual(valueName, derivativeName));
        continue;
      }

      const variableName = stmt.IDENT().getText();
      const dual = this._codegenDualExpr(stmt.expr(), env);
      if (!dual) return null;

      const valueName = this._codegenSafeLocalName(variableName, context);
      lines.push(`const ${valueName} = ${dual.value};`);

      let derivativeExpr = '0';
      if (!this._codegenExprIsZero(dual.derivative)) {
        const derivativeName = this._codegenSafeLocalName(`${variableName}_d`, context);
        lines.push(`const ${derivativeName} = ${dual.derivative};`);
        derivativeExpr = derivativeName;
      }

      env.localNames.set(variableName, valueName);
      env.localDerivatives.set(variableName, derivativeExpr);
      env.localDuals.set(variableName, this._codegenDual(valueName, derivativeExpr, dual.constValue));
    }

    const resultDual = this._codegenDualExpr(component.bodyCtx.expr(), env);
    if (!resultDual) return null;
    lines.push(`return ${resultDual.derivative};`);
    return lines;
  }

  _codegenDualExpr(exprCtx, env) {
    if (!exprCtx || !exprCtx.orExpr) return null;
    return this._codegenDualOrExpr(exprCtx.orExpr(), env);
  }

  _codegenDualOrExpr(orCtx, env) {
    const terms = orCtx.andExpr();
    if (!terms || terms.length === 0) return null;
    if (terms.length > 1) {
      const value = this._codegenOrExpr(orCtx, env);
      if (value === null) return null;
      return this._codegenDual(value, '0');
    }
    return this._codegenDualAndExpr(terms[0], env);
  }

  _codegenDualAndExpr(andCtx, env) {
    const terms = andCtx.notExpr();
    if (!terms || terms.length === 0) return null;
    if (terms.length > 1) {
      const value = this._codegenAndExpr(andCtx, env);
      if (value === null) return null;
      return this._codegenDual(value, '0');
    }
    return this._codegenDualNotExpr(terms[0], env);
  }

  _codegenDualNotExpr(notCtx, env) {
    if (notCtx.NOT && notCtx.NOT()) {
      const value = this._codegenNotExpr(notCtx, env);
      if (value === null) return null;
      return this._codegenDual(value, '0');
    }
    return this._codegenDualCmpExpr(notCtx.cmpExpr(), env);
  }

  _codegenDualCmpExpr(cmpCtx, env) {
    if (!cmpCtx) return null;
    if (cmpCtx.addExpr(1)) {
      const value = this._codegenCmpExpr(cmpCtx, env);
      if (value === null) return null;
      return this._codegenDual(value, '0');
    }
    return this._codegenDualAddExpr(cmpCtx.addExpr(0), env);
  }

  _codegenDualAddExpr(addCtx, env) {
    const terms = addCtx.mulExpr().map((ctx) => this._codegenDualMulExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 0) return this._codegenDual('0', '0', 0);

    let current = terms[0];
    for (let index = 1; index < terms.length; index += 1) {
      const operator = addCtx.getChild(index * 2 - 1).getText();
      const right = terms[index];
      current = this._codegenDualAdd(current, right, operator);
    }
    return current;
  }

  _codegenDualMulExpr(mulCtx, env) {
    const terms = mulCtx.powExpr().map((ctx) => this._codegenDualPowExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 0) return this._codegenDual('0', '0', 0);

    let current = terms[0];
    for (let index = 1; index < terms.length; index += 1) {
      const operator = mulCtx.getChild(index * 2 - 1).getText();
      const right = terms[index];
      current = operator === '*'
        ? this._codegenDualMul(current, right)
        : this._codegenDualDiv(current, right);
    }

    return current;
  }

  _codegenDualPowExpr(powCtx, env) {
    const left = this._codegenDualUnaryExpr(powCtx.unaryExpr(), env);
    if (!left) return null;
    if (!(powCtx.POW && powCtx.POW())) return left;

    const right = this._codegenDualPowExpr(powCtx.powExpr(), env);
    if (!right) return null;

    return this._codegenDualPow(left, right);
  }

  _codegenDualUnaryExpr(unaryCtx, env) {
    if (!unaryCtx) return null;
    if (unaryCtx.primary && unaryCtx.primary()) {
      return this._codegenDualPrimary(unaryCtx.primary(), env);
    }

    const nested = this._codegenDualUnaryExpr(unaryCtx.unaryExpr(), env);
    if (!nested) return null;
    if (unaryCtx.SUB && unaryCtx.SUB()) {
      const constValue = this._codegenDualHasConst(nested) ? -nested.constValue : null;
      return this._codegenDual(
        this._codegenNegExprSimplified(nested.value),
        this._codegenNegExprSimplified(nested.derivative),
        constValue
      );
    }
    return this._codegenDual(nested.value, nested.derivative, nested.constValue);
  }

  _codegenDualPrimary(primaryCtx, env) {
    if (primaryCtx.NUMBER && primaryCtx.NUMBER()) {
      const numeric = Number(primaryCtx.NUMBER().getText());
      return this._codegenDual(this._codegenNumberLiteral(numeric), '0', numeric);
    }
    if (primaryCtx.INF && primaryCtx.INF()) return this._codegenDual('Infinity', '0', Infinity);
    if (primaryCtx.TRUE && primaryCtx.TRUE()) return this._codegenDual('true', '0');
    if (primaryCtx.FALSE && primaryCtx.FALSE()) return this._codegenDual('false', '0');
    if (primaryCtx.STRING && primaryCtx.STRING()) {
      return this._codegenDual(
        JSON.stringify(parseStringLiteral(primaryCtx.STRING().getText())),
        '0'
      );
    }

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      const identifier = primaryCtx.IDENT().getText();
      if (env.localDuals && env.localDuals.has(identifier)) {
        return env.localDuals.get(identifier);
      }
      if (env.localNames.has(identifier)) {
        return this._codegenDual(
          env.localNames.get(identifier),
          env.localDerivatives.get(identifier) || '0'
        );
      }
      if (identifier === 'x') {
        return this._codegenDual(env.xExpr, env.dxExpr || '1');
      }
      return null;
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._codegenDualExpr(primaryCtx.expr(), env);
    }

    if (primaryCtx.refCall && primaryCtx.refCall()) return this._codegenDualRefCall(primaryCtx.refCall(), env);
    if (primaryCtx.evalCall && primaryCtx.evalCall()) return this._codegenDualEvalCall(primaryCtx.evalCall(), env);
    if (primaryCtx.fixCall && primaryCtx.fixCall()) return null;
    if (primaryCtx.funcCall && primaryCtx.funcCall()) return this._codegenDualFuncCall(primaryCtx.funcCall(), env);
    if (primaryCtx.pieceExpr && primaryCtx.pieceExpr()) return this._codegenDualPieceExpr(primaryCtx.pieceExpr(), env);
    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) return null;
    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) return null;

    return null;
  }

  _codegenDualRefCall(refCallCtx, env) {
    const refPath = refCallCtx.nameRef().IDENT().map((token) => token.getText());
    const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
    if (!component) return null;

    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;

    const convertedIncome = this._codegenConvertIncomeExpression(env.xExpr, env.countryModel, targetCountryModel);
    const incomeFactor = this._codegenConvertIncomeFactor(env.countryModel, targetCountryModel);
    if (convertedIncome === null || incomeFactor === null) return null;

    const componentIndex = env.context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) return null;

    const value = this._codegenInlineComponentTotalExpression(component, convertedIncome, env)
      ?? this._codegenComponentCallByIndex(componentIndex, 'total', convertedIncome, env);
    const marginal = this._codegenInlineComponentMarginalExpression(component, convertedIncome, env)
      ?? this._codegenComponentCallByIndex(componentIndex, 'marginal', convertedIncome, env);
    const factorLiteral = this._codegenNumberLiteral(incomeFactor);
    const derivative = incomeFactor === 1
      ? marginal
      : this._codegenMulExprSimplified(marginal, factorLiteral);
    return this._codegenDual(value, derivative);
  }

  _codegenDualEvalCall(evalCallCtx, env) {
    const refPath = evalCallCtx.nameRef().IDENT().map((token) => token.getText());
    const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
    if (!component) return null;

    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;

    const argumentDual = this._codegenDualExpr(evalCallCtx.expr(), env);
    if (!argumentDual) return null;

    const convertedIncome = this._codegenConvertIncomeExpression(argumentDual.value, env.countryModel, targetCountryModel);
    const incomeFactor = this._codegenConvertIncomeFactor(env.countryModel, targetCountryModel);
    if (convertedIncome === null || incomeFactor === null) return null;

    const value = this._codegenEvalCall(evalCallCtx, env);
    if (value === null) return null;

    const componentIndex = env.context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) return null;
    const marginal = this._codegenComponentCallByIndex(componentIndex, 'marginal', convertedIncome, env);

    const factorExpr = incomeFactor === 1
      ? argumentDual.derivative
      : this._codegenMulExprSimplified(this._codegenNumberLiteral(incomeFactor), argumentDual.derivative);
    const derivative = this._codegenMulExprSimplified(marginal, factorExpr);
    return this._codegenDual(value, derivative);
  }

  _codegenDualFuncCall(funcCtx, env) {
    const functionName = normalizeIdentifier(funcCtx.IDENT().getText());
    const argCtxs = funcCtx.expr ? funcCtx.expr() : [];
    const args = argCtxs.map((ctx) => this._codegenDualExpr(ctx, env));
    if (args.some((arg) => arg === null)) return null;

    if (functionName === 'min' || functionName === 'max') {
      if (args.length === 0) return this._codegenDual('0', '0', 0);
      let current = args[0];
      for (let index = 1; index < args.length; index += 1) {
        const right = args[index];
        const comparator = functionName === 'min'
          ? `((${current.value}) <= (${right.value}))`
          : `((${current.value}) >= (${right.value}))`;
        current = this._codegenDual(
          `Math.${functionName}(${current.value}, ${right.value})`,
          `(${comparator} ? (${current.derivative}) : (${right.derivative}))`
        );
      }
      return current;
    }

    if (functionName === 'abs') {
      const arg = args[0] || this._codegenDual('0', '0', 0);
      const constValue = this._codegenDualHasConst(arg) ? Math.abs(arg.constValue) : null;
      return this._codegenDual(
        `Math.abs(${arg.value})`,
        `((${arg.value}) >= 0 ? (${arg.derivative}) : (${this._codegenNegExprSimplified(arg.derivative)}))`,
        constValue
      );
    }

    if (functionName === 'pow') {
      const left = args[0] || this._codegenDual('0', '0', 0);
      const right = args[1] || this._codegenDual('0', '0', 0);
      return this._codegenDualPow(left, right);
    }

    if (functionName === 'sqrt') {
      const arg = args[0] || this._codegenDual('0', '0', 0);
      const value = `Math.sqrt(${arg.value})`;
      const derivative = this._codegenDivExprSimplified(arg.derivative, this._codegenMulExprSimplified('2', value));
      const constValue = this._codegenDualHasConst(arg) ? Math.sqrt(arg.constValue) : null;
      return this._codegenDual(value, derivative, constValue);
    }

    if (functionName === 'log') {
      const arg = args[0] || this._codegenDual('0', '0', 0);
      const constValue = this._codegenDualHasConst(arg) ? Math.log(arg.constValue) : null;
      return this._codegenDual(
        `Math.log(${arg.value})`,
        this._codegenDivExprSimplified(arg.derivative, arg.value),
        constValue
      );
    }

    if (functionName === 'exp') {
      const arg = args[0] || this._codegenDual('0', '0', 0);
      const value = `Math.exp(${arg.value})`;
      const constValue = this._codegenDualHasConst(arg) ? Math.exp(arg.constValue) : null;
      return this._codegenDual(value, this._codegenMulExprSimplified(value, arg.derivative), constValue);
    }

    if (functionName === 'floor' || functionName === 'ceil' || functionName === 'round') {
      const value = this._codegenFuncCall(funcCtx, env);
      if (value === null) return null;
      return this._codegenDual(value, '0');
    }

    if (functionName === 'sum') {
      if (args.length === 0) return this._codegenDual('0', '0', 0);
      let current = args[0];
      for (let index = 1; index < args.length; index += 1) {
        current = this._codegenDualAdd(current, args[index], '+');
      }
      return current;
    }

    if (functionName === 'if') {
      const conditionExpr = this._codegenExpr(argCtxs[0], env);
      if (conditionExpr === null) return null;
      const whenTrue = args[1] || this._codegenDual('0', '0', 0);
      const whenFalse = args[2] || this._codegenDual('0', '0', 0);
      return this._codegenDual(
        `(((${conditionExpr})) ? (${whenTrue.value}) : (${whenFalse.value}))`,
        `(((${conditionExpr})) ? (${whenTrue.derivative}) : (${whenFalse.derivative}))`
      );
    }

    if (functionName === 'pos') {
      const arg = args[0] || this._codegenDual('0', '0', 0);
      const constValue = this._codegenDualHasConst(arg) ? Math.max(0, arg.constValue) : null;
      return this._codegenDual(
        `Math.max(0, (${arg.value}))`,
        `(((${arg.value}) > 0) ? (${arg.derivative}) : 0)`,
        constValue
      );
    }

    return null;
  }

  _codegenDualPieceExpr(pieceCtx, env) {
    const armPairs = [];
    for (const armCtx of pieceCtx.pieceArm()) {
      const condition = this._codegenExpr(armCtx.expr(0), env);
      const dualValue = this._codegenDualExpr(armCtx.expr(1), env);
      if (condition === null || !dualValue) return null;
      armPairs.push({ condition, dualValue });
    }

    const elseDual = pieceCtx.expr && pieceCtx.expr()
      ? this._codegenDualExpr(pieceCtx.expr(), env)
      : this._codegenDual('0', '0', 0);
    if (!elseDual) return null;

    let valueExpr = elseDual.value;
    let derivativeExpr = elseDual.derivative;
    for (let index = armPairs.length - 1; index >= 0; index -= 1) {
      const arm = armPairs[index];
      valueExpr = `(((${arm.condition})) ? (${arm.dualValue.value}) : (${valueExpr}))`;
      derivativeExpr = `(((${arm.condition})) ? (${arm.dualValue.derivative}) : (${derivativeExpr}))`;
    }

    return this._codegenDual(valueExpr, derivativeExpr);
  }

  _codegenCanAssumeZeroDerivativeForMarginalComponent(component) {
    if (!component || component.wrapperKind !== 'm') return false;
    if (component.bodyType === 'number') return true;
    if (component.bodyType === 'expr') {
      return this._extractNumericLiteral(component.bodyCtx) !== null;
    }
    if (component.bodyType === 'block') {
      const stmtCount = component.bodyCtx?.stmt ? component.bodyCtx.stmt().length : 0;
      if (stmtCount !== 0) return false;
      return this._extractNumericLiteral(component.bodyCtx?.expr?.()) !== null;
    }
    return false;
  }

  _codegenExpr(exprCtx, env) {
    if (!exprCtx || !exprCtx.orExpr) return null;
    return this._codegenOrExpr(exprCtx.orExpr(), env);
  }

  _codegenOrExpr(orCtx, env) {
    const terms = orCtx.andExpr().map((ctx) => this._codegenAndExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 1) return terms[0];
    return `(${terms.map((term) => `Boolean(${term})`).join(' || ')})`;
  }

  _codegenAndExpr(andCtx, env) {
    const terms = andCtx.notExpr().map((ctx) => this._codegenNotExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 1) return terms[0];
    return `(${terms.map((term) => `Boolean(${term})`).join(' && ')})`;
  }

  _codegenNotExpr(notCtx, env) {
    if (notCtx.NOT && notCtx.NOT()) {
      const nested = this._codegenNotExpr(notCtx.notExpr(), env);
      if (nested === null) return null;
      return `(!Boolean(${nested}))`;
    }
    return this._codegenCmpExpr(notCtx.cmpExpr(), env);
  }

  _codegenCmpExpr(cmpCtx, env) {
    const left = this._codegenAddExpr(cmpCtx.addExpr(0), env);
    if (left === null) return null;

    const rightCtx = cmpCtx.addExpr(1);
    if (!rightCtx) return left;

    const right = this._codegenAddExpr(rightCtx, env);
    if (right === null) return null;

    if (cmpCtx.LT && cmpCtx.LT()) return `((${left}) < (${right}))`;
    if (cmpCtx.LE && cmpCtx.LE()) return `((${left}) <= (${right}))`;
    if (cmpCtx.GT && cmpCtx.GT()) return `((${left}) > (${right}))`;
    if (cmpCtx.GE && cmpCtx.GE()) return `((${left}) >= (${right}))`;
    if (cmpCtx.EQEQ && cmpCtx.EQEQ()) return `((${left}) === (${right}))`;
    if (cmpCtx.NEQ && cmpCtx.NEQ()) return `((${left}) !== (${right}))`;
    return null;
  }

  _codegenAddExpr(addCtx, env) {
    const terms = addCtx.mulExpr().map((ctx) => this._codegenMulExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 0) return '0';

    let expression = terms[0];
    for (let index = 1; index < terms.length; index += 1) {
      const operator = addCtx.getChild(index * 2 - 1).getText();
      expression = operator === '+'
        ? this._codegenAddExprSimplified(expression, terms[index])
        : this._codegenSubExprSimplified(expression, terms[index]);
    }
    return expression;
  }

  _codegenMulExpr(mulCtx, env) {
    const terms = mulCtx.powExpr().map((ctx) => this._codegenPowExpr(ctx, env));
    if (terms.some((term) => term === null)) return null;
    if (terms.length === 0) return '0';

    let expression = terms[0];
    for (let index = 1; index < terms.length; index += 1) {
      const operator = mulCtx.getChild(index * 2 - 1).getText();
      expression = operator === '*'
        ? this._codegenMulExprSimplified(expression, terms[index])
        : this._codegenDivExprSimplified(expression, terms[index]);
    }
    return expression;
  }

  _codegenPowExpr(powCtx, env) {
    const left = this._codegenUnaryExpr(powCtx.unaryExpr(), env);
    if (left === null) return null;
    if (!(powCtx.POW && powCtx.POW())) return left;

    const right = this._codegenPowExpr(powCtx.powExpr(), env);
    if (right === null) return null;
    const leftConst = this._codegenParseNumericExpression(left);
    const rightConst = this._codegenParseNumericExpression(right);
    return this._codegenPowExprSimplified(left, right, leftConst, rightConst).expression;
  }

  _codegenUnaryExpr(unaryCtx, env) {
    if (unaryCtx.primary && unaryCtx.primary()) return this._codegenPrimary(unaryCtx.primary(), env);

    const nested = this._codegenUnaryExpr(unaryCtx.unaryExpr(), env);
    if (nested === null) return null;
    if (unaryCtx.SUB && unaryCtx.SUB()) return this._codegenNegExprSimplified(nested);
    return nested;
  }

  _codegenPrimary(primaryCtx, env) {
    if (primaryCtx.NUMBER && primaryCtx.NUMBER()) return this._codegenNumberLiteral(Number(primaryCtx.NUMBER().getText()));
    if (primaryCtx.INF && primaryCtx.INF()) return 'Infinity';
    if (primaryCtx.TRUE && primaryCtx.TRUE()) return 'true';
    if (primaryCtx.FALSE && primaryCtx.FALSE()) return 'false';

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      const identifier = primaryCtx.IDENT().getText();
      if (env.localNames.has(identifier)) return env.localNames.get(identifier);
      if (identifier === 'x') return env.xExpr;
      return null;
    }

    if (primaryCtx.STRING && primaryCtx.STRING()) {
      return JSON.stringify(parseStringLiteral(primaryCtx.STRING().getText()));
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      const nested = this._codegenExpr(primaryCtx.expr(), env);
      if (nested === null) return null;
      return nested;
    }

    if (primaryCtx.refCall && primaryCtx.refCall()) return this._codegenRefCall(primaryCtx.refCall(), env);
    if (primaryCtx.evalCall && primaryCtx.evalCall()) return this._codegenEvalCall(primaryCtx.evalCall(), env);
    if (primaryCtx.fixCall && primaryCtx.fixCall()) return this._codegenFixCall(primaryCtx.fixCall(), env);
    if (primaryCtx.funcCall && primaryCtx.funcCall()) return this._codegenFuncCall(primaryCtx.funcCall(), env);
    if (primaryCtx.pieceExpr && primaryCtx.pieceExpr()) return this._codegenPieceExpr(primaryCtx.pieceExpr(), env);
    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) return this._codegenBracketsTaxableExpr(primaryCtx.bracketsTaxableExpr(), env);
    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) return this._codegenScheduleExpr(primaryCtx.scheduleExpr(), env);

    return null;
  }

  _codegenRefCall(refCallCtx, env) {
    const refPath = refCallCtx.nameRef().IDENT().map((token) => token.getText());
    const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
    if (!component) return null;

    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;
    const convertedIncome = this._codegenConvertIncomeExpression(env.xExpr, env.countryModel, targetCountryModel);
    if (convertedIncome === null) return null;

    const componentIndex = env.context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) return null;

    const inlinedTotal = this._codegenInlineComponentTotalExpression(component, convertedIncome, env);
    if (inlinedTotal !== null) return inlinedTotal;
    return this._codegenComponentCallByIndex(componentIndex, 'total', convertedIncome, env);
  }

  _codegenEvalCall(evalCallCtx, env) {
    const refPath = evalCallCtx.nameRef().IDENT().map((token) => token.getText());
    const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
    if (!component) return null;

    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;

    const argumentExpr = this._codegenExpr(evalCallCtx.expr(), env);
    if (argumentExpr === null) return null;

    const convertedIncome = this._codegenConvertIncomeExpression(argumentExpr, env.countryModel, targetCountryModel);
    if (convertedIncome === null) return null;

    const inlinedExpr = this._codegenInlineComponentValueExpression(component, convertedIncome, env);
    if (inlinedExpr !== null) return inlinedExpr;

    const componentIndex = env.context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) return null;
    return this._codegenComponentCallByIndex(componentIndex, 'value', convertedIncome, env);
  }

  _codegenInlineComponentValueExpression(component, incomeExpr, env) {
    if (!this._codegenCanInlineComponentValue(component, env)) return null;
    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;

    const inlineStack = env.inlineStack instanceof Set ? env.inlineStack : new Set();
    const nextInlineStack = new Set(inlineStack);
    nextInlineStack.add(this._codegenComponentMapKey(component));

    if (component.wrapperKind === 't') {
      const bracketClosedFormPlan = this._codegenBuildBracketClosedFormPlan(component, env.context, {
        xExpr: incomeExpr,
        inlineStack: nextInlineStack,
      });
      if (bracketClosedFormPlan) {
        return this._codegenEmitBracketClosedFormExpression(bracketClosedFormPlan, env.context);
      }

      const fastPieceValuePlan = this._getFastPieceValuePlan(component);
      if (fastPieceValuePlan) {
        return this._codegenEmitFastPieceValueExpression(fastPieceValuePlan, env.context, incomeExpr);
      }
    }

    const inlineEnv = {
      context: env.context,
      prepared: env.prepared,
      component,
      countryModel: targetCountryModel,
      localNames: new Map(),
      xExpr: incomeExpr,
      inlineStack: nextInlineStack,
    };

    if (component.bodyType === 'number') {
      return this._codegenNumberLiteral(component.constantValue);
    }

    if (component.bodyType === 'expr') {
      return this._codegenExpr(component.bodyCtx, inlineEnv);
    }

    const fallbackValueCode = this._codegenEmitComponentValueExpression(component, env.context, {
      countryModel: targetCountryModel,
      xExpr: incomeExpr,
      inlineStack: nextInlineStack,
    });
    return this._codegenWrapValueCodeAsExpression(fallbackValueCode);
  }

  _codegenInlineComponentTotalExpression(component, incomeExpr, env) {
    if (!component || !env) return null;
    if (component.wrapperKind === 'm') return null;

    if (component.wrapperKind === 'l') {
      return this._codegenInlineComponentValueExpression(component, incomeExpr, env);
    }

    if (this._codegenCanAssumeNonnegativeExpression(incomeExpr)) {
      return this._codegenInlineComponentValueExpression(component, incomeExpr, env);
    }

    const incomeName = this._codegenTempName('income', env.context);
    const valueExpr = this._codegenInlineComponentValueExpression(component, incomeName, env);
    if (valueExpr === null) return null;
    return `(() => { const ${incomeName} = ${incomeExpr}; if (${incomeName} <= 0) return 0; return ${valueExpr}; })()`;
  }

  _codegenInlineComponentMarginalExpression(component, incomeExpr, env) {
    if (!component || !env) return null;
    if (!this._codegenCanInlineComponentMarginal(component, env)) return null;

    if (component.wrapperKind === 'l') return '0';
    if (component.wrapperKind === 'm') {
      return this._codegenInlineComponentValueExpression(component, incomeExpr, env);
    }

    const inlineStack = env.inlineStack instanceof Set ? env.inlineStack : new Set();
    const nextInlineStack = new Set(inlineStack);
    nextInlineStack.add(this._codegenComponentMapKey(component));

    const fastBracketPlan = this._getFastBracketPlan(component);
    if (fastBracketPlan) {
      return this._codegenEmitFastBracketMarginalExpression(fastBracketPlan, env.context, incomeExpr);
    }

    const bracketClosedFormPlan = this._codegenBuildBracketClosedFormPlan(component, env.context, {
      xExpr: incomeExpr,
      inlineStack: nextInlineStack,
    });
    if (bracketClosedFormPlan) {
      return this._codegenEmitBracketClosedFormMarginalExpression(component, bracketClosedFormPlan, env.context, incomeExpr);
    }

    const fastPieceMarginalPlan = this._getFastPieceMarginalPlan(component);
    if (fastPieceMarginalPlan) {
      return this._codegenEmitFastPieceMarginalExpression(fastPieceMarginalPlan, env.context, incomeExpr);
    }

    const symbolicBodyLines = this._codegenEmitSymbolicMarginalBodyLines(component, env.context, incomeExpr, {
      inlineStack: nextInlineStack,
    });
    if (!symbolicBodyLines) return null;

    const extracted = this._codegenExtractBodyReturnExpression(symbolicBodyLines);
    if (extracted) {
      if (!extracted.lines || extracted.lines.length === 0) return extracted.expression;
      return `(() => {\n  ${extracted.lines.join('\n  ')}\n  return ${extracted.expression};\n})()`;
    }

    return `(() => {\n  ${symbolicBodyLines.join('\n  ')}\n})()`;
  }

  _codegenFixCall(fixCallCtx, env) {
    const initExpr = this._codegenExpr(fixCallCtx.expr(0), env);
    if (initExpr === null) return null;

    const kName = this._codegenTempName('k', env.context);
    const fixTerms = this._codegenBuildFixUpdateTerms(fixCallCtx, env, kName, {
      withXDerivative: false,
      withKDerivative: true,
    });
    if (!fixTerms || fixTerms.updateExpr === null) return null;

    const loopLines = this._codegenBuildFixLoopLines(initExpr, fixTerms.updateExpr, kName, env.context, {
      withReturn: true,
      updateKDerivativeExpr: fixTerms.updateKDerivativeExpr,
    });
    return `(() => {
  ${loopLines.join('\n  ')}
})()`;
  }

  _codegenFuncCall(funcCtx, env) {
    const functionName = normalizeIdentifier(funcCtx.IDENT().getText());
    const args = (funcCtx.expr ? funcCtx.expr() : []).map((ctx) => this._codegenExpr(ctx, env));
    if (args.some((arg) => arg === null)) return null;

    if (functionName === 'min') return `Math.min(${args.join(', ')})`;
    if (functionName === 'max') return `Math.max(${args.join(', ')})`;
    if (functionName === 'abs') return `Math.abs(${args[0] ?? '0'})`;
    if (functionName === 'pow') return `((${args[0] ?? '0'}) ** (${args[1] ?? '0'}))`;
    if (functionName === 'sqrt') return `Math.sqrt(${args[0] ?? '0'})`;
    if (functionName === 'log') return `Math.log(${args[0] ?? '0'})`;
    if (functionName === 'exp') return `Math.exp(${args[0] ?? '0'})`;
    if (functionName === 'floor') return `__floorToStep(${args[0] ?? '0'}, ${args[1] ?? '1'})`;
    if (functionName === 'ceil') return `__ceilToStep(${args[0] ?? '0'}, ${args[1] ?? '1'})`;
    if (functionName === 'round') return `__roundToStep(${args[0] ?? '0'}, ${args[1] ?? '1'})`;
    if (functionName === 'sum') {
      if (args.length === 0) return '0';
      return `(${args.join(' + ')})`;
    }
    if (functionName === 'if') {
      if (args.length < 2) return '0';
      return `(((${args[0]})) ? (${args[1]}) : (${args[2] ?? '0'}))`;
    }
    if (functionName === 'pos') return `Math.max(0, (${args[0] ?? '0'}))`;

    return null;
  }

  _codegenPieceExpr(pieceCtx, env) {
    const armPairs = pieceCtx.pieceArm().map((armCtx) => ({
      condition: this._codegenExpr(armCtx.expr(0), env),
      value: this._codegenExpr(armCtx.expr(1), env),
    }));
    if (armPairs.some((arm) => arm.condition === null || arm.value === null)) return null;

    const elseExpr = pieceCtx.expr && pieceCtx.expr() ? this._codegenExpr(pieceCtx.expr(), env) : '0';
    if (elseExpr === null) return null;

    let expression = elseExpr;
    for (let index = armPairs.length - 1; index >= 0; index -= 1) {
      const arm = armPairs[index];
      expression = `(((${arm.condition})) ? (${arm.value}) : (${expression}))`;
    }
    return expression;
  }

  _codegenScheduleExpr(scheduleCtx, env) {
    const selector = this._codegenExpr(scheduleCtx.expr(), env);
    if (selector === null) return null;

    const arms = scheduleCtx.rangeArm().map((rangeArmCtx) => {
      const lower = this._codegenBound(rangeArmCtx.range().bound(0), env);
      const upper = this._codegenBound(rangeArmCtx.range().bound(1), env);
      const value = this._codegenExpr(rangeArmCtx.expr(), env);
      return { lower, upper, value, rangeArmCtx };
    });
    if (arms.some((arm) => arm.lower === null || arm.upper === null || arm.value === null)) return null;

    const isTotalBandSchedule = scheduleCtx.BRACKETS && scheduleCtx.BRACKETS();
    const selectorName = this._codegenTempName('selector', env.context);

    if (isTotalBandSchedule) {
      const totalName = this._codegenTempName('total', env.context);
      const lines = [
        `const ${selectorName} = __toNumber(${selector});`,
        `if (!Number.isFinite(${selectorName}) || ${selectorName} <= 0) return 0;`,
        `let ${totalName} = 0;`,
      ];

      for (const arm of arms) {
        const lowerName = this._codegenTempName('lower', env.context);
        const upperName = this._codegenTempName('upper', env.context);
        const upperSegName = this._codegenTempName('segmentUpper', env.context);
        const xPointName = this._codegenTempName('x', env.context);
        const valueAtX = this._codegenExpr(arm.rangeArmCtx.expr(), { ...env, xExpr: xPointName });
        if (valueAtX === null) return null;

        lines.push(`const ${lowerName} = ${arm.lower};`);
        lines.push(`const ${upperName} = ${arm.upper};`);
        lines.push(`if (!Number.isFinite(${lowerName}) || Number.isNaN(${upperName})) {`);
        lines.push(`  // skip invalid arm`);
        lines.push(`} else if (${selectorName} > ${lowerName}) {`);
        lines.push(`  const ${upperSegName} = Math.min(${selectorName}, ${upperName});`);
        lines.push(`  if (${upperSegName} > ${lowerName}) {`);
        lines.push(`    ${totalName} += __integrate((${xPointName}) => __toNumber(${valueAtX}), ${lowerName}, ${upperSegName});`);
        lines.push('  }');
        lines.push(`  if (${selectorName} <= ${upperName}) return ${totalName};`);
        lines.push('}');
      }

      lines.push(`return ${totalName};`);
      return `(() => {\n  ${lines.join('\n  ')}\n})()`;
    }

    const lines = [`const ${selectorName} = __toNumber(${selector});`];
    for (const arm of arms) {
      lines.push(`if (${selectorName} >= ${arm.lower} && ${selectorName} < ${arm.upper}) return ${arm.value};`);
    }
    lines.push('return 0;');
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenBracketsTaxableExpr(bracketsTaxableCtx, env) {
    const incomeExpr = this._codegenExpr(bracketsTaxableCtx.expr(0), env);
    const allowanceExpr = this._codegenExpr(bracketsTaxableCtx.expr(1), env);
    const allowanceBaseExpr = this._codegenExpr(bracketsTaxableCtx.expr(2), env);
    if (incomeExpr === null || allowanceExpr === null || allowanceBaseExpr === null) return null;

    const selectorName = this._codegenTempName('selector', env.context);
    const allowanceBaseName = this._codegenTempName('allowanceBase', env.context);
    const totalName = this._codegenTempName('total', env.context);
    const lines = [
      `const ${selectorName} = Math.max(0, ((${incomeExpr}) - (${allowanceExpr})));`,
      `const ${allowanceBaseName} = __toNumber(${allowanceBaseExpr});`,
      `if (!Number.isFinite(${selectorName}) || ${selectorName} <= 0 || !Number.isFinite(${allowanceBaseName})) return 0;`,
      `let ${totalName} = 0;`,
    ];

    for (const arm of bracketsTaxableCtx.rangeArm()) {
      const lowerRaw = this._codegenBound(arm.range().bound(0), env);
      const upperRaw = this._codegenBound(arm.range().bound(1), env);
      const xPointName = this._codegenTempName('x', env.context);
      const valueAtX = this._codegenExpr(arm.expr(), { ...env, xExpr: xPointName });
      if (lowerRaw === null || upperRaw === null || valueAtX === null) return null;

      const lowerName = this._codegenTempName('lower', env.context);
      const upperName = this._codegenTempName('upper', env.context);
      const upperSegName = this._codegenTempName('segmentUpper', env.context);

      lines.push(`const ${lowerName} = (${lowerRaw}) - ${allowanceBaseName};`);
      lines.push(`const ${upperName} = (${upperRaw}) - ${allowanceBaseName};`);
      lines.push(`if (!Number.isFinite(${lowerName}) || Number.isNaN(${upperName})) {`);
      lines.push(`  // skip invalid arm`);
      lines.push(`} else if (${selectorName} > ${lowerName}) {`);
      lines.push(`  const ${upperSegName} = Math.min(${selectorName}, ${upperName});`);
      lines.push(`  if (${upperSegName} > ${lowerName}) {`);
      lines.push(`    ${totalName} += __integrate((${xPointName}) => __toNumber(${valueAtX}), ${lowerName}, ${upperSegName});`);
      lines.push('  }');
      lines.push(`  if (${selectorName} <= ${upperName}) return ${totalName};`);
      lines.push('}');
    }

    lines.push(`return ${totalName};`);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenBound(boundCtx, env) {
    if (boundCtx.INF && boundCtx.INF()) return 'Infinity';
    const expr = this._codegenExpr(boundCtx.expr(), env);
    if (expr === null) return null;
    return `__toNumber(${expr})`;
  }

  _codegenBuildPreparedCountryDependencyGraph(prepared, componentList = null) {
    const countryModel = prepared.countryModel;
    const components = componentList || countryModel.components;
    const componentKeys = new Set(components.map((component) => this._codegenComponentMapKey(component)));
    const depsByKey = new Map();
    const inboundByKey = new Map();
    for (const component of components) {
      inboundByKey.set(this._codegenComponentMapKey(component), 0);
    }
    let fullyResolved = true;

    for (const component of components) {
      const fromKey = this._codegenComponentMapKey(component);
      const deps = this._codegenCollectComponentDependencies(component, countryModel);
      if (!deps) {
        fullyResolved = false;
        depsByKey.set(fromKey, new Set());
        continue;
      }

      const edgeSet = new Set();
      for (const dep of deps) {
        if (dep.countryKey !== countryModel.countryKey) {
          fullyResolved = false;
          continue;
        }
        const depKey = this._codegenComponentMapKey(dep);
        if (componentKeys.has(depKey)) {
          edgeSet.add(depKey);
          inboundByKey.set(depKey, (inboundByKey.get(depKey) || 0) + 1);
        }
      }
      depsByKey.set(fromKey, edgeSet);
    }

    const visited = new Set();
    const inStack = new Set();
    let hasCycle = false;

    const visit = (nodeKey) => {
      if (inStack.has(nodeKey)) return true;
      if (visited.has(nodeKey)) return false;
      visited.add(nodeKey);
      inStack.add(nodeKey);

      const edges = depsByKey.get(nodeKey) || new Set();
      for (const nextKey of edges) {
        if (visit(nextKey)) return true;
      }

      inStack.delete(nodeKey);
      return false;
    };

    for (const component of components) {
      const key = this._codegenComponentMapKey(component);
      if (visit(key)) {
        hasCycle = true;
        break;
      }
    }

    return {
      depsByKey,
      inboundByKey,
      fullyResolved,
      acyclic: fullyResolved && !hasCycle,
    };
  }

  _codegenCollectReachableComponentKeys(activeComponents, dependencyGraph) {
    const reachable = new Set();
    const stack = [];

    for (const component of activeComponents || []) {
      const key = this._codegenComponentMapKey(component);
      if (reachable.has(key)) continue;
      reachable.add(key);
      stack.push(key);
    }

    while (stack.length > 0) {
      const currentKey = stack.pop();
      const deps = dependencyGraph?.depsByKey?.get(currentKey) || new Set();
      for (const depKey of deps) {
        if (reachable.has(depKey)) continue;
        reachable.add(depKey);
        stack.push(depKey);
      }
    }

    return reachable;
  }

  _codegenCollectComponentDependencies(component, countryModel) {
    const deps = new Set();
    const env = {
      countryModel,
      localNames: new Set(),
    };

    if (component.bodyType === 'number') return deps;

    if (component.bodyType === 'expr') {
      return this._codegenCollectExprDependencies(component.bodyCtx, env, deps) ? deps : null;
    }

    const blockCtx = component.bodyCtx;
    for (const stmt of blockCtx.stmt()) {
      if (!this._codegenCollectExprDependencies(stmt.expr(), env, deps)) return null;
      env.localNames.add(stmt.IDENT().getText());
    }

    return this._codegenCollectExprDependencies(blockCtx.expr(), env, deps) ? deps : null;
  }

  _codegenCollectExprDependencies(exprCtx, env, deps) {
    if (!exprCtx || !exprCtx.orExpr) return false;
    return this._codegenCollectOrDependencies(exprCtx.orExpr(), env, deps);
  }

  _codegenCollectOrDependencies(orCtx, env, deps) {
    for (const andCtx of orCtx.andExpr()) {
      if (!this._codegenCollectAndDependencies(andCtx, env, deps)) return false;
    }
    return true;
  }

  _codegenCollectAndDependencies(andCtx, env, deps) {
    for (const notCtx of andCtx.notExpr()) {
      if (!this._codegenCollectNotDependencies(notCtx, env, deps)) return false;
    }
    return true;
  }

  _codegenCollectNotDependencies(notCtx, env, deps) {
    if (notCtx.NOT && notCtx.NOT()) return this._codegenCollectNotDependencies(notCtx.notExpr(), env, deps);
    return this._codegenCollectCmpDependencies(notCtx.cmpExpr(), env, deps);
  }

  _codegenCollectCmpDependencies(cmpCtx, env, deps) {
    if (!this._codegenCollectAddDependencies(cmpCtx.addExpr(0), env, deps)) return false;
    const right = cmpCtx.addExpr(1);
    if (!right) return true;
    return this._codegenCollectAddDependencies(right, env, deps);
  }

  _codegenCollectAddDependencies(addCtx, env, deps) {
    for (const mulCtx of addCtx.mulExpr()) {
      if (!this._codegenCollectMulDependencies(mulCtx, env, deps)) return false;
    }
    return true;
  }

  _codegenCollectMulDependencies(mulCtx, env, deps) {
    for (const powCtx of mulCtx.powExpr()) {
      if (!this._codegenCollectPowDependencies(powCtx, env, deps)) return false;
    }
    return true;
  }

  _codegenCollectPowDependencies(powCtx, env, deps) {
    if (!this._codegenCollectUnaryDependencies(powCtx.unaryExpr(), env, deps)) return false;
    const right = powCtx.powExpr ? powCtx.powExpr() : null;
    if (!right) return true;
    return this._codegenCollectPowDependencies(right, env, deps);
  }

  _codegenCollectUnaryDependencies(unaryCtx, env, deps) {
    if (unaryCtx.primary && unaryCtx.primary()) {
      return this._codegenCollectPrimaryDependencies(unaryCtx.primary(), env, deps);
    }
    return this._codegenCollectUnaryDependencies(unaryCtx.unaryExpr(), env, deps);
  }

  _codegenCollectPrimaryDependencies(primaryCtx, env, deps) {
    if (primaryCtx.NUMBER && primaryCtx.NUMBER()) return true;
    if (primaryCtx.INF && primaryCtx.INF()) return true;
    if (primaryCtx.TRUE && primaryCtx.TRUE()) return true;
    if (primaryCtx.FALSE && primaryCtx.FALSE()) return true;
    if (primaryCtx.STRING && primaryCtx.STRING()) return true;

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      const identifier = primaryCtx.IDENT().getText();
      if (env.localNames.has(identifier)) return true;
      if (identifier === 'x') return true;
      return false;
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._codegenCollectExprDependencies(primaryCtx.expr(), env, deps);
    }

    if (primaryCtx.refCall && primaryCtx.refCall()) {
      const refCallCtx = primaryCtx.refCall();
      const refPath = refCallCtx.nameRef().IDENT().map((token) => token.getText());
      const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
      if (!component) return false;
      deps.add(component);
      return true;
    }

    if (primaryCtx.evalCall && primaryCtx.evalCall()) {
      const evalCallCtx = primaryCtx.evalCall();
      const refPath = evalCallCtx.nameRef().IDENT().map((token) => token.getText());
      const component = this._resolveReferenceForCodegen(refPath, env.countryModel);
      if (!component) return false;
      deps.add(component);
      return this._codegenCollectExprDependencies(evalCallCtx.expr(), env, deps);
    }

    if (primaryCtx.fixCall && primaryCtx.fixCall()) {
      const fixCallCtx = primaryCtx.fixCall();
      if (!this._codegenCollectExprDependencies(fixCallCtx.expr(0), env, deps)) return false;
      const nextEnv = { ...env, localNames: new Set(env.localNames) };
      nextEnv.localNames.add('k');
      return this._codegenCollectExprDependencies(fixCallCtx.expr(1), nextEnv, deps);
    }

    if (primaryCtx.funcCall && primaryCtx.funcCall()) {
      const exprList = primaryCtx.funcCall().expr ? primaryCtx.funcCall().expr() : [];
      for (const expr of exprList) {
        if (!this._codegenCollectExprDependencies(expr, env, deps)) return false;
      }
      return true;
    }

    if (primaryCtx.pieceExpr && primaryCtx.pieceExpr()) {
      const pieceCtx = primaryCtx.pieceExpr();
      for (const arm of pieceCtx.pieceArm()) {
        if (!this._codegenCollectExprDependencies(arm.expr(0), env, deps)) return false;
        if (!this._codegenCollectExprDependencies(arm.expr(1), env, deps)) return false;
      }
      if (pieceCtx.expr && pieceCtx.expr()) {
        if (!this._codegenCollectExprDependencies(pieceCtx.expr(), env, deps)) return false;
      }
      return true;
    }

    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) {
      const bracketsTaxableCtx = primaryCtx.bracketsTaxableExpr();
      if (!this._codegenCollectExprDependencies(bracketsTaxableCtx.expr(0), env, deps)) return false;
      if (!this._codegenCollectExprDependencies(bracketsTaxableCtx.expr(1), env, deps)) return false;
      if (!this._codegenCollectExprDependencies(bracketsTaxableCtx.expr(2), env, deps)) return false;

      for (const arm of bracketsTaxableCtx.rangeArm()) {
        const lowBound = arm.range().bound(0);
        const highBound = arm.range().bound(1);
        if (!(lowBound.INF && lowBound.INF())) {
          if (!this._codegenCollectExprDependencies(lowBound.expr(), env, deps)) return false;
        }
        if (!(highBound.INF && highBound.INF())) {
          if (!this._codegenCollectExprDependencies(highBound.expr(), env, deps)) return false;
        }
        if (!this._codegenCollectExprDependencies(arm.expr(), env, deps)) return false;
      }
      return true;
    }

    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) {
      const scheduleCtx = primaryCtx.scheduleExpr();
      if (!this._codegenCollectExprDependencies(scheduleCtx.expr(), env, deps)) return false;
      for (const arm of scheduleCtx.rangeArm()) {
        const lowBound = arm.range().bound(0);
        const highBound = arm.range().bound(1);
        if (!(lowBound.INF && lowBound.INF())) {
          if (!this._codegenCollectExprDependencies(lowBound.expr(), env, deps)) return false;
        }
        if (!(highBound.INF && highBound.INF())) {
          if (!this._codegenCollectExprDependencies(highBound.expr(), env, deps)) return false;
        }
        if (!this._codegenCollectExprDependencies(arm.expr(), env, deps)) return false;
      }
      return true;
    }

    return false;
  }

  _resolveReferenceForCodegen(refPath, countryModel) {
    const normalized = refPath.map((segment) => normalizeIdentifier(segment));

    if (normalized.length === 1) {
      const matches = countryModel.byName.get(normalized[0]) || [];
      if (matches.length !== 1) return null;
      return matches[0];
    }

    if (normalized.length === 2) {
      const [left, right] = normalized;
      const kindNameMatch = countryModel.byKindAndName.get(`${left}:${right}`);
      if (kindNameMatch) return kindNameMatch;

      const targetCountryModel = this.modelByCountry.get(left);
      if (targetCountryModel) {
        const matches = targetCountryModel.byName.get(right) || [];
        if (matches.length === 1) return matches[0];
      }

      return null;
    }

    if (normalized.length === 3) {
      const [countryKey, kindKey, nameKey] = normalized;
      const targetCountryModel = this.modelByCountry.get(countryKey);
      if (!targetCountryModel) return null;
      return targetCountryModel.byKindAndName.get(`${kindKey}:${nameKey}`) || null;
    }

    return null;
  }

  _codegenComponentCall(component, mode, incomeExpr, env) {
    const targetCountryModel = env.context.countryByKey.get(component.countryKey);
    if (!targetCountryModel) return null;

    const convertedIncome = this._codegenConvertIncomeExpression(incomeExpr, env.countryModel, targetCountryModel);
    if (convertedIncome === null) return null;

    const componentIndex = env.context.componentIndexByKey.get(this._codegenComponentMapKey(component));
    if (componentIndex === undefined) return null;

    return this._codegenComponentCallByIndex(componentIndex, mode, convertedIncome, env);
  }

  _codegenComponentCallByIndex(componentIndex, mode, incomeExpr, env = null) {
    const canBypassMemoForCall = env?.context?.dependencyGraph?.acyclic === true;
    const useCacheForIncome = !canBypassMemoForCall || this._codegenIsSimpleIdentifierExpression(incomeExpr);

    if (mode === 'value') {
      const callExpr = useCacheForIncome
        ? `${this._codegenValueFunctionName(componentIndex)}(${incomeExpr}, c)`
        : `${this._codegenUncachedValueFunctionName(componentIndex)}(${incomeExpr})`;
      if (!useCacheForIncome) return callExpr;
      return `((__NEEDS_CACHE_STATE && c.vh[${componentIndex}] && c.vx[${componentIndex}] === ${incomeExpr}) ? c.vv[${componentIndex}] : ${callExpr})`;
    }
    if (mode === 'marginal') {
      const callExpr = useCacheForIncome
        ? `${this._codegenMarginalFunctionName(componentIndex)}(${incomeExpr}, c)`
        : `${this._codegenUncachedMarginalFunctionName(componentIndex)}(${incomeExpr})`;
      if (!useCacheForIncome) return callExpr;
      return `((__NEEDS_CACHE_STATE && c.mh[${componentIndex}] && c.mx[${componentIndex}] === ${incomeExpr}) ? c.mv[${componentIndex}] : ${callExpr})`;
    }
    if (mode === 'total') {
      const callExpr = useCacheForIncome
        ? `${this._codegenTotalFunctionName(componentIndex)}(${incomeExpr}, c)`
        : `${this._codegenUncachedTotalFunctionName(componentIndex)}(${incomeExpr})`;
      if (!useCacheForIncome) return callExpr;
      return `((__NEEDS_CACHE_STATE && c.th[${componentIndex}] && c.tx[${componentIndex}] === ${incomeExpr}) ? c.tv[${componentIndex}] : ${callExpr})`;
    }
    return null;
  }

  _codegenConvertIncomeExpression(expression, fromCountryModel, toCountryModel) {
    if (!fromCountryModel || !toCountryModel) return null;
    if (fromCountryModel.countryKey === toCountryModel.countryKey) return expression;

    const sourceRate = this.currencyToEur.get(fromCountryModel.currencyKey);
    const targetRate = this.currencyToEur.get(toCountryModel.currencyKey);
    if (!sourceRate || !targetRate) return null;

    const factor = sourceRate / targetRate;
    if (factor === 1) return expression;
    return `((${expression}) * ${this._codegenNumberLiteral(factor)})`;
  }

  _codegenConvertIncomeFactor(fromCountryModel, toCountryModel) {
    if (!fromCountryModel || !toCountryModel) return null;
    if (fromCountryModel.countryKey === toCountryModel.countryKey) return 1;

    const sourceRate = this.currencyToEur.get(fromCountryModel.currencyKey);
    const targetRate = this.currencyToEur.get(toCountryModel.currencyKey);
    if (!sourceRate || !targetRate) return null;
    return sourceRate / targetRate;
  }

  _codegenEmitBracketClosedFormBodyLines(plan, context) {
    const selectorName = this._codegenTempName('selector', context);
    const needsGapCheck = Boolean(plan.hasGaps);
    let hasTerminalReturn = false;
    const lines = [
      ...plan.setupLines,
      `const ${selectorName} = __toNumber(${plan.selectorExpr});`,
      `if (!Number.isFinite(${selectorName}) || ${selectorName} <= 0) return 0;`,
    ];

    for (const arm of plan.arms) {
      const lower = this._codegenNumberLiteral(arm.lower);
      const upper = arm.upper === Infinity ? 'Infinity' : this._codegenNumberLiteral(arm.upper);
      const rate = this._codegenNumberLiteral(arm.rate);
      const base = this._codegenNumberLiteral(arm.baseAtLower);
      let expression = null;
      if (arm.rate === 0) {
        expression = base;
      } else if (arm.baseAtLower === 0) {
        expression = `(${selectorName} - ${lower}) * ${rate}`;
      } else {
        expression = `${base} + (${selectorName} - ${lower}) * ${rate}`;
      }

      if (arm.upper === Infinity) {
        if (needsGapCheck) lines.push(`if (${selectorName} <= ${lower}) return ${base};`);
        lines.push(`return ${expression};`);
        hasTerminalReturn = true;
        break;
      }

      lines.push(`if (${selectorName} <= ${upper}) {`);
      if (needsGapCheck) lines.push(`  if (${selectorName} <= ${lower}) return ${base};`);
      lines.push(`  return ${expression};`);
      lines.push('}');
    }

    if (!hasTerminalReturn) lines.push(`return ${this._codegenNumberLiteral(plan.finalTotal)};`);
    return lines;
  }

  _codegenEmitBracketClosedFormExpression(plan, context) {
    const lines = this._codegenEmitBracketClosedFormBodyLines(plan, context);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenEmitBracketClosedFormMarginalBodyLines(component, plan, context, xExpr) {
    const incomeName = this._codegenTempName('income', context);
    const leftName = this._codegenTempName('left', context);
    const selectorLeftName = this._codegenTempName('selectorLeft', context);
    const selectorPrimeName = this._codegenTempName('selectorPrime', context);
    const needsGapCheck = Boolean(plan.hasGaps);

    const leftPlan = this._codegenBuildBracketClosedFormPlan(component, context, { xExpr: leftName });
    const primePlan = this._codegenBuildBracketClosedFormPlan(component, context, { xExpr: '__income' });
    if (!leftPlan || !primePlan) {
      const componentIndex = context.componentIndexByKey.get(this._codegenComponentMapKey(component));
      return [`return __derivativeAt((__income) => ${this._codegenValueFunctionName(componentIndex)}(__income, c), ${xExpr});`];
    }

    const lines = [
      `const ${incomeName} = __toNumber(${xExpr});`,
      `if (!Number.isFinite(${incomeName}) || ${incomeName} < 0) return 0;`,
      `const ${leftName} = ${incomeName} > 0 ? Math.max(0, ${incomeName} - __MIN_DERIVATIVE_STEP) : 0;`,
      ...leftPlan.setupLines,
      `const ${selectorLeftName} = __toNumber(${leftPlan.selectorExpr});`,
      `if (!Number.isFinite(${selectorLeftName}) || ${selectorLeftName} <= 0) return 0;`,
      `const ${selectorPrimeName} = __derivativeAt((__income) => {`,
      ...primePlan.setupLines.map((line) => `  ${line}`),
      `  return __toNumber(${primePlan.selectorExpr});`,
      `}, ${incomeName});`,
      `if (!Number.isFinite(${selectorPrimeName})) return 0;`,
    ];

    let hasTerminalReturn = false;
    for (const arm of plan.arms) {
      const lower = this._codegenNumberLiteral(arm.lower);
      const upper = arm.upper === Infinity ? 'Infinity' : this._codegenNumberLiteral(arm.upper);
      const rate = this._codegenNumberLiteral(arm.rate);
      if (arm.upper === Infinity) {
        if (needsGapCheck) lines.push(`if (${selectorLeftName} < ${lower}) return 0;`);
        lines.push(`return ${rate} * ${selectorPrimeName};`);
        hasTerminalReturn = true;
        break;
      }

      lines.push(`if (${selectorLeftName} < ${upper}) {`);
      if (needsGapCheck) lines.push(`  if (${selectorLeftName} < ${lower}) return 0;`);
      lines.push(`  return ${rate} * ${selectorPrimeName};`);
      lines.push('}');
    }

    if (!hasTerminalReturn) lines.push('return 0;');
    return lines;
  }

  _codegenEmitBracketClosedFormMarginalExpression(component, plan, context, xExpr) {
    const lines = this._codegenEmitBracketClosedFormMarginalBodyLines(component, plan, context, xExpr);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenEmitFastBracketMarginalBodyLines(fastBracketPlan, context, xExpr) {
    const incomeName = this._codegenTempName('income', context);
    const leftName = this._codegenTempName('left', context);
    const needsGapCheck = Boolean(fastBracketPlan.hasGaps);
    let hasTerminalReturn = false;
    const lines = [
      `const ${incomeName} = __toNumber(${xExpr});`,
      `if (!Number.isFinite(${incomeName}) || ${incomeName} < 0) return 0;`,
      `const ${leftName} = ${incomeName} > 0 ? Math.max(0, ${incomeName} - __MIN_DERIVATIVE_STEP) : 0;`,
    ];

    for (const arm of fastBracketPlan.arms) {
      const lower = this._codegenNumberLiteral(arm.lower);
      const upper = arm.upper === Infinity ? 'Infinity' : this._codegenNumberLiteral(arm.upper);
      const rate = this._codegenNumberLiteral(arm.rate);
      if (arm.upper === Infinity) {
        if (needsGapCheck) lines.push(`if (${leftName} < ${lower}) return 0;`);
        lines.push(`return ${rate};`);
        hasTerminalReturn = true;
        break;
      }

      lines.push(`if (${leftName} < ${upper}) {`);
      if (needsGapCheck) lines.push(`  if (${leftName} < ${lower}) return 0;`);
      lines.push(`  return ${rate};`);
      lines.push('}');
    }
    if (!hasTerminalReturn) lines.push('return 0;');
    return lines;
  }

  _codegenEmitFastBracketMarginalExpression(fastBracketPlan, context, xExpr) {
    const lines = this._codegenEmitFastBracketMarginalBodyLines(fastBracketPlan, context, xExpr);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenEmitFastBracketTotalBodyLines(fastBracketPlan, context, xExpr) {
    const selectorName = this._codegenTempName('selector', context);
    const needsGapCheck = Boolean(fastBracketPlan.hasGaps);
    let hasTerminalReturn = false;
    const lines = [
      `const ${selectorName} = __toNumber(${xExpr});`,
      `if (!Number.isFinite(${selectorName}) || ${selectorName} <= 0) return 0;`,
    ];

    for (const arm of fastBracketPlan.arms) {
      const lower = this._codegenNumberLiteral(arm.lower);
      const upper = arm.upper === Infinity ? 'Infinity' : this._codegenNumberLiteral(arm.upper);
      const rate = this._codegenNumberLiteral(arm.rate);
      const base = this._codegenNumberLiteral(arm.baseAtLower);
      let expression = null;
      if (arm.rate === 0) {
        expression = base;
      } else if (arm.baseAtLower === 0) {
        expression = `(${selectorName} - ${lower}) * ${rate}`;
      } else {
        expression = `${base} + (${selectorName} - ${lower}) * ${rate}`;
      }

      if (arm.upper === Infinity) {
        if (needsGapCheck) lines.push(`if (${selectorName} <= ${lower}) return ${base};`);
        lines.push(`return ${expression};`);
        hasTerminalReturn = true;
        break;
      }

      lines.push(`if (${selectorName} <= ${upper}) {`);
      if (needsGapCheck) lines.push(`  if (${selectorName} <= ${lower}) return ${base};`);
      lines.push(`  return ${expression};`);
      lines.push('}');
    }
    if (!hasTerminalReturn) lines.push(`return ${this._codegenNumberLiteral(fastBracketPlan.finalTotal)};`);
    return lines;
  }

  _codegenEmitFastPieceMarginalBodyLines(fastPieceMarginalPlan, context, xExpr) {
    const incomeName = this._codegenTempName('income', context);
    const leftName = this._codegenTempName('left', context);
    const lines = [
      `const ${incomeName} = __toNumber(${xExpr});`,
      `if (!Number.isFinite(${incomeName}) || ${incomeName} < 0) return 0;`,
      `const ${leftName} = ${incomeName} > 0 ? Math.max(0, ${incomeName} - __MIN_DERIVATIVE_STEP) : 0;`,
    ];

    for (const arm of fastPieceMarginalPlan.arms) {
      const threshold = this._codegenNumberLiteral(arm.threshold);
      const slope = this._codegenNumberLiteral(arm.slope);
      lines.push(`if (${leftName} ${arm.inclusive ? '<=' : '<'} ${threshold}) return ${slope};`);
    }

    lines.push(`return ${this._codegenNumberLiteral(fastPieceMarginalPlan.elseSlope)};`);
    return lines;
  }

  _codegenEmitFastPieceMarginalExpression(fastPieceMarginalPlan, context, xExpr) {
    const lines = this._codegenEmitFastPieceMarginalBodyLines(fastPieceMarginalPlan, context, xExpr);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenEmitFastPieceValueBodyLines(fastPieceValuePlan, context, xExpr) {
    const incomeName = this._codegenTempName('income', context);
    const lines = [
      `const ${incomeName} = __toNumber(${xExpr});`,
      `if (!Number.isFinite(${incomeName})) return 0;`,
    ];

    for (const arm of fastPieceValuePlan.arms) {
      const threshold = this._codegenNumberLiteral(arm.threshold);
      const valueExpr = this._codegenEmitAffineValueExpression(arm.a, arm.b, incomeName);
      lines.push(`if (${incomeName} ${arm.inclusive ? '<=' : '<'} ${threshold}) return ${valueExpr};`);
    }

    lines.push(`return ${this._codegenEmitAffineValueExpression(fastPieceValuePlan.elseA, fastPieceValuePlan.elseB, incomeName)};`);
    return lines;
  }

  _codegenEmitFastPieceValueExpression(fastPieceValuePlan, context, xExpr) {
    const lines = this._codegenEmitFastPieceValueBodyLines(fastPieceValuePlan, context, xExpr);
    return `(() => {\n  ${lines.join('\n  ')}\n})()`;
  }

  _codegenEmitAffineValueExpression(a, b, xExpr) {
    const slope = this._codegenNumberLiteral(a);
    const intercept = this._codegenNumberLiteral(b);
    if (a === 0) return intercept;
    if (b === 0) return `((${slope}) * (${xExpr}))`;
    return `(((${slope}) * (${xExpr})) + (${intercept}))`;
  }

  _codegenSafeLocalName(identifier, context) {
    const normalized = String(identifier || '')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/^[^A-Za-z_]/, '_$&');
    return `__l_${context.tempCounter += 1}_${normalized || 'value'}`;
  }

  _codegenTempName(prefix, context) {
    context.tempCounter += 1;
    return `__${prefix}_${context.tempCounter}`;
  }

  _codegenRegisterFixWarmStateName(context) {
    if (!context || !Array.isArray(context.fixWarmStateNames)) return null;
    const name = `__fixWarm_${context.fixWarmStateNames.length}`;
    context.fixWarmStateNames.push(name);
    return name;
  }

  _codegenCanAssumeNonnegativeExpression(expression) {
    if (typeof expression !== 'string') return false;
    const source = expression.trim();
    if (!source) return false;
    if (source === 'x') return true;

    const numeric = Number(source);
    if (Number.isFinite(numeric)) return numeric >= 0;

    if (source.startsWith('Math.max(0,')) return true;
    if (source.startsWith('Math.max(0, (')) return true;
    if (/^Math\.max\(0,\s*\(.+\)\)$/.test(source)) return true;
    return false;
  }

  _codegenIsSimpleIdentifierExpression(expression) {
    if (typeof expression !== 'string') return false;
    const source = expression.trim();
    if (!source) return false;
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(source);
  }

  _codegenNumberLiteral(value) {
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
    if (Object.is(value, -0)) return '-0';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return String(numeric);
  }

  _codegenComponentMapKey(component) {
    return `${component.countryKey}:${component.id}`;
  }

  _codegenValueFunctionName(index) {
    return `__v${index}`;
  }

  _codegenUncachedValueFunctionName(index) {
    return `__v${index}_u`;
  }

  _codegenMarginalFunctionName(index) {
    return `__m${index}`;
  }

  _codegenUncachedMarginalFunctionName(index) {
    return `__m${index}_u`;
  }

  _codegenTotalFunctionName(index) {
    return `__t${index}`;
  }

  _codegenUncachedTotalFunctionName(index) {
    return `__t${index}_u`;
  }

}

export function installCodegenMethods(TargetClass) {
  const descriptors = Object.getOwnPropertyDescriptors(CodegenMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(TargetClass.prototype, descriptors);
}
