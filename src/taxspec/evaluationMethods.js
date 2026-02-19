import {
  FIX_ABSOLUTE_TOLERANCE,
  FIX_MAX_BOUND,
  FIX_MAX_ITERATIONS,
  FIX_MIN_BOUND,
  FIX_RELATIVE_TOLERANCE,
  MIN_DERIVATIVE_STEP,
  ceilToStep,
  derivativeAt,
  floorToStep,
  integrateNumerically,
  normalizeIdentifier,
  parseStringLiteral,
  roundToStep,
  toNumber,
} from './shared.js';

class EvaluationMethods {
  _evaluateComponentMarginal(component, state) {
    return this._withComponentGuard(component, 'marginal', state, () => {
      const fastBracketPlan = this._getFastBracketPlan(component);
      if (fastBracketPlan) {
        return this._evaluateFastBracketMarginal(state, fastBracketPlan);
      }

      const fastPieceMarginalPlan = this._getFastPieceMarginalPlan(component);
      if (fastPieceMarginalPlan) {
        return this._evaluateFastPieceMarginal(state, fastPieceMarginalPlan);
      }

      return derivativeAt(
        (income) => this._evaluateComponentValueAtIncome(component, state, income),
        state.localIncome
      );
    });
  }

  _evaluateComponentTotal(component, state) {
    return this._withComponentGuard(component, 'total', state, () => {
      if (state.localIncome <= 0) return 0;

      const fastBracketPlan = this._getFastBracketPlan(component);
      if (fastBracketPlan) {
        return this._evaluateFastBracketTotal(state, fastBracketPlan);
      }

      const fastPieceValuePlan = this._getFastPieceValuePlan(component);
      if (fastPieceValuePlan) {
        return this._evaluateFastPieceValue(state, fastPieceValuePlan);
      }

      return this._evaluateComponentValueAtIncome(component, state, state.localIncome);
    });
  }

  _evaluateComponentMarginalAtIncome(component, state, localIncome) {
    const nextState = this._stateForCountryIncome(state, component.countryName, localIncome);
    return this._evaluateComponentMarginal(component, nextState);
  }

  _evaluateComponentValueAtIncome(component, state, localIncome) {
    const nextState = this._stateForCountryIncome(state, component.countryName, localIncome);

    const fastBracketPlan = this._getFastBracketPlan(component);
    if (fastBracketPlan) {
      return this._evaluateFastBracketTotal(nextState, fastBracketPlan);
    }

    const fastPieceValuePlan = this._getFastPieceValuePlan(component);
    if (fastPieceValuePlan) {
      return this._evaluateFastPieceValue(nextState, fastPieceValuePlan);
    }

    const compiledEvaluator = this._getCompiledComponentEvaluator(state.prepared, component);
    if (compiledEvaluator) {
      return compiledEvaluator(nextState);
    }

    if (component.bodyType === 'number') return component.constantValue;
    if (component.bodyType === 'expr') return this._evaluateExpr(component.bodyCtx, nextState);
    return this._evaluateBlock(component.bodyCtx, nextState);
  }

  _withComponentGuard(component, mode, state, callback) {
    const key = `${component.countryKey}:${component.id}:${mode}`;
    const localIncome = state.localIncome;

    let memoForKey = null;
    if (state.memo) {
      memoForKey = state.memo.get(key);
      if (!memoForKey) {
        memoForKey = new Map();
        state.memo.set(key, memoForKey);
      } else if (memoForKey.has(localIncome)) {
        return memoForKey.get(localIncome);
      }
    }

    if (state.callStack.has(key)) {
      throw new Error(
        `Circular component reference detected: ${component.countryName}.${component.kind}.${component.componentName}`
      );
    }

    state.callStack.add(key);
    try {
      const result = callback();
      if (memoForKey) memoForKey.set(localIncome, result);
      return result;
    } finally {
      state.callStack.delete(key);
    }
  }

  _stateForCountryIncome(state, countryName, localIncome) {
    const countryModel = this._resolveCountry(countryName);

    let convertedIncome = localIncome;
    if (state.countryModel.countryKey !== countryModel.countryKey) {
      convertedIncome = this._convertIncomeToCountry(
        localIncome,
        state.countryModel.currencyKey,
        countryModel.currencyKey
      );
    }

    return {
      ...state,
      countryModel,
      localIncome: convertedIncome,
      scope: this._createIncomeScope(convertedIncome),
    };
  }

  _evaluateBlock(blockCtx, state) {
    const scope = Object.create(state.scope || null);
    const blockState = { ...state, scope, blockStatements: blockCtx.stmt() };

    for (const stmt of blockCtx.stmt()) {
      const variableName = stmt.IDENT().getText();
      const value = this._evaluateExpr(stmt.expr(), blockState);
      scope[variableName] = value;
    }

    return this._evaluateExpr(blockCtx.expr(), blockState);
  }

