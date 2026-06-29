import {
  FIX_ABSOLUTE_TOLERANCE,
  FIX_MAX_BOUND,
  FIX_MAX_ITERATIONS,
  FIX_MIN_BOUND,
  FIX_RELATIVE_TOLERANCE,
  ceilToStep,
  derivativeAt,
  floorToStep,
  integrateNumerically,
  normalizeIdentifier,
  roundToStep,
  toNumber,
} from './shared.js';

const merge = (...sets) => new Set(sets.flatMap((set) => [...set]));
const result = (value, derivative = '0', dependencies = new Set()) => ({
  value,
  derivative,
  dependencies,
});
const safeName = (name) => `_${String(name).replace(/[^A-Za-z0-9_$]/g, '_')}`;

class CodegenMethods {
  _buildPreparedCodegen(prepared) {
    const components = [...this._models().values()]
      .flatMap((country) => country.components);
    const componentIndexes = new Map(
      components.map((component, index) => [this._componentKey(component), index])
    );
    const context = { components, componentIndexes, temp: 0 };
    const definitions = components.map((component, index) =>
      this._compileComponent(component, index, context)
    ).join('\n');
    const active = prepared.activeComponents.map((component) =>
      componentIndexes.get(this._componentKey(component))
    );
    const sourceRate = this._currencies().get(prepared.sourceCurrency);
    const targetRate = this._currencies().get(prepared.countryModel.currencyKey);
    if (!sourceRate || !targetRate) {
      throw new Error(
        `Missing currency conversion for ${prepared.sourceCurrency} -> ${prepared.countryModel.currencyKey}`
      );
    }

    const source = `"use strict";
${definitions}
const factor = ${sourceRate / targetRate};
const persistent = runtime.cache(${components.length});
return {
  marginalRate(grossIncome) {
    if (grossIncome === lastMarginalIncome) return lastMarginalValue;
    const x = grossIncome * factor;
    if (x < 0) return 0;
    const total = ${active.map((index) => `m${index}(x,persistent)`).join('+') || '0'};
    lastMarginalIncome = grossIncome;
    lastMarginalValue = total;
    return lastMarginalValue;
  },
  overallRate(grossIncome) {
    if (grossIncome === lastOverallIncome) return lastOverallValue;
    const x = grossIncome * factor;
    if (x <= 0) return 0;
    const tax = ${active.map((index) => `v${index}(x,persistent)`).join('+') || '0'};
    lastOverallIncome = grossIncome;
    lastOverallValue = tax / x;
    return lastOverallValue;
  }
};`;

    return new Function(
      'runtime',
      `let lastMarginalIncome, lastMarginalValue, lastOverallIncome, lastOverallValue;\n${source}`
    )(CODEGEN_RUNTIME);
  }

  _compileComponent(component, index, context) {
    const scope = new Map([['x', result('x', '1')]]);
    const bindings = new Map();
    const lines = [];
    for (const statement of component.body.statements) {
      const compiled = this._compileNode(statement.value, {
        ...context,
        countryModel: this._models().get(component.countryKey),
        scope,
        bindings,
      });
      const name = safeName(statement.name);
      const derivativeName = `${name}_d`;
      lines.push(`const ${name} = ${compiled.value};`);
      lines.push(`const ${derivativeName} = ${compiled.derivative};`);
      scope.set(statement.name, result(name, derivativeName, compiled.dependencies));
      bindings.set(statement.name, statement.value);
    }
    const compiled = this._compileNode(component.body.result, {
      ...context,
      countryModel: this._models().get(component.countryKey),
      scope,
      bindings,
    });
    const statementLines = lines.join('\n');
    lines.push(`return ${compiled.value};`);
    const needsNumericDerivative = this._containsType(component.body, 'Fix');
    const directDerivative = needsNumericDerivative
      ? `runtime.derivative((n) => v${index}(n, c), x)`
      : `(()=>{${statementLines}\nreturn ${compiled.derivative};})()`;
    const needsCache = compiled.dependencies.size > 0;
    const valueCacheRead = needsCache
      ? `if (c.vx[${index}] === x) return c.vv[${index}];`
      : '';
    const valueCacheWrite = needsCache
      ? `c.vx[${index}] = x; c.vv[${index}] = answer;`
      : '';
    const marginalCacheRead = needsCache
      ? `if (c.mx[${index}] === x) return c.mv[${index}];`
      : '';
    const marginalCacheWrite = needsCache
      ? `c.mx[${index}] = x; c.mv[${index}] = answer;`
      : '';

    return `
function v${index}(x, c) {
  ${valueCacheRead}
  const answer = (() => { ${lines.join('\n')} })();
  ${valueCacheWrite}
  return answer;
}
function m${index}(x, c) {
  ${marginalCacheRead}
  const answer = ${directDerivative};
  ${marginalCacheWrite}
  return answer;
}`;
  }

