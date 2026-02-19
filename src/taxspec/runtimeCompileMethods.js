import {
  FIX_ABSOLUTE_TOLERANCE,
  FIX_MAX_ITERATIONS,
  FIX_RELATIVE_TOLERANCE,
  integrateNumerically,
  normalizeIdentifier,
  parseStringLiteral,
  toNumber,
} from './shared.js';

class RuntimeCompileMethods {
  _initializeCompiledPrepared(prepared) {
    if (prepared.compiled) return;
    prepared.compiled = {
      componentValueByKey: new Map(),
    };
  }

  _compilePreparedCountryComponents(prepared, countryModel) {
    for (const component of countryModel.components) {
      this._getCompiledComponentEvaluator(prepared, component);
    }
  }

  _getCompiledComponentEvaluator(prepared, component) {
    if (!prepared?.compiled) return null;

    const key = `${component.countryKey}:${component.id}`;
    if (prepared.compiled.componentValueByKey.has(key)) {
      return prepared.compiled.componentValueByKey.get(key);
    }

    const evaluator = this._compileComponentValueEvaluator(prepared, component);
    prepared.compiled.componentValueByKey.set(key, evaluator);
    return evaluator;
  }

  _compileComponentValueEvaluator(prepared, component) {
    if (component.bodyType === 'number') {
      const constant = component.constantValue;
      return () => constant;
    }

    if (component.bodyType === 'expr') {
      const evaluateExpr = this._compileRuntimeExpr(component.bodyCtx, prepared);
      return (state) => evaluateExpr(state);
    }

    const blockCtx = component.bodyCtx;
    const statementEvaluators = blockCtx.stmt().map((stmtCtx) => ({
      variableName: stmtCtx.IDENT().getText(),
      evaluate: this._compileRuntimeExpr(stmtCtx.expr(), prepared),
    }));
    const evaluateResult = this._compileRuntimeExpr(blockCtx.expr(), prepared);

    return (state) => {
      const scope = Object.create(state.scope || null);
      const blockState = { ...state, scope, compiledBlockStatements: statementEvaluators };
      for (const statement of statementEvaluators) {
        scope[statement.variableName] = statement.evaluate(blockState);
      }
      return evaluateResult(blockState);
    };
  }

  _compileRuntimeExpr(exprCtx, prepared) {
    return this._compileRuntimeOrExpr(exprCtx.orExpr(), prepared);
  }

  _compileRuntimeOrExpr(orCtx, prepared) {
    const termEvaluators = orCtx.andExpr().map((termCtx) => this._compileRuntimeAndExpr(termCtx, prepared));
    if (termEvaluators.length === 1) return termEvaluators[0];

    return (state) => {
      let result = termEvaluators[0](state);
      for (let index = 1; index < termEvaluators.length; index += 1) {
        result = Boolean(result) || Boolean(termEvaluators[index](state));
      }
      return result;
    };
  }

  _compileRuntimeAndExpr(andCtx, prepared) {
    const termEvaluators = andCtx.notExpr().map((termCtx) => this._compileRuntimeNotExpr(termCtx, prepared));
    if (termEvaluators.length === 1) return termEvaluators[0];

    return (state) => {
      let result = termEvaluators[0](state);
      for (let index = 1; index < termEvaluators.length; index += 1) {
        result = Boolean(result) && Boolean(termEvaluators[index](state));
      }
      return result;
    };
  }

  _compileRuntimeNotExpr(notCtx, prepared) {
    if (notCtx.NOT && notCtx.NOT()) {
      const evaluateNested = this._compileRuntimeNotExpr(notCtx.notExpr(), prepared);
      return (state) => !Boolean(evaluateNested(state));
    }
    return this._compileRuntimeCmpExpr(notCtx.cmpExpr(), prepared);
  }