  _evaluateExpr(exprCtx, state) {
    return this._evaluateOrExpr(exprCtx.orExpr(), state);
  }

  _evaluateOrExpr(orCtx, state) {
    const terms = orCtx.andExpr();
    let result = this._evaluateAndExpr(terms[0], state);

    for (let index = 1; index < terms.length; index += 1) {
      result = Boolean(result) || Boolean(this._evaluateAndExpr(terms[index], state));
    }
    return result;
  }

  _evaluateAndExpr(andCtx, state) {
    const terms = andCtx.notExpr();
    let result = this._evaluateNotExpr(terms[0], state);

    for (let index = 1; index < terms.length; index += 1) {
      result = Boolean(result) && Boolean(this._evaluateNotExpr(terms[index], state));
    }
    return result;
  }

  _evaluateNotExpr(notCtx, state) {
    if (notCtx.NOT()) return !Boolean(this._evaluateNotExpr(notCtx.notExpr(), state));
    return this._evaluateCmpExpr(notCtx.cmpExpr(), state);
  }

  _evaluateCmpExpr(cmpCtx, state) {
    const left = this._evaluateAddExpr(cmpCtx.addExpr(0), state);
    const rightCtx = cmpCtx.addExpr(1);
    if (!rightCtx) return left;

    const right = this._evaluateAddExpr(rightCtx, state);
    const leftNumber = toNumber(left);
    const rightNumber = toNumber(right);

    if (cmpCtx.LT()) return leftNumber < rightNumber;
    if (cmpCtx.LE()) return leftNumber <= rightNumber;
    if (cmpCtx.GT()) return leftNumber > rightNumber;
    if (cmpCtx.GE()) return leftNumber >= rightNumber;
    if (cmpCtx.EQEQ()) return leftNumber === rightNumber;
    if (cmpCtx.NEQ()) return leftNumber !== rightNumber;

    return false;
  }

  _evaluateAddExpr(addCtx, state) {
    const terms = addCtx.mulExpr();
    let result = toNumber(this._evaluateMulExpr(terms[0], state));

    for (let index = 1; index < terms.length; index += 1) {
      const operator = addCtx.getChild(index * 2 - 1).getText();
      const right = toNumber(this._evaluateMulExpr(terms[index], state));
      result = operator === '+' ? result + right : result - right;
    }
    return result;
  }

  _evaluateMulExpr(mulCtx, state) {
    const terms = mulCtx.powExpr();
    let result = toNumber(this._evaluatePowExpr(terms[0], state));

    for (let index = 1; index < terms.length; index += 1) {
      const operator = mulCtx.getChild(index * 2 - 1).getText();
      const right = toNumber(this._evaluatePowExpr(terms[index], state));
      result = operator === '*' ? result * right : result / right;
    }
    return result;
  }

  _evaluatePowExpr(powCtx, state) {
    const left = toNumber(this._evaluateUnaryExpr(powCtx.unaryExpr(), state));
    if (!powCtx.POW()) return left;

    const right = toNumber(this._evaluatePowExpr(powCtx.powExpr(), state));
    return left ** right;
  }

  _evaluateUnaryExpr(unaryCtx, state) {
    if (unaryCtx.primary()) return this._evaluatePrimary(unaryCtx.primary(), state);
    const value = toNumber(this._evaluateUnaryExpr(unaryCtx.unaryExpr(), state));
    return unaryCtx.SUB() ? -value : value;
  }

  _evaluatePrimary(primaryCtx, state) {
    if (primaryCtx.NUMBER()) return Number(primaryCtx.NUMBER().getText());
    if (primaryCtx.INF()) return Infinity;

    // TRUE/FALSE are tokens in the new grammar
    if (primaryCtx.TRUE && primaryCtx.TRUE()) return true;
    if (primaryCtx.FALSE && primaryCtx.FALSE()) return false;

    if (primaryCtx.IDENT()) return this._resolveIdentifier(primaryCtx.IDENT().getText(), state);
    if (primaryCtx.STRING()) return parseStringLiteral(primaryCtx.STRING().getText());
    if (primaryCtx.expr()) return this._evaluateExpr(primaryCtx.expr(), state);

    // New grammar forms (you may implement eval/fix later)
    if (primaryCtx.refCall && primaryCtx.refCall()) {
      return this._evaluateRefCall(primaryCtx.refCall(), state);
    }
    if (primaryCtx.evalCall && primaryCtx.evalCall()) {
      return this._evaluateEvalCall(primaryCtx.evalCall(), state);
    }
    if (primaryCtx.fixCall && primaryCtx.fixCall()) {
      return this._evaluateFixCall(primaryCtx.fixCall(), state);
    }

    if (primaryCtx.funcCall()) return this._evaluateFuncCall(primaryCtx.funcCall(), state);
    if (primaryCtx.pieceExpr()) return this._evaluatePieceExpr(primaryCtx.pieceExpr(), state);
    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) {
      return this._evaluateBracketsTaxableExpr(primaryCtx.bracketsTaxableExpr(), state);
    }
    if (primaryCtx.scheduleExpr()) return this._evaluateScheduleExpr(primaryCtx.scheduleExpr(), state);