  _compileNode(node, env) {
    if (node.type === 'Literal') {
      return result(
        node.value === Infinity ? 'Infinity' : JSON.stringify(node.value),
        '0'
      );
    }
    if (node.type === 'Identifier') {
      const value = env.scope.get(node.name);
      if (!value) throw new Error(`Unknown identifier: ${node.name}`);
      return value;
    }
    if (node.type === 'Unary') {
      const operand = this._compileNode(node.operand, env);
      if (node.operator === 'not') return result(`!(${operand.value})`, '0', operand.dependencies);
      if (node.operator === '-') {
        return result(`-(${operand.value})`, `-(${operand.derivative})`, operand.dependencies);
      }
      return operand;
    }
    if (node.type === 'Binary') return this._compileBinary(node, env);
    if (node.type === 'Call') return this._compileCall(node, env);
    if (node.type === 'Reference') return this._compileReference(node, env);
    if (node.type === 'Eval') return this._compileEval(node, env);
    if (node.type === 'Fix') return this._compileFix(node, env);
    if (node.type === 'Piece') return this._compilePiece(node, env);
    if (node.type === 'Brackets') return this._compileBrackets(node, env);
    if (node.type === 'TaxableBrackets') return this._compileTaxableBrackets(node, env);
    throw new Error(`Unsupported semantic node: ${node.type}`);
  }

  _compileBinary(node, env) {
    const left = this._compileNode(node.left, env);
    const right = this._compileNode(node.right, env);
    const deps = merge(left.dependencies, right.dependencies);
    const a = `(${left.value})`;
    const b = `(${right.value})`;
    const da = `(${left.derivative})`;
    const db = `(${right.derivative})`;
    if (node.operator === '+') return result(`${a}+${b}`, `${da}+${db}`, deps);
    if (node.operator === '-') return result(`${a}-${b}`, `${da}-${db}`, deps);
    if (node.operator === '*') return result(`${a}*${b}`, `${da}*${b}+${a}*${db}`, deps);
    if (node.operator === '/') {
      return result(`${a}/${b}`, `(${da}*${b}-${a}*${db})/(${b}*${b})`, deps);
    }
    if (node.operator === '^') {
      return result(
        `${a}**${b}`,
        `${a}**${b}*(${db}*Math.log(${a})+${b}*${da}/${a})`,
        deps
      );
    }
    if (node.operator === 'and') return result(`${a}&&${b}`, '0', deps);
    if (node.operator === 'or') return result(`${a}||${b}`, '0', deps);
    return result(`${a}${node.operator}${b}`, '0', deps);
  }