  _compileRuntimeCmpExpr(cmpCtx, prepared) {
    const evaluateLeft = this._compileRuntimeAddExpr(cmpCtx.addExpr(0), prepared);
    const rightCtx = cmpCtx.addExpr(1);
    if (!rightCtx) return evaluateLeft;

    const evaluateRight = this._compileRuntimeAddExpr(rightCtx, prepared);
    const operator = cmpCtx.LT()
      ? 'lt'
      : cmpCtx.LE()
        ? 'le'
        : cmpCtx.GT()
          ? 'gt'
          : cmpCtx.GE()
            ? 'ge'
            : cmpCtx.EQEQ()
              ? 'eq'
              : 'ne';

    return (state) => {
      const leftValue = toNumber(evaluateLeft(state));
      const rightValue = toNumber(evaluateRight(state));
      if (operator === 'lt') return leftValue < rightValue;
      if (operator === 'le') return leftValue <= rightValue;
      if (operator === 'gt') return leftValue > rightValue;
      if (operator === 'ge') return leftValue >= rightValue;
      if (operator === 'eq') return leftValue === rightValue;
      return leftValue !== rightValue;
    };
  }

  _compileRuntimeAddExpr(addCtx, prepared) {
    const termEvaluators = addCtx.mulExpr().map((termCtx) => this._compileRuntimeMulExpr(termCtx, prepared));
    if (termEvaluators.length === 1) {
      return (state) => toNumber(termEvaluators[0](state));
    }

    const operators = [];
    for (let index = 1; index < termEvaluators.length; index += 1) {
      operators.push(addCtx.getChild(index * 2 - 1).getText());
    }

    return (state) => {
      let result = toNumber(termEvaluators[0](state));
      for (let index = 1; index < termEvaluators.length; index += 1) {
        const right = toNumber(termEvaluators[index](state));
        result = operators[index - 1] === '+' ? result + right : result - right;
      }
      return result;
    };
  }

  _compileRuntimeMulExpr(mulCtx, prepared) {
    const termEvaluators = mulCtx.powExpr().map((termCtx) => this._compileRuntimePowExpr(termCtx, prepared));
    if (termEvaluators.length === 1) {
      return (state) => toNumber(termEvaluators[0](state));
    }

    const operators = [];
    for (let index = 1; index < termEvaluators.length; index += 1) {
      operators.push(mulCtx.getChild(index * 2 - 1).getText());
    }

    return (state) => {
      let result = toNumber(termEvaluators[0](state));
      for (let index = 1; index < termEvaluators.length; index += 1) {
        const right = toNumber(termEvaluators[index](state));
        result = operators[index - 1] === '*' ? result * right : result / right;
      }
      return result;
    };
  }

  _compileRuntimePowExpr(powCtx, prepared) {
    const evaluateLeft = this._compileRuntimeUnaryExpr(powCtx.unaryExpr(), prepared);
    if (!(powCtx.POW && powCtx.POW())) {
      return (state) => toNumber(evaluateLeft(state));
    }

    const evaluateRight = this._compileRuntimePowExpr(powCtx.powExpr(), prepared);
    return (state) => toNumber(evaluateLeft(state)) ** toNumber(evaluateRight(state));
  }

  _compileRuntimeUnaryExpr(unaryCtx, prepared) {
    if (unaryCtx.primary && unaryCtx.primary()) {
      return this._compileRuntimePrimary(unaryCtx.primary(), prepared);
    }

    const evaluateNested = this._compileRuntimeUnaryExpr(unaryCtx.unaryExpr(), prepared);
    const isNegative = unaryCtx.SUB && unaryCtx.SUB();
    return (state) => {
      const value = toNumber(evaluateNested(state));
      return isNegative ? -value : value;
    };
  }

