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

class EvaluationMethods {
  _evaluateComponentMarginal(component, state) {
    if (
      component.body.statements.length === 0
      && component.body.result.type === 'Brackets'
      && component.body.result.income.type === 'Identifier'
      && component.body.result.income.name === 'x'
    ) {
      const income = Math.max(0, state.localIncome - 1e-5);
      for (const arm of component.body.result.arms) {
        const lower = toNumber(this._evaluateNode(arm.lower, state));
        const upper = this._evaluateNode(arm.upper, state);
        if (income >= lower && income < upper) {
          return toNumber(this._evaluateNode(arm.value, this._stateWithLocalX(state, income)));
        }
      }
      return 0;
    }
    return this._withComponentGuard(component, 'marginal', state, () =>
      derivativeAt(
        (income) => this._evaluateComponentValueAtIncome(component, state, income),
        state.localIncome
      )
    );
  }

  _evaluateComponentTotal(component, state) {
    return this._withComponentGuard(component, 'total', state, () =>
      state.localIncome <= 0
        ? 0
        : this._evaluateComponentValueAtIncome(component, state, state.localIncome)
    );
  }

  _evaluateComponentValueAtIncome(component, state, localIncome) {
    return this._evaluateBlock(
      component.body,
      this._stateForCountryIncome(state, component.countryName, localIncome)
    );
  }

  _withComponentGuard(component, mode, state, callback) {
    const key = `${component.countryKey}:${component.id}:${mode}`;
    const income = state.localIncome;
    let values = state.memo.get(key);
    if (!values) {
      values = new Map();
      state.memo.set(key, values);
    } else if (values.has(income)) {
      return values.get(income);
    }
    if (state.callStack.has(key)) {
      throw new Error(
        `Circular component reference detected: ${component.countryName}.${component.kind}.${component.componentName}`
      );
    }

    state.callStack.add(key);
    try {
      const result = callback();
      values.set(income, result);
      return result;
    } finally {
      state.callStack.delete(key);
    }
  }

  _stateForCountryIncome(state, countryName, localIncome) {
    const countryModel = this._resolveCountry(countryName);
    const convertedIncome = state.countryModel.countryKey === countryModel.countryKey
      ? localIncome
      : this._convertIncomeToCountry(
        localIncome,
        state.countryModel.currencyKey,
        countryModel.currencyKey
      );
    return {
      ...state,
      countryModel,
      localIncome: convertedIncome,
      scope: Object.assign(Object.create(null), { x: convertedIncome }),
    };
  }

  _evaluateBlock(block, state) {
    const scope = Object.create(state.scope || null);
    const blockState = { ...state, scope, block };
    for (const statement of block.statements) {
      scope[statement.name] = this._evaluateNode(statement.value, blockState);
    }
    return this._evaluateNode(block.result, blockState);
  }

  _evaluateNode(node, state) {
    switch (node.type) {
      case 'Literal':
        return node.value;
      case 'Identifier':
        return this._resolveIdentifier(node.name, state);
      case 'Unary':
        return this._evaluateUnary(node, state);
      case 'Binary':
        return this._evaluateBinary(node, state);
      case 'Call':
        return this._invokeNumericFunction(
          node.name,
          node.arguments.map((argument) => this._evaluateNode(argument, state))
        );
      case 'Reference':
        return this._evaluateReference(node, state);
      case 'Eval':
        return this._evaluateEval(node, state);
      case 'Fix':
        return this._evaluateFix(node, state);
      case 'Piece':
        return this._evaluatePiece(node, state);
      case 'Brackets':
        return this._evaluateBrackets(node, state);
      case 'TaxableBrackets':
        return this._evaluateTaxableBrackets(node, state);
      default:
        throw new Error(`Unsupported semantic node: ${node.type}`);
    }
  }

  _resolveIdentifier(identifier, state) {
    if (identifier in state.scope) return state.scope[identifier];
    throw new Error(`Unknown identifier: ${identifier}`);
  }