  _compileCall(node, env) {
    const args = node.arguments.map((argument) => this._compileNode(argument, env));
    const values = args.map((argument) => argument.value);
    const derivatives = args.map((argument) => argument.derivative);
    const deps = merge(...args.map((argument) => argument.dependencies));
    const [a = '0', b = '0', c = '0'] = values;
    const [da = '0', db = '0'] = derivatives;
    if (node.name === 'min' || node.name === 'max') {
      const fn = node.name === 'min' ? 'Math.min' : 'Math.max';
      const value = `${fn}(${values.join(',')})`;
      if (args.length === 2) {
        const tieDerivative = node.name === 'min' ? 'Math.max' : 'Math.min';
        return result(
          value,
          `(${args[0].value})${node.name === 'min' ? '<' : '>'}(${args[1].value})?${
            args[0].derivative
          }:(${args[0].value})${node.name === 'min' ? '>' : '<'}(${args[1].value})?${
            args[1].derivative
          }:${tieDerivative}(${args[0].derivative},${args[1].derivative})`,
          deps
        );
      }
      const derivative = args.reduceRight(
        (fallback, argument, index) =>
          `${argument.value}===${value}?${argument.derivative}:(${fallback})`,
        '0'
      );
      return result(value, derivative, deps);
    }
    if (node.name === 'abs') return result(`Math.abs(${a})`, `Math.sign(${a})*(${da})`, deps);
    if (node.name === 'pow') {
      return this._compileBinary(
        { type: 'Binary', operator: '^', left: node.arguments[0], right: node.arguments[1] },
        env
      );
    }
    if (node.name === 'sqrt') return result(`Math.sqrt(${a})`, `(${da})/(2*Math.sqrt(${a}))`, deps);
    if (node.name === 'log') return result(`Math.log(${a})`, `(${da})/(${a})`, deps);
    if (node.name === 'exp') return result(`Math.exp(${a})`, `Math.exp(${a})*(${da})`, deps);
    if (node.name === 'floor' || node.name === 'ceil' || node.name === 'round') {
      return result(`runtime.${node.name}(${a},${b || 1})`, '0', deps);
    }
    if (node.name === 'sum') {
      return result(values.join('+') || '0', derivatives.join('+') || '0', deps);
    }
    if (node.name === 'if') return result(`${a}?(${b}):(${c})`, `${a}?(${db}):(${derivatives[2] || 0})`, deps);
    if (node.name === 'pos') return result(`Math.max(0,${a})`, `${a}>0?(${da}):0`, deps);
    throw new Error(`Unsupported function: ${node.name}`);
  }