  _compileRuntimePrimary(primaryCtx, prepared) {
    if (primaryCtx.NUMBER && primaryCtx.NUMBER()) {
      const value = Number(primaryCtx.NUMBER().getText());
      return () => value;
    }
    if (primaryCtx.INF && primaryCtx.INF()) return () => Infinity;
    if (primaryCtx.TRUE && primaryCtx.TRUE()) return () => true;
    if (primaryCtx.FALSE && primaryCtx.FALSE()) return () => false;

    if (primaryCtx.IDENT && primaryCtx.IDENT()) {
      const identifier = primaryCtx.IDENT().getText();
      return (state) => this._resolveIdentifier(identifier, state);
    }

    if (primaryCtx.STRING && primaryCtx.STRING()) {
      const literal = parseStringLiteral(primaryCtx.STRING().getText());
      return () => literal;
    }

    if (primaryCtx.expr && primaryCtx.expr()) {
      return this._compileRuntimeExpr(primaryCtx.expr(), prepared);
    }

    if (primaryCtx.refCall && primaryCtx.refCall()) {
      return this._compileRuntimeRefCall(primaryCtx.refCall(), prepared);
    }
    if (primaryCtx.evalCall && primaryCtx.evalCall()) {
      return this._compileRuntimeEvalCall(primaryCtx.evalCall(), prepared);
    }
    if (primaryCtx.fixCall && primaryCtx.fixCall()) {
      return this._compileRuntimeFixCall(primaryCtx.fixCall(), prepared);
    }
    if (primaryCtx.funcCall && primaryCtx.funcCall()) {
      return this._compileRuntimeFuncCall(primaryCtx.funcCall(), prepared);
    }
    if (primaryCtx.pieceExpr && primaryCtx.pieceExpr()) {
      return this._compileRuntimePieceExpr(primaryCtx.pieceExpr(), prepared);
    }
    if (primaryCtx.bracketsTaxableExpr && primaryCtx.bracketsTaxableExpr()) {
      return this._compileRuntimeBracketsTaxableExpr(primaryCtx.bracketsTaxableExpr(), prepared);
    }
    if (primaryCtx.scheduleExpr && primaryCtx.scheduleExpr()) {
      return this._compileRuntimeScheduleExpr(primaryCtx.scheduleExpr(), prepared);
    }

    return () => 0;
  }

  _compileRuntimeRefCall(refCallCtx, prepared) {
    const refPath = refCallCtx.nameRef().IDENT().map((tok) => tok.getText());

    return (state) => {
      const component = this._resolveReference(refPath, state);
      const refState = this._stateForCountryIncome(state, component.countryName, state.localIncome);
      return this._evaluateComponentTotal(component, refState);
    };
  }

  _compileRuntimeEvalCall(evalCallCtx, prepared) {
    const refPath = evalCallCtx.nameRef().IDENT().map((tok) => tok.getText());
    const evaluateIncomeExpr = this._compileRuntimeExpr(evalCallCtx.expr(), prepared);

    return (state) => {
      const component = this._resolveReference(refPath, state);
      const incomeValue = toNumber(evaluateIncomeExpr(state));
      const safeIncome = Number.isFinite(incomeValue) ? incomeValue : 0;
      return this._evaluateComponentValueAtIncome(component, state, safeIncome);
    };
  }

  _compileRuntimeFixCall(fixCallCtx, prepared) {
    const evaluateInitExpr = this._compileRuntimeExpr(fixCallCtx.expr(0), prepared);
    const evaluateUpdateExpr = this._compileRuntimeExpr(fixCallCtx.expr(1), prepared);

    return (state) => {
      const initValue = toNumber(evaluateInitExpr(state));
      const scope = Object.create(state.scope || null);
      const fixState = { ...state, scope };

      let current = this._clampFixValue(initValue);
      scope.k = current;

      for (let iter = 0; iter < FIX_MAX_ITERATIONS; iter += 1) {
        scope.k = current;
        const nextRaw = evaluateUpdateExpr(fixState);
        const next = this._clampFixValue(toNumber(nextRaw, current));

        const delta = Math.abs(next - current);
        const scale = Math.max(Math.abs(current), Math.abs(next), 1);
        if (delta <= FIX_ABSOLUTE_TOLERANCE + FIX_RELATIVE_TOLERANCE * scale) {
          return next;
        }
        current = next;
      }

      return current;
    };
  }

  _compileRuntimeFuncCall(funcCtx, prepared) {
    const functionName = normalizeIdentifier(funcCtx.IDENT().getText());
    const exprList = funcCtx.expr ? funcCtx.expr() : [];
    const argumentEvaluators = exprList.map((exprCtx) => this._compileRuntimeExpr(exprCtx, prepared));

    return (state) => {
      const args = argumentEvaluators.map((evaluateArg) => evaluateArg(state));
      return this._invokeNumericFunction(functionName, args, state);
    };
  }