  _evaluateUnary(node, state) {
    const value = this._evaluateNode(node.operand, state);
    if (node.operator === 'not') return !Boolean(value);
    return node.operator === '-' ? -toNumber(value) : toNumber(value);
  }

  _evaluateBinary(node, state) {
    if (node.operator === 'or') {
      return Boolean(this._evaluateNode(node.left, state))
        || Boolean(this._evaluateNode(node.right, state));
    }
    if (node.operator === 'and') {
      return Boolean(this._evaluateNode(node.left, state))
        && Boolean(this._evaluateNode(node.right, state));
    }

    const left = toNumber(this._evaluateNode(node.left, state));
    const right = toNumber(this._evaluateNode(node.right, state));
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return left / right;
    if (node.operator === '^') return left ** right;
    if (node.operator === '<') return left < right;
    if (node.operator === '<=') return left <= right;
    if (node.operator === '>') return left > right;
    if (node.operator === '>=') return left >= right;
    if (node.operator === '==') return left === right;
    if (node.operator === '!=') return left !== right;
    throw new Error(`Unsupported operator: ${node.operator}`);
  }

  _resolveReference(path, countryModel) {
    const normalized = path.map(normalizeIdentifier);
    if (normalized.length === 1) {
      const matches = countryModel.byName.get(normalized[0]) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous reference: ${path.join('.')}`);
      throw new Error(`Unknown reference: ${path.join('.')}`);
    }
    if (normalized.length === 2) {
      const local = countryModel.byKindAndName.get(`${normalized[0]}:${normalized[1]}`);
      if (local) return local;
      const remote = this._models().get(normalized[0]);
      const matches = remote?.byName.get(normalized[1]) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous reference: ${path.join('.')}`);
      throw new Error(`Unknown reference: ${path.join('.')}`);
    }
    if (normalized.length === 3) {
      const remote = this._models().get(normalized[0]);
      if (!remote) throw new Error(`Unknown country in reference: ${path.join('.')}`);
      const component = remote.byKindAndName.get(`${normalized[1]}:${normalized[2]}`);
      if (!component) throw new Error(`Unknown component reference: ${path.join('.')}`);
      return component;
    }
    throw new Error(`Unsupported reference shape: ${path.join('.')}`);
  }

  _evaluateReference(node, state) {
    const component = this._resolveReference(node.path, state.countryModel);
    const refState = this._stateForCountryIncome(state, component.countryName, state.localIncome);
    return this._evaluateComponentTotal(component, refState);
  }

  _evaluateEval(node, state) {
    const component = this._resolveReference(node.path, state.countryModel);
    const income = toNumber(this._evaluateNode(node.income, state));
    return this._evaluateComponentValueAtIncome(
      component,
      state,
      Number.isFinite(income) ? income : 0
    );
  }

  _evaluateFix(node, state) {
    let current = this._clampFixValue(this._evaluateNode(node.initial, state));
    const scope = Object.create(state.scope);
    const fixState = { ...state, scope };
    for (let iteration = 0; iteration < FIX_MAX_ITERATIONS; iteration += 1) {
      scope.k = current;
      const next = this._clampFixValue(toNumber(this._evaluateNode(node.update, fixState), current));
      const scale = Math.max(Math.abs(current), Math.abs(next), 1);
      if (
        Math.abs(next - current)
        <= FIX_ABSOLUTE_TOLERANCE + FIX_RELATIVE_TOLERANCE * scale
      ) return next;
      current = next;
    }
    return current;
  }

  _clampFixValue(value) {
    const numeric = Number.isFinite(value) ? value : 0;
    return Math.min(FIX_MAX_BOUND, Math.max(FIX_MIN_BOUND, numeric));
  }

  _invokeNumericFunction(name, args) {
    if (name === 'min') return Math.min(...args.map((value) => toNumber(value)));
    if (name === 'max') return Math.max(...args.map((value) => toNumber(value)));
    if (name === 'abs') return Math.abs(toNumber(args[0]));
    if (name === 'pow') return toNumber(args[0]) ** toNumber(args[1]);
    if (name === 'sqrt') return Math.sqrt(toNumber(args[0]));
    if (name === 'log') return Math.log(toNumber(args[0]));
    if (name === 'exp') return Math.exp(toNumber(args[0]));
    if (name === 'floor') return floorToStep(args[0], args[1] ?? 1);
    if (name === 'ceil') return ceilToStep(args[0], args[1] ?? 1);
    if (name === 'round') return roundToStep(args[0], args[1] ?? 1);
    if (name === 'sum') return args.reduce((sum, value) => sum + toNumber(value), 0);
    if (name === 'if') return args.length < 2 ? 0 : Boolean(args[0]) ? args[1] : args[2] ?? 0;
    if (name === 'pos') return Math.max(0, toNumber(args[0]));
    throw new Error(`Unsupported function: ${name}`);
  }

  _evaluatePiece(node, state) {
    for (const arm of node.arms) {
      if (Boolean(this._evaluateNode(arm.condition, state))) {
        return this._evaluateNode(arm.value, state);
      }
    }
    return this._evaluateNode(node.otherwise, state);
  }

  _evaluateBrackets(node, state) {
    const income = toNumber(this._evaluateNode(node.income, state));
    if (!Number.isFinite(income) || income <= 0) return 0;
    return this._integrateArms(node.arms, income, state);
  }

  _integrateArms(arms, income, state, transformBound = (value) => value) {
    let total = 0;
    for (const arm of arms) {
      const lower = transformBound(this._evaluateNode(arm.lower, state));
      const upperValue = this._evaluateNode(arm.upper, state);
      const upper = upperValue === Infinity ? Infinity : transformBound(upperValue);
      if (!Number.isFinite(lower) || Number.isNaN(upper) || income <= lower) continue;
      const segmentUpper = Math.min(income, upper);
      if (segmentUpper <= lower) continue;
      total += integrateNumerically((x) =>
        toNumber(this._evaluateNode(arm.value, this._stateWithLocalX(state, x))),
      lower, segmentUpper);
      if (income <= upper) break;
    }
    return total;
  }

  _evaluateTaxableBrackets(node, state) {
    const income = toNumber(this._evaluateNode(node.income, state));
    const allowance = toNumber(this._evaluateNode(node.allowance, state));
    const allowanceBase = toNumber(this._evaluateNode(node.allowanceBase, state));
    const cap = Number.isFinite(allowanceBase) ? Math.max(0, allowanceBase) : Infinity;
    const taxableIncome = Math.max(0, income - allowance);
    if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) return 0;

    const allowanceAt = (grossIncome) => {
      if (!Number.isFinite(grossIncome)) return 0;
      const nextState = this._stateWithLocalX(state, grossIncome, true);
      const value = Math.max(0, toNumber(this._evaluateNode(node.allowance, nextState)));
      return Number.isFinite(cap) ? Math.min(value, cap) : value;
    };
    return this._integrateArms(
      node.arms,
      taxableIncome,
      state,
      (grossIncome) => grossIncome - allowanceAt(grossIncome)
    );
  }

  _stateWithLocalX(state, localIncome, recomputeBlock = false) {
    const safeIncome = Number.isFinite(Number(localIncome)) ? Number(localIncome) : 0;
    const scope = Object.create(state.scope || null);
    const nextState = { ...state, localIncome: safeIncome, scope };
    scope.x = safeIncome;
    if (recomputeBlock && state.block) {
      for (const statement of state.block.statements) {
        scope[statement.name] = this._evaluateNode(statement.value, nextState);
      }
    }
    return nextState;
  }
}

export function installEvaluationMethods(TargetClass) {
  const descriptors = Object.getOwnPropertyDescriptors(EvaluationMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(TargetClass.prototype, descriptors);
}