  _resolveCodegenReference(path, countryModel) {
    const normalized = path.map(normalizeIdentifier);
    if (normalized.length === 1) {
      const matches = countryModel.byName.get(normalized[0]) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous reference: ${path.join('.')}`);
    } else if (normalized.length === 2) {
      const local = countryModel.byKindAndName.get(`${normalized[0]}:${normalized[1]}`);
      if (local) return local;
      const matches = this._models().get(normalized[0])?.byName.get(normalized[1]) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous reference: ${path.join('.')}`);
    } else if (normalized.length === 3) {
      const country = this._models().get(normalized[0]);
      if (!country) throw new Error(`Unknown country in reference: ${path.join('.')}`);
      const component = country.byKindAndName.get(`${normalized[1]}:${normalized[2]}`);
      if (component) return component;
      throw new Error(`Unknown component reference: ${path.join('.')}`);
    }
    throw new Error(`Unknown reference: ${path.join('.')}`);
  }

  _compileReference(node, env) {
    const component = this._resolveCodegenReference(node.path, env.countryModel);
    const index = env.componentIndexes.get(this._componentKey(component));
    const target = this._models().get(component.countryKey);
    const factor = this._currencies().get(env.countryModel.currencyKey)
      / this._currencies().get(target.currencyKey);
    const income = factor === 1 ? 'x' : `(x*${factor})`;
    return result(
      `v${index}(${income},c)`,
      `m${index}(${income},c)*${factor}`,
      new Set([index])
    );
  }

  _compileEval(node, env) {
    const component = this._resolveCodegenReference(node.path, env.countryModel);
    const index = env.componentIndexes.get(this._componentKey(component));
    const income = this._compileNode(node.income, env);
    return result(
      `v${index}(${income.value},c)`,
      `m${index}(${income.value},c)*(${income.derivative})`,
      merge(income.dependencies, new Set([index]))
    );
  }

  _compileFix(node, env) {
    const initial = this._compileNode(node.initial, env);
    const name = `_k${env.temp++}`;
    const fixScope = new Map(env.scope);
    fixScope.set('k', result(name, '0'));
    const update = this._compileNode(node.update, { ...env, scope: fixScope });
    const value = `runtime.fix(${initial.value},(${name})=>${update.value})`;
    return result(
      value,
      `runtime.derivative((__x)=>${this._replaceX(value, '__x')},x)`,
      merge(initial.dependencies, update.dependencies)
    );
  }

  _compilePiece(node, env) {
    const arms = node.arms.map((arm) => ({
      condition: this._compileNode(arm.condition, env),
      value: this._compileNode(arm.value, env),
    }));
    const otherwise = this._compileNode(node.otherwise, env);
    const value = arms.reduceRight(
      (fallback, arm) => `${arm.condition.value}?(${arm.value.value}):(${fallback})`,
      otherwise.value
    );
    const derivative = arms.reduceRight(
      (fallback, arm) => `${arm.condition.value}?(${arm.value.derivative}):(${fallback})`,
      otherwise.derivative
    );
    return result(
      value,
      derivative,
      merge(
        otherwise.dependencies,
        ...arms.flatMap((arm) => [arm.condition.dependencies, arm.value.dependencies])
      )
    );
  }

  _compileBrackets(node, env) {
    const income = this._compileNode(node.income, env);
    const arms = node.arms.map((arm) => ({
      lower: this._compileNode(arm.lower, env),
      upper: this._compileNode(arm.upper, env),
      value: this._compileNode(arm.value, env),
      constantRate: arm.value.type === 'Literal' && typeof arm.value.value === 'number',
    }));
    const value = `runtime.brackets(${income.value},[${arms.map((arm) =>
      `[${arm.lower.value},${arm.upper.value},${
        arm.constantRate
          ? arm.value.value
          : `(__x)=>${this._replaceX(arm.value.value, '__x')}`
      }]`
    ).join(',')}])`;
    const probe = `Math.max(0,(${income.value})-1e-5)`;
    const derivative = arms.reduceRight(
      (fallback, arm) =>
        `${probe}>=(${arm.lower.value})&&${probe}<(${arm.upper.value})?(${
          this._replaceX(arm.value.value, probe)
        })*(${income.derivative}):(${fallback})`,
      '0'
    );
    return result(
      value,
      derivative,
      merge(income.dependencies, ...arms.flatMap((arm) =>
        [arm.lower.dependencies, arm.upper.dependencies, arm.value.dependencies]
      ))
    );
  }

  _compileTaxableBrackets(node, env) {
    const income = this._compileNode(node.income, env);
    const allowance = this._compileNode(node.allowance, env);
    const base = this._compileNode(node.allowanceBase, env);
    const arms = node.arms.map((arm) => ({
      lower: this._compileNode(arm.lower, env),
      upper: this._compileNode(arm.upper, env),
      value: this._compileNode(arm.value, env),
      constantRate: arm.value.type === 'Literal' && typeof arm.value.value === 'number',
    }));
    const scopeAtX = this._scopeAt(env, '__x');
    const allowanceAtX = this._compileNode(node.allowance, { ...env, scope: scopeAtX });
    if (arms.every((arm) => arm.constantRate)) {
      const selector = `Math.max(0,(${income.value})-(${allowance.value}))`;
      const allowanceAt = (bound) => {
        const boundScope = this._scopeAt(env, `(${bound})`);
        const atBound = this._compileNode(node.allowance, { ...env, scope: boundScope });
        return this._foldConstant(
          `Math.min(${base.value},Math.max(0,${atBound.value}))`
        );
      };
      const ranges = arms.map((arm) => {
        const lower = `((${arm.lower.value})-${allowanceAt(arm.lower.value)})`;
        const upper = arm.upper.value === 'Infinity'
          ? 'Infinity'
          : `((${arm.upper.value})-${allowanceAt(arm.upper.value)})`;
        return { ...arm, lower, upper };
      });
      let cumulative = '0';
      let value = cumulative;
      for (let index = ranges.length - 1; index >= 0; index -= 1) {
        const arm = ranges[index];
        const before = ranges.slice(0, index).map((previous) =>
          `((${previous.upper})-(${previous.lower}))*${previous.value.value}`
        ).join('+') || '0';
        const within = `(${before})+Math.max(0,(${selector})-(${arm.lower}))*${
          arm.value.value
        }`;
        value = `(${selector})<=(${arm.upper})?(${within}):(${value})`;
        cumulative = before;
      }
      value = `(${value})`;
      const selectorDerivative = `((${income.derivative})-(${allowance.derivative}))`;
      const probe = `((${selector})-1e-5)`;
      const derivative = ranges.reduceRight(
        (fallback, arm) =>
          `${probe}>=${arm.lower}&&${probe}<${arm.upper}?${
            arm.value.value
          }*${selectorDerivative}:(${fallback})`,
        '0'
      );
      return result(
        value,
        derivative,
        merge(
          income.dependencies,
          allowance.dependencies,
          base.dependencies,
          ...arms.flatMap((arm) =>
            [arm.lower.dependencies, arm.upper.dependencies, arm.value.dependencies]
          )
        )
      );
    }
    const value = `runtime.taxableBrackets(x,()=>${income.value},(__x)=>${
      allowanceAtX.value
    },${base.value},[${arms.map((arm) =>
      `[${arm.lower.value},${arm.upper.value},${
        arm.constantRate
          ? arm.value.value
          : `(__x)=>${this._compileNode(arm.value, { ...env, scope: scopeAtX }).value}`
      }]`
    ).join(',')}])`;
    return result(
      value,
      `runtime.derivative((__x)=>${this._replaceX(value, '__x')},x)`,
      merge(
        income.dependencies,
        allowance.dependencies,
        base.dependencies,
        ...arms.flatMap((arm) =>
          [arm.lower.dependencies, arm.upper.dependencies, arm.value.dependencies]
        )
      )
    );
  }

  _replaceX(source, replacement) {
    return source.replace(/\bx\b/g, replacement);
  }

  _scopeAt(env, xExpression) {
    const scope = new Map([['x', result(xExpression, '1')]]);
    for (const [name, binding] of env.bindings || []) {
      scope.set(name, this._compileNode(binding, { ...env, scope }));
    }
    return scope;
  }

  _foldConstant(expression) {
    if (!/^[\d\s()+\-*/.,A-Za-z]+$/.test(expression)) return expression;
    try {
      const value = new Function(`return (${expression})`)();
      return Number.isFinite(value) ? String(value) : expression;
    } catch {
      return expression;
    }
  }

  _containsType(value, type) {
    if (!value || typeof value !== 'object') return false;
    if (value.type === type) return true;
    return Object.values(value).some((child) =>
      Array.isArray(child)
        ? child.some((item) => this._containsType(item, type))
        : this._containsType(child, type)
    );
  }

  _componentKey(component) {
    return `${component.countryKey}:${component.id}`;
  }
}