  _compileRuntimePieceExpr(pieceCtx, prepared) {
    const armEvaluators = pieceCtx.pieceArm().map((armCtx) => ({
      evaluateCondition: this._compileRuntimeExpr(armCtx.expr(0), prepared),
      evaluateValue: this._compileRuntimeExpr(armCtx.expr(1), prepared),
    }));
    const evaluateElse = pieceCtx.expr && pieceCtx.expr()
      ? this._compileRuntimeExpr(pieceCtx.expr(), prepared)
      : null;

    return (state) => {
      for (const arm of armEvaluators) {
        if (Boolean(arm.evaluateCondition(state))) return arm.evaluateValue(state);
      }
      if (evaluateElse) return evaluateElse(state);
      return 0;
    };
  }

  _compileRuntimeScheduleExpr(scheduleCtx, prepared) {
    const evaluateSelector = this._compileRuntimeExpr(scheduleCtx.expr(), prepared);
    const armEvaluators = scheduleCtx.rangeArm().map((rangeArmCtx) => ({
      evaluateLowerBound: this._compileRuntimeBound(rangeArmCtx.range().bound(0), prepared),
      evaluateUpperBound: this._compileRuntimeBound(rangeArmCtx.range().bound(1), prepared),
      evaluateValue: this._compileRuntimeExpr(rangeArmCtx.expr(), prepared),
    }));
    return (state) => {
      const selector = toNumber(evaluateSelector(state));
      if (!Number.isFinite(selector) || selector <= 0) return 0;

      let total = 0;
      for (const arm of armEvaluators) {
        const lowerBound = arm.evaluateLowerBound(state);
        const upperBound = arm.evaluateUpperBound(state);

        if (!Number.isFinite(lowerBound) || Number.isNaN(upperBound)) continue;
        if (selector <= lowerBound) continue;

        const segmentUpper = Math.min(selector, upperBound);
        if (segmentUpper <= lowerBound) continue;

        total += integrateNumerically((xPoint) => {
          const xState = this._stateWithLocalX(state, xPoint);
          return toNumber(arm.evaluateValue(xState));
        }, lowerBound, segmentUpper);

        if (selector <= upperBound) break;
      }
      return total;
    };
  }

  _compileRuntimeBracketsTaxableExpr(bracketsTaxableCtx, prepared) {
    const evaluateIncome = this._compileRuntimeExpr(bracketsTaxableCtx.expr(0), prepared);
    const evaluateAllowance = this._compileRuntimeExpr(bracketsTaxableCtx.expr(1), prepared);
    const evaluateAllowanceBase = this._compileRuntimeExpr(bracketsTaxableCtx.expr(2), prepared);
    const armEvaluators = bracketsTaxableCtx.rangeArm().map((rangeArmCtx) => ({
      evaluateLowerBound: this._compileRuntimeBound(rangeArmCtx.range().bound(0), prepared),
      evaluateUpperBound: this._compileRuntimeBound(rangeArmCtx.range().bound(1), prepared),
      evaluateValue: this._compileRuntimeExpr(rangeArmCtx.expr(), prepared),
    }));

    return (state) => this._evaluateBracketsTaxableWithEvaluators(
      state,
      evaluateIncome,
      evaluateAllowance,
      evaluateAllowanceBase,
      armEvaluators
    );
  }

  _compileRuntimeBound(boundCtx, prepared) {
    if (boundCtx.INF && boundCtx.INF()) return () => Infinity;
    const evaluateExpr = this._compileRuntimeExpr(boundCtx.expr(), prepared);
    return (state) => toNumber(evaluateExpr(state));
  }

}

export function installRuntimeCompileMethods(TargetClass) {
  const descriptors = Object.getOwnPropertyDescriptors(RuntimeCompileMethods.prototype);
  delete descriptors.constructor;
  Object.defineProperties(TargetClass.prototype, descriptors);
}