    return 0;
  }

  _resolveIdentifier(identifier, state) {
    if (state.scope && identifier in state.scope) return state.scope[identifier];

    if (identifier === 'x') return state.localIncome;

    throw new Error(`Unknown identifier: ${identifier}`);
  }

  // refCall : TOTAL '(' nameRef ')'
  _evaluateRefCall(refCallCtx, state) {
    const refPath = refCallCtx.nameRef().IDENT().map((tok) => tok.getText());
    const component = this._resolveReference(refPath, state);
    const refState = this._stateForCountryIncome(state, component.countryName, state.localIncome);
    return this._evaluateComponentTotal(component, refState);
  }

  // evalCall : EVAL '(' nameRef ',' expr ')'
  _evaluateEvalCall(evalCallCtx, state) {
    const refPath = evalCallCtx.nameRef().IDENT().map((tok) => tok.getText());
    const component = this._resolveReference(refPath, state);
    const incomeValue = toNumber(this._evaluateExpr(evalCallCtx.expr(), state));
    const safeIncome = Number.isFinite(incomeValue) ? incomeValue : 0;
    return this._evaluateComponentValueAtIncome(component, state, safeIncome);
  }

  // fixCall : FIX '(' expr ',' expr ')'
  // The second expression is evaluated repeatedly with `k` bound to the current iterate.
  _evaluateFixCall(fixCallCtx, state) {
    const initValue = toNumber(this._evaluateExpr(fixCallCtx.expr(0), state));
    const updateExprCtx = fixCallCtx.expr(1);
    const scope = Object.create(state.scope || null);
    const fixState = { ...state, scope };

    let current = this._clampFixValue(initValue);
    scope.k = current;

    for (let iter = 0; iter < FIX_MAX_ITERATIONS; iter += 1) {
      scope.k = current;
      const nextRaw = this._evaluateExpr(updateExprCtx, fixState);
      const next = this._clampFixValue(toNumber(nextRaw, current));

      const delta = Math.abs(next - current);
      const scale = Math.max(Math.abs(current), Math.abs(next), 1);
      if (delta <= FIX_ABSOLUTE_TOLERANCE + FIX_RELATIVE_TOLERANCE * scale) {
        return next;
      }

      current = next;
    }

    return current;
  }

  _clampFixValue(value) {
    const numeric = Number.isFinite(value) ? value : 0;
    return Math.min(FIX_MAX_BOUND, Math.max(FIX_MIN_BOUND, numeric));
  }

  // funcCall : IDENT '(' (expr (',' expr)*)? ')'
  _evaluateFuncCall(funcCtx, state) {
    const functionName = normalizeIdentifier(funcCtx.IDENT().getText());
    const exprList = funcCtx.expr ? funcCtx.expr() : [];
    const args = exprList.map((exprCtx) => this._evaluateExpr(exprCtx, state));
    return this._invokeNumericFunction(functionName, args, state);
  }

  _resolveReference(refPath, state) {
    const normalized = refPath.map((segment) => normalizeIdentifier(segment));

    // Allowed shapes (flexible):
    // 1) Name
    // 2) Kind.Name
    // 2) Country.Name
    // 3) Country.Kind.Name
    if (normalized.length === 1) {
      const [name] = normalized;
      const matches = state.countryModel.byName.get(name) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Ambiguous reference: ${refPath.join('.')}`);
      throw new Error(`Unknown reference: ${refPath.join('.')}`);
    }

    if (normalized.length === 2) {
      const [a, b] = normalized;

      // Try Kind.Name in current country
      const kindName = state.countryModel.byKindAndName.get(`${a}:${b}`);
      if (kindName) return kindName;

      // Try Country.Name
      const countryModel = this.modelByCountry.get(a);
      if (countryModel) {
        const matches = countryModel.byName.get(b) || [];
        if (matches.length === 1) return matches[0];
        if (matches.length > 1) throw new Error(`Ambiguous reference: ${refPath.join('.')}`);
      }

      throw new Error(`Unknown reference: ${refPath.join('.')}`);
    }

    if (normalized.length === 3) {
      const [countryKey, kindKey, nameKey] = normalized;
      const countryModel = this.modelByCountry.get(countryKey);
      if (!countryModel) throw new Error(`Unknown country in reference: ${refPath.join('.')}`);

      const component = countryModel.byKindAndName.get(`${kindKey}:${nameKey}`);
      if (!component) throw new Error(`Unknown component reference: ${refPath.join('.')}`);
      return component;
    }

    throw new Error(`Unsupported reference shape: ${refPath.join('.')}`);
  }

  _invokeNumericFunction(functionName, args, state) {
    if (functionName === 'min') return Math.min(...args.map((v) => toNumber(v)));
    if (functionName === 'max') return Math.max(...args.map((v) => toNumber(v)));
    if (functionName === 'abs') return Math.abs(toNumber(args[0]));
    if (functionName === 'pow') return toNumber(args[0]) ** toNumber(args[1]);
    if (functionName === 'sqrt') return Math.sqrt(toNumber(args[0]));
    if (functionName === 'log') return Math.log(toNumber(args[0]));
    if (functionName === 'exp') return Math.exp(toNumber(args[0]));

    // Increment-aware rounding
    if (functionName === 'floor') return floorToStep(args[0], args[1] ?? 1);
    if (functionName === 'ceil') return ceilToStep(args[0], args[1] ?? 1);
    if (functionName === 'round') return roundToStep(args[0], args[1] ?? 1);

    if (functionName === 'sum') return args.reduce((s, v) => s + toNumber(v), 0);

    if (functionName === 'if') {
      if (args.length < 2) return 0;
      return Boolean(args[0]) ? args[1] : args[2] ?? 0;
    }

    // New primitives used heavily in tax specs
    if (functionName === 'pos') return Math.max(0, toNumber(args[0]));

    throw new Error(`Unsupported function: ${functionName}`);
  }

  _getFastBracketPlan(component) {
    if (component.fastBracketPlanResolved) return component.fastBracketPlan;
    component.fastBracketPlan = this._buildFastBracketPlan(component);
    component.fastBracketPlanResolved = true;
    return component.fastBracketPlan;
  }

  _getFastPieceValuePlan(component) {
    if (component.fastPieceValuePlanResolved) return component.fastPieceValuePlan;
    component.fastPieceValuePlan = this._buildFastPieceValuePlan(component);
    component.fastPieceValuePlanResolved = true;
    return component.fastPieceValuePlan;
  }

  _getFastPieceMarginalPlan(component) {
    if (component.fastPieceMarginalPlanResolved) return component.fastPieceMarginalPlan;
    component.fastPieceMarginalPlan = this._buildFastPieceMarginalPlan(component);
    component.fastPieceMarginalPlanResolved = true;
    return component.fastPieceMarginalPlan;
  }

  _buildFastBracketPlan(component) {
    if (component.wrapperKind !== 't' || component.bodyType !== 'block') return null;

    const blockCtx = component.bodyCtx;
    const statements = blockCtx?.stmt ? blockCtx.stmt() : [];
    if (statements.length > 0) return null;

    const scheduleCtx = this._extractDirectScheduleExpr(blockCtx?.expr?.());
    const isTotalBandSchedule = scheduleCtx && scheduleCtx.BRACKETS && scheduleCtx.BRACKETS();
    if (!isTotalBandSchedule) return null;
    if (!this._isDirectIncomeSelector(scheduleCtx.expr())) return null;

    const literalArms = [];
    for (const rangeArm of scheduleCtx.rangeArm()) {
      const rangeCtx = rangeArm.range();
      const lower = this._extractNumericBoundLiteral(rangeCtx.bound(0));
      const upper = this._extractNumericBoundLiteral(rangeCtx.bound(1));
      const rate = this._extractNumericLiteral(rangeArm.expr());

      if (lower === null || upper === null || rate === null) return null;
      if (!Number.isFinite(lower)) return null;
      if (!(upper === Infinity || Number.isFinite(upper))) return null;
      if (upper !== Infinity && upper <= lower) return null;

      literalArms.push({ lower, upper, rate });
    }

    if (literalArms.length === 0) return null;

    // Closed-form emission assumes source-order canonical non-overlapping intervals.
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
      arms,
      finalTotal: cumulativeTax,
      hasGaps,
    };
  }

  _evaluateFastBracketMarginal(state, fastBracketPlan) {
    const income = toNumber(state.localIncome);
    if (!Number.isFinite(income) || income < 0) return 0;

    const leftIncome = income > 0 ? Math.max(0, income - MIN_DERIVATIVE_STEP) : 0;
    for (const arm of fastBracketPlan.arms) {
      if (leftIncome < arm.upper) {
        if (fastBracketPlan.hasGaps && leftIncome < arm.lower) return 0;
        return arm.rate;
      }
    }
    return 0;
  }

  _evaluateFastBracketTotal(state, fastBracketPlan) {
    const selector = toNumber(state.localIncome);
    if (!Number.isFinite(selector) || selector <= 0) return 0;

    for (const arm of fastBracketPlan.arms) {
      if (selector <= arm.upper) {
        if (fastBracketPlan.hasGaps && selector <= arm.lower) return arm.baseAtLower;
        return arm.baseAtLower + (selector - arm.lower) * arm.rate;
      }
    }

    return fastBracketPlan.finalTotal;
  }

  _evaluateFastPieceMarginal(state, fastPieceMarginalPlan) {
    const income = toNumber(state.localIncome);
    if (!Number.isFinite(income) || income < 0) return 0;

    const leftIncome = income > 0 ? Math.max(0, income - MIN_DERIVATIVE_STEP) : 0;
    for (const arm of fastPieceMarginalPlan.arms) {
      if (arm.inclusive ? leftIncome <= arm.threshold : leftIncome < arm.threshold) {
        return arm.slope;
      }
    }
    return fastPieceMarginalPlan.elseSlope;
  }

  _evaluateFastPieceValue(state, fastPieceValuePlan) {
    const income = toNumber(state.localIncome);
    if (!Number.isFinite(income)) return 0;

    for (const arm of fastPieceValuePlan.arms) {
      if (arm.inclusive ? income <= arm.threshold : income < arm.threshold) {
        return arm.a * income + arm.b;
      }
    }

    return fastPieceValuePlan.elseA * income + fastPieceValuePlan.elseB;
  }

  _extractDirectScheduleExpr(exprCtx) {
    const primaryCtx = this._extractDirectPrimary(exprCtx);
    if (!primaryCtx) return null;
    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) return primaryCtx.scheduleExpr();
    if (primaryCtx.expr && primaryCtx.expr()) return this._extractDirectScheduleExpr(primaryCtx.expr());
    return null;
  }

  _extractDirectPrimary(exprCtx) {
    if (!exprCtx || !exprCtx.orExpr) return null;
    const orCtx = exprCtx.orExpr();
    const andTerms = orCtx.andExpr();
    if (!andTerms || andTerms.length !== 1) return null;

    const andCtx = andTerms[0];
    const notTerms = andCtx.notExpr();
    if (!notTerms || notTerms.length !== 1) return null;

    const notCtx = notTerms[0];
    if (notCtx.NOT && notCtx.NOT()) return null;

    const cmpCtx = notCtx.cmpExpr();
    if (!cmpCtx) return null;
    if (cmpCtx.addExpr(1)) return null;

    const addCtx = cmpCtx.addExpr(0);
    const mulTerms = addCtx.mulExpr();
    if (!mulTerms || mulTerms.length !== 1) return null;

    const mulCtx = mulTerms[0];
    const powTerms = mulCtx.powExpr();
    if (!powTerms || powTerms.length !== 1) return null;

    const powCtx = powTerms[0];
    if (powCtx.POW && powCtx.POW()) return null;

    const unaryCtx = powCtx.unaryExpr();
    if (!unaryCtx || !unaryCtx.primary || !unaryCtx.primary()) return null;

    return unaryCtx.primary();
  }

  _isDirectIncomeSelector(exprCtx) {
    const identifier = this._extractDirectIdentifier(exprCtx);
    return identifier === 'x';
  }

  _extractDirectIdentifier(exprCtx) {
    const primaryCtx = this._extractDirectPrimary(exprCtx);
    if (!primaryCtx) return null;

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      return normalizeIdentifier(primaryCtx.IDENT().getText());
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._extractDirectIdentifier(primaryCtx.expr());
    }

    return null;
  }

  _extractNumericBoundLiteral(boundCtx) {
    if (!boundCtx) return null;
    if (boundCtx.INF && boundCtx.INF()) return Infinity;
    return this._extractNumericLiteral(boundCtx.expr ? boundCtx.expr() : null);
  }

  _extractNumericLiteral(exprCtx) {
    if (!exprCtx || !exprCtx.getText) return null;
    const text = exprCtx.getText();
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) return null;
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : null;
  }

  _buildFastPieceMarginalPlan(component) {
    const valuePlan = this._getFastPieceValuePlan(component);
    if (!valuePlan) return null;
    return {
      arms: valuePlan.arms.map((arm) => ({
        threshold: arm.threshold,
        inclusive: arm.inclusive,
        slope: arm.a,
      })),
      elseSlope: valuePlan.elseA,
    };
  }

  _buildFastPieceValuePlan(component) {
    if (component.wrapperKind !== 't' || component.bodyType !== 'block') return null;

    const blockCtx = component.bodyCtx;
    const statements = blockCtx?.stmt ? blockCtx.stmt() : [];
    if (statements.length > 0) return null;

    const pieceCtx = this._extractDirectPieceExpr(blockCtx?.expr?.());
    if (!pieceCtx) return null;

    const arms = [];
    for (const pieceArmCtx of pieceCtx.pieceArm()) {
      const conditionExprCtx = pieceArmCtx.expr(0);
      const valueExprCtx = pieceArmCtx.expr(1);

      const thresholdCondition = this._extractSimpleUpperBoundCondition(conditionExprCtx);
      if (!thresholdCondition) return null;

      const affine = this._extractAffineExpr(valueExprCtx);
      if (!affine) return null;

      arms.push({
        threshold: thresholdCondition.threshold,
        inclusive: thresholdCondition.inclusive,
        a: affine.a,
        b: affine.b,
      });
    }

    let elseA = 0;
    let elseB = 0;
    if (pieceCtx.expr && pieceCtx.expr()) {
      const elseAffine = this._extractAffineExpr(pieceCtx.expr());
      if (!elseAffine) return null;
      elseA = elseAffine.a;
      elseB = elseAffine.b;
    }

    return { arms, elseA, elseB };
  }

  _extractDirectPieceExpr(exprCtx) {
    const primaryCtx = this._extractDirectPrimary(exprCtx);
    if (!primaryCtx) return null;
    if (primaryCtx.pieceExpr && primaryCtx.pieceExpr()) return primaryCtx.pieceExpr();
    if (primaryCtx.expr && primaryCtx.expr()) return this._extractDirectPieceExpr(primaryCtx.expr());
    return null;
  }

  _extractSimpleUpperBoundCondition(exprCtx) {
    if (!exprCtx || !exprCtx.getText) return null;
    const text = exprCtx.getText();

    const leftIdentifierPattern = /^(x)(<=|<)([+-]?\d+(?:\.\d+)?)$/i;
    const rightIdentifierPattern = /^([+-]?\d+(?:\.\d+)?)(>=|>)(x)$/i;

    let match = text.match(leftIdentifierPattern);
    if (match) {
      const threshold = Number(match[3]);
      if (!Number.isFinite(threshold)) return null;
      return {
        threshold,
        inclusive: match[2] === '<=',
      };
    }

    match = text.match(rightIdentifierPattern);
    if (match) {
      const threshold = Number(match[1]);
      if (!Number.isFinite(threshold)) return null;
      return {
        threshold,
        inclusive: match[2] === '>=',
      };
    }

    return null;
  }

  _extractAffineExpr(exprCtx) {
    if (!exprCtx?.orExpr) return null;
    return this._extractAffineFromOrExpr(exprCtx.orExpr());
  }

  _extractAffineFromOrExpr(orCtx) {
    const terms = orCtx.andExpr();
    if (!terms || terms.length !== 1) return null;
    return this._extractAffineFromAndExpr(terms[0]);
  }

  _extractAffineFromAndExpr(andCtx) {
    const terms = andCtx.notExpr();
    if (!terms || terms.length !== 1) return null;
    return this._extractAffineFromNotExpr(terms[0]);
  }

  _extractAffineFromNotExpr(notCtx) {
    if (notCtx.NOT && notCtx.NOT()) return null;
    return this._extractAffineFromCmpExpr(notCtx.cmpExpr());
  }

  _extractAffineFromCmpExpr(cmpCtx) {
    if (!cmpCtx || cmpCtx.addExpr(1)) return null;
    return this._extractAffineFromAddExpr(cmpCtx.addExpr(0));
  }

  _extractAffineFromAddExpr(addCtx) {
    const terms = addCtx.mulExpr();
    if (!terms || terms.length === 0) return null;

    let result = this._extractAffineFromMulExpr(terms[0]);
    if (!result) return null;

    for (let index = 1; index < terms.length; index += 1) {
      const op = addCtx.getChild(index * 2 - 1).getText();
      const right = this._extractAffineFromMulExpr(terms[index]);
      if (!right) return null;
      result = op === '+'
        ? { a: result.a + right.a, b: result.b + right.b }
        : { a: result.a - right.a, b: result.b - right.b };
    }

    return result;
  }

  _extractAffineFromMulExpr(mulCtx) {
    const terms = mulCtx.powExpr();
    if (!terms || terms.length === 0) return null;

    let result = this._extractAffineFromPowExpr(terms[0]);
    if (!result) return null;

    for (let index = 1; index < terms.length; index += 1) {
      const op = mulCtx.getChild(index * 2 - 1).getText();
      const right = this._extractAffineFromPowExpr(terms[index]);
      if (!right) return null;

      if (op === '*') {
        const multiplied = this._multiplyAffine(result, right);
        if (!multiplied) return null;
        result = multiplied;
      } else {
        if (Math.abs(right.a) > 0) return null;
        if (right.b === 0) return null;
        result = {
          a: result.a / right.b,
          b: result.b / right.b,
        };
      }
    }

    return result;
  }

  _extractAffineFromPowExpr(powCtx) {
    if (!powCtx || (powCtx.POW && powCtx.POW())) return null;
    return this._extractAffineFromUnaryExpr(powCtx.unaryExpr());
  }

  _extractAffineFromUnaryExpr(unaryCtx) {
    if (!unaryCtx) return null;

    if (unaryCtx.primary && unaryCtx.primary()) {
      return this._extractAffineFromPrimary(unaryCtx.primary());
    }

    const nested = this._extractAffineFromUnaryExpr(unaryCtx.unaryExpr());
    if (!nested) return null;

    if (unaryCtx.SUB && unaryCtx.SUB()) {
      return { a: -nested.a, b: -nested.b };
    }
    return nested;
  }

  _extractAffineFromPrimary(primaryCtx) {
    if (!primaryCtx) return null;

    if (primaryCtx.NUMBER && primaryCtx.NUMBER()) {
      const value = Number(primaryCtx.NUMBER().getText());
      if (!Number.isFinite(value)) return null;
      return { a: 0, b: value };
    }

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      const identifier = normalizeIdentifier(primaryCtx.IDENT().getText());
      if (identifier === 'x') {
        return { a: 1, b: 0 };
      }
      return null;
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._extractAffineExpr(primaryCtx.expr());
    }

    return null;
  }

  _multiplyAffine(left, right) {
    const leftHasX = Math.abs(left.a) > 0;
    const rightHasX = Math.abs(right.a) > 0;
    if (leftHasX && rightHasX) return null;

    if (!leftHasX) {
      return {
        a: left.b * right.a,
        b: left.b * right.b,
      };
    }

    return {
      a: right.b * left.a,
      b: right.b * left.b,
    };
  }

  _evaluatePieceExpr(pieceCtx, state) {
    for (const arm of pieceCtx.pieceArm()) {
      const condition = arm.expr(0);
      const value = arm.expr(1);
      if (Boolean(this._evaluateExpr(condition, state))) {
        return this._evaluateExpr(value, state);
      }
    }

    // In the relaxed grammar, else is optional:
    // piece { ... (else: expr)? }
    if (pieceCtx.expr && pieceCtx.expr()) {
      return this._evaluateExpr(pieceCtx.expr(), state);
    }

    return 0;
  }

  _evaluateScheduleExpr(scheduleCtx, state) {
    // scheduleExpr : BRACKETS '(' expr ';'? rangeArm+ ')'
    const selector = toNumber(this._evaluateExpr(scheduleCtx.expr(), state));
    if (!Number.isFinite(selector) || selector <= 0) {
      return 0;
    }

    let total = 0;
    for (const rangeArm of scheduleCtx.rangeArm()) {
      const lowerBound = this._evaluateBound(rangeArm.range().bound(0), state);
      const upperBound = this._evaluateBound(rangeArm.range().bound(1), state);

      // Allow open-ended upper bounds like [190000..inf].
      if (!Number.isFinite(lowerBound) || Number.isNaN(upperBound)) {
        continue;
      }

      if (selector <= lowerBound) {
        continue;
      }

      const segmentUpper = Math.min(selector, upperBound);
      if (segmentUpper <= lowerBound) {
        continue;
      }

      total += integrateNumerically((xPoint) => {
        const xState = this._stateWithLocalX(state, xPoint);
        return toNumber(this._evaluateExpr(rangeArm.expr(), xState));
      }, lowerBound, segmentUpper);

      if (selector <= upperBound) {
        break;
      }
    }

    return total;
  }

  _evaluateBracketsTaxableExpr(bracketsTaxableCtx, state) {
    const evaluateIncome = (nextState) => this._evaluateExpr(bracketsTaxableCtx.expr(0), nextState);
    const evaluateAllowance = (nextState) => this._evaluateExpr(bracketsTaxableCtx.expr(1), nextState);
    const evaluateAllowanceBase = (nextState) => this._evaluateExpr(bracketsTaxableCtx.expr(2), nextState);
    const armEvaluators = bracketsTaxableCtx.rangeArm().map((rangeArmCtx) => ({
      evaluateLowerBound: (nextState) => this._evaluateBound(rangeArmCtx.range().bound(0), nextState),
      evaluateUpperBound: (nextState) => this._evaluateBound(rangeArmCtx.range().bound(1), nextState),
      evaluateValue: (nextState) => this._evaluateExpr(rangeArmCtx.expr(), nextState),
    }));

    return this._evaluateBracketsTaxableWithEvaluators(
      state,
      evaluateIncome,
      evaluateAllowance,
      evaluateAllowanceBase,
      armEvaluators
    );
  }

  _evaluateBracketsTaxableWithEvaluators(
    state,
    evaluateIncome,
    evaluateAllowance,
    evaluateAllowanceBase,
    armEvaluators
  ) {
    const income = toNumber(evaluateIncome(state));
    const allowance = toNumber(evaluateAllowance(state));
    const allowanceBase = toNumber(evaluateAllowanceBase(state));
    const allowanceCap = Number.isFinite(allowanceBase) ? Math.max(0, allowanceBase) : Infinity;
    const selector = Math.max(0, income - allowance);

    if (!Number.isFinite(selector) || selector <= 0) {
      return 0;
    }

    const allowanceByGrossIncome = new Map();
    const allowanceAtGrossIncome = (grossIncome) => {
      if (grossIncome === Infinity) return 0;
      const numericGrossIncome = toNumber(grossIncome);
      if (!Number.isFinite(numericGrossIncome)) return 0;
      if (allowanceByGrossIncome.has(numericGrossIncome)) {
        return allowanceByGrossIncome.get(numericGrossIncome);
      }
      const allowanceAtIncome = this._evaluateBracketsTaxableAllowanceAtIncome(
        evaluateAllowance,
        state,
        numericGrossIncome,
        allowanceCap
      );
      allowanceByGrossIncome.set(numericGrossIncome, allowanceAtIncome);
      return allowanceAtIncome;
    };

    let total = 0;
    for (const arm of armEvaluators) {
      const lowerGross = toNumber(arm.evaluateLowerBound(state));
      const rawUpperGross = arm.evaluateUpperBound(state);
      const upperGross = rawUpperGross === Infinity ? Infinity : toNumber(rawUpperGross);

      const lowerBound = lowerGross - allowanceAtGrossIncome(lowerGross);
      const upperBound = upperGross === Infinity ? Infinity : upperGross - allowanceAtGrossIncome(upperGross);

      if (!Number.isFinite(lowerBound) || Number.isNaN(upperBound)) {
        continue;
      }
      if (selector <= lowerBound) {
        continue;
      }

      const segmentUpper = Math.min(selector, upperBound);
      if (segmentUpper <= lowerBound) {
        continue;
      }

      total += integrateNumerically((xPoint) => {
        const xState = this._stateWithLocalX(state, xPoint);
        return toNumber(arm.evaluateValue(xState));
      }, lowerBound, segmentUpper);

      if (selector <= upperBound) {
        break;
      }
    }

    return total;
  }

  _evaluateBracketsTaxableAllowanceAtIncome(evaluateAllowance, state, localIncome, allowanceCap) {
    if (!Number.isFinite(localIncome)) return 0;
    const boundState = this._stateWithLocalXAndRecomputedBlockLocals(state, localIncome);
    const allowanceRaw = toNumber(evaluateAllowance(boundState));
    if (!Number.isFinite(allowanceRaw)) return 0;
    const nonNegativeAllowance = Math.max(0, allowanceRaw);
    if (!Number.isFinite(allowanceCap)) return nonNegativeAllowance;
    return Math.min(nonNegativeAllowance, allowanceCap);
  }

  _stateWithLocalX(state, localIncome) {
    const numeric = Number(localIncome);
    const safeIncome = Number.isFinite(numeric) ? numeric : 0;
    const scope = Object.create(state.scope || null);
    scope.x = safeIncome;
    return {
      ...state,
      localIncome: safeIncome,
      scope,
    };
  }

  _stateWithLocalXAndRecomputedBlockLocals(state, localIncome) {
    const numeric = Number(localIncome);
    const safeIncome = Number.isFinite(numeric) ? numeric : 0;
    const scope = Object.create(state.scope || null);
    const nextState = {
      ...state,
      localIncome: safeIncome,
      scope,
    };
    scope.x = safeIncome;

    if (state.blockStatements) {
      for (const stmt of state.blockStatements) {
        const variableName = stmt.IDENT().getText();
        scope[variableName] = this._evaluateExpr(stmt.expr(), nextState);
      }
    } else if (state.compiledBlockStatements) {
      for (const statement of state.compiledBlockStatements) {
        scope[statement.variableName] = statement.evaluate(nextState);
      }
    }

    return nextState;
  }

  _evaluateBound(boundCtx, state) {
    if (boundCtx.INF()) return Infinity;
    return toNumber(this._evaluateExpr(boundCtx.expr(), state));
  }
}

export function installEvaluationMethods(TargetClass) {
  const descriptors = Object.getOwnPropertyDescriptors(EvaluationMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(TargetClass.prototype, descriptors);
}