const CODEGEN_RUNTIME = Object.freeze({
  cache: (size) => ({
    vx: new Array(size),
    vv: new Array(size),
    mx: new Array(size),
    mv: new Array(size),
  }),
  derivative: derivativeAt,
  floor: floorToStep,
  ceil: ceilToStep,
  round: roundToStep,
  fix(initial, update) {
    let current = Math.min(FIX_MAX_BOUND, Math.max(FIX_MIN_BOUND, Number(initial) || 0));
    for (let iteration = 0; iteration < FIX_MAX_ITERATIONS; iteration += 1) {
      const raw = Number(update(current));
      const next = Math.min(
        FIX_MAX_BOUND,
        Math.max(FIX_MIN_BOUND, Number.isFinite(raw) ? raw : current)
      );
      const scale = Math.max(Math.abs(current), Math.abs(next), 1);
      if (
        Math.abs(next - current)
        <= FIX_ABSOLUTE_TOLERANCE + FIX_RELATIVE_TOLERANCE * scale
      ) return next;
      current = next;
    }
    return current;
  },
  brackets(income, arms) {
    const selector = toNumber(income);
    if (!Number.isFinite(selector) || selector <= 0) return 0;
    let total = 0;
    for (const [lower, upper, evaluate] of arms) {
      if (!Number.isFinite(lower) || Number.isNaN(upper) || selector <= lower) continue;
      const segmentUpper = Math.min(selector, upper);
      if (segmentUpper <= lower) continue;
      total += typeof evaluate === 'number'
        ? evaluate * (segmentUpper - lower)
        : integrateNumerically(evaluate, lower, segmentUpper);
      if (selector <= upper) break;
    }
    return total;
  },
  taxableBrackets(grossIncome, evaluateIncome, evaluateAllowance, allowanceBase, arms) {
    const income = toNumber(evaluateIncome());
    const cap = Number.isFinite(allowanceBase) ? Math.max(0, allowanceBase) : Infinity;
    const allowanceAt = (value) => {
      if (!Number.isFinite(value)) return 0;
      const allowance = Math.max(0, toNumber(evaluateAllowance(value)));
      return Number.isFinite(cap) ? Math.min(allowance, cap) : allowance;
    };
    const selector = Math.max(0, income - allowanceAt(grossIncome));
    if (!Number.isFinite(selector) || selector <= 0) return 0;
    return CODEGEN_RUNTIME.brackets(
      selector,
      arms.map(([lower, upper, evaluate]) => [
        lower - allowanceAt(lower),
        upper === Infinity ? Infinity : upper - allowanceAt(upper),
        evaluate,
      ])
    );
  },
});

export function installCodegenMethods(TargetClass) {
  const descriptors = Object.getOwnPropertyDescriptors(CodegenMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(TargetClass.prototype, descriptors);
}
