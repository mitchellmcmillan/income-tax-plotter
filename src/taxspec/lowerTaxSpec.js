import {
  normalizeCurrency,
  normalizeIdentifier,
  parseStringLiteral,
} from './shared.js';

const location = (ctx) => Object.freeze({
  line: ctx.start?.line ?? 0,
  column: ctx.start?.column ?? 0,
});

const node = (type, ctx, fields = {}) => Object.freeze({
  type,
  location: location(ctx),
  ...fields,
});

function binary(ctx, terms, lower, operatorOffset = 1) {
  let value = lower(terms[0]);
  for (let index = 1; index < terms.length; index += 1) {
    value = node('Binary', ctx, {
      operator: ctx.getChild(index * 2 - operatorOffset).getText(),
      left: value,
      right: lower(terms[index]),
    });
  }
  return value;
}

function lowerExpr(ctx) {
  return lowerOr(ctx.orExpr());
}

function lowerOr(ctx) {
  return binary(ctx, ctx.andExpr(), lowerAnd);
}

function lowerAnd(ctx) {
  return binary(ctx, ctx.notExpr(), lowerNot);
}

function lowerNot(ctx) {
  return ctx.NOT()
    ? node('Unary', ctx, { operator: 'not', operand: lowerNot(ctx.notExpr()) })
    : lowerComparison(ctx.cmpExpr());
}

function lowerComparison(ctx) {
  const terms = ctx.addExpr();
  if (terms.length === 1) return lowerAdd(terms[0]);
  return node('Binary', ctx, {
    operator: ctx.getChild(1).getText(),
    left: lowerAdd(terms[0]),
    right: lowerAdd(terms[1]),
  });
}

function lowerAdd(ctx) {
  return binary(ctx, ctx.mulExpr(), lowerMultiply);
}

function lowerMultiply(ctx) {
  return binary(ctx, ctx.powExpr(), lowerPower);
}

function lowerPower(ctx) {
  const left = lowerUnary(ctx.unaryExpr());
  return ctx.POW()
    ? node('Binary', ctx, { operator: '^', left, right: lowerPower(ctx.powExpr()) })
    : left;
}

function lowerUnary(ctx) {
  if (ctx.primary()) return lowerPrimary(ctx.primary());
  return node('Unary', ctx, {
    operator: ctx.SUB() ? '-' : '+',
    operand: lowerUnary(ctx.unaryExpr()),
  });
}

function lowerPrimary(ctx) {
  if (ctx.NUMBER()) return node('Literal', ctx, { value: Number(ctx.NUMBER().getText()) });
  if (ctx.INF()) return node('Literal', ctx, { value: Infinity });
  if (ctx.TRUE?.()) return node('Literal', ctx, { value: true });
  if (ctx.FALSE?.()) return node('Literal', ctx, { value: false });
  if (ctx.IDENT()) return node('Identifier', ctx, { name: ctx.IDENT().getText() });
  if (ctx.STRING()) {
    return node('Literal', ctx, { value: parseStringLiteral(ctx.STRING().getText()) });
  }
  if (ctx.expr()) return lowerExpr(ctx.expr());
  if (ctx.refCall?.()) return lowerReference(ctx.refCall());
  if (ctx.evalCall?.()) return lowerEval(ctx.evalCall());
  if (ctx.fixCall?.()) return lowerFix(ctx.fixCall());
  if (ctx.funcCall()) return lowerCall(ctx.funcCall());
  if (ctx.pieceExpr()) return lowerPiece(ctx.pieceExpr());
  if (ctx.bracketsTaxableExpr?.()) return lowerTaxableBrackets(ctx.bracketsTaxableExpr());
  if (ctx.scheduleExpr()) return lowerBrackets(ctx.scheduleExpr());
  throw new Error(`Unsupported TaxSpec expression at ${location(ctx).line}:${location(ctx).column}.`);
}

const lowerPath = (ctx) => Object.freeze(ctx.IDENT().map((token) => token.getText()));

function lowerReference(ctx) {
  return node('Reference', ctx, { path: lowerPath(ctx.nameRef()) });
}

function lowerEval(ctx) {
  return node('Eval', ctx, {
    path: lowerPath(ctx.nameRef()),
    income: lowerExpr(ctx.expr()),
  });
}

function lowerFix(ctx) {
  return node('Fix', ctx, {
    initial: lowerExpr(ctx.expr(0)),
    update: lowerExpr(ctx.expr(1)),
  });
}

function lowerCall(ctx) {
  return node('Call', ctx, {
    name: normalizeIdentifier(ctx.IDENT().getText()),
    arguments: Object.freeze((ctx.expr?.() || []).map(lowerExpr)),
  });
}

function lowerPiece(ctx) {
  return node('Piece', ctx, {
    arms: Object.freeze(ctx.pieceArm().map((arm) => Object.freeze({
      condition: lowerExpr(arm.expr(0)),
      value: lowerExpr(arm.expr(1)),
      location: location(arm),
    }))),
    otherwise: ctx.expr?.() ? lowerExpr(ctx.expr()) : node('Literal', ctx, { value: 0 }),
  });
}

function lowerRangeArm(ctx) {
  const range = ctx.range();
  return Object.freeze({
    lower: lowerBound(range.bound(0)),
    upper: lowerBound(range.bound(1)),
    value: lowerExpr(ctx.expr()),
    location: location(ctx),
  });
}

function lowerBound(ctx) {
  return ctx.INF() ? node('Literal', ctx, { value: Infinity }) : lowerExpr(ctx.expr());
}

function lowerBrackets(ctx) {
  return node('Brackets', ctx, {
    income: lowerExpr(ctx.expr()),
    arms: Object.freeze(ctx.rangeArm().map(lowerRangeArm)),
  });
}

function lowerTaxableBrackets(ctx) {
  return node('TaxableBrackets', ctx, {
    income: lowerExpr(ctx.expr(0)),
    allowance: lowerExpr(ctx.expr(1)),
    allowanceBase: lowerExpr(ctx.expr(2)),
    arms: Object.freeze(ctx.rangeArm().map(lowerRangeArm)),
  });
}

function lowerBlock(ctx) {
  return node('Block', ctx, {
    statements: Object.freeze(ctx.stmt().map((statement) => Object.freeze({
      name: statement.IDENT().getText(),
      value: lowerExpr(statement.expr()),
      location: location(statement),
    }))),
    result: lowerExpr(ctx.expr()),
  });
}

function countryName(countryCtx) {
  const name = countryCtx.countryName?.();
  if (name?.IDENT?.()) return name.IDENT().getText();
  if (name?.STRING?.()) return parseStringLiteral(name.STRING().getText());
  throw new Error('Country block missing name.');
}

function currencyMetadata(countryCtx, name) {
  if (!countryCtx.currencyMeta?.()) return { currency: 'EUR', currencyToEur: null };

  const text = countryCtx.currencyMeta().getText().slice(1, -1);
  const direct = text.match(
    /^([A-Za-z_][A-Za-z0-9_]*)(?:=([0-9]+(?:\.[0-9]+)?)\*([A-Za-z_][A-Za-z0-9_]*))?$/
  );
  const reverse = text.match(
    /^([0-9]+(?:\.[0-9]+)?)([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z_][A-Za-z0-9_]*)$/
  );

  if (direct) {
    const currency = direct[1];
    if (direct[2] === undefined) return { currency, currencyToEur: null };
    if (normalizeCurrency(direct[3]) !== 'EUR') {
      throw new Error(
        `Currency metadata for ${name} must reference EUR, e.g. (${currency} = 0.60 * EUR).`
      );
    }
    const currencyToEur = Number(direct[2]);
    if (!Number.isFinite(currencyToEur) || currencyToEur <= 0) {
      throw new Error(`Conversion rate must be positive for currency "${currency}".`);
    }
    return { currency, currencyToEur };
  }

  if (reverse) {
    const currency = reverse[2];
    const amount = Number(reverse[1]);
    if (normalizeCurrency(reverse[3]) !== 'EUR') {
      throw new Error(
        `Currency metadata for ${name} must reference EUR, e.g. (${currency} = 0.60 * EUR) or (${amount} ${currency} = EUR).`
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Conversion rate must be positive for currency "${currency}".`);
    }
    return { currency, currencyToEur: 1 / amount };
  }

  throw new Error(
    `Invalid currency metadata for ${name}. Use (CUR = 0.60 * EUR) or (11.25 CUR = EUR).`
  );
}

export function lowerTaxSpec(programCtx) {
  const countries = new Map();

  for (const countryCtx of programCtx.countryBlock()) {
    const name = countryName(countryCtx);
    const countryKey = normalizeIdentifier(name);
    if (countries.has(countryKey)) throw new Error(`Duplicate country definition: ${name}`);

    const { currency, currencyToEur } = currencyMetadata(countryCtx, name);
    const components = countryCtx.componentDef().map((componentCtx) => {
      const componentName = componentCtx.IDENT().getText();
      const kindCtx = componentCtx.kindToken?.();
      const kind = kindCtx?.IDENT?.() ? kindCtx.IDENT().getText() : '_';
      const kindKey = normalizeIdentifier(kind);
      const componentKey = normalizeIdentifier(componentName);

      return {
        type: 'Component',
        id: `${kindKey}:${componentKey}`,
        location: location(componentCtx),
        countryName: name,
        countryKey,
        currency,
        kind,
        kindKey,
        componentName,
        componentKey,
        body: lowerBlock(componentCtx.cell().wrapper().block()),
      };
    });

    const byKindAndName = new Map();
    const byKind = new Map();
    const byName = new Map();
    for (const component of components) {
      if (byKindAndName.has(component.id)) {
        throw new Error(
          `Duplicate component in ${name}: ${component.kind}:${component.componentName}`
        );
      }
      byKindAndName.set(component.id, component);
      if (!byKind.has(component.kindKey)) byKind.set(component.kindKey, []);
      byKind.get(component.kindKey).push(component);
      if (!byName.has(component.componentKey)) byName.set(component.componentKey, []);
      byName.get(component.componentKey).push(component);
    }

    countries.set(countryKey, Object.freeze({
      type: 'Country',
      location: location(countryCtx),
      countryName: name,
      countryKey,
      currency,
      currencyKey: normalizeCurrency(currency),
      currencyToEur,
      components: Object.freeze(components),
      byKindAndName,
      byKind,
      byName,
    }));
  }

  return countries;
}

function constantValue(value, bindings, seen = new Set(), resolveReference = () => null) {
  if (value.type === 'Literal' && typeof value.value === 'number') return value.value;
  if (value.type === 'Reference') return resolveReference(value.path, seen, 'constant');
  if (value.type === 'Identifier' && bindings.has(value.name) && !seen.has(value.name)) {
    return constantValue(
      bindings.get(value.name),
      bindings,
      new Set([...seen, value.name]),
      resolveReference
    );
  }
  if (value.type === 'Unary') {
    const operand = constantValue(value.operand, bindings, seen, resolveReference);
    if (operand === null) return null;
    return value.operator === '-' ? -operand : operand;
  }
  if (value.type !== 'Binary') return null;
  const left = constantValue(value.left, bindings, seen, resolveReference);
  const right = constantValue(value.right, bindings, seen, resolveReference);
  if (left === null || right === null) return null;
  if (value.operator === '+') return left + right;
  if (value.operator === '-') return left - right;
  if (value.operator === '*') return left * right;
  if (value.operator === '/') return left / right;
  if (value.operator === '^') return left ** right;
  return null;
}

function affineValue(value, bindings, seen = new Set(), resolveReference = () => null) {
  if (value.type === 'Reference') return resolveReference(value.path, seen, 'affine');
  const constant = constantValue(value, bindings, seen, resolveReference);
  if (constant !== null) return { slope: 0, intercept: constant };
  if (value.type === 'Identifier') {
    if (value.name === 'x') return { slope: 1, intercept: 0 };
    if (bindings.has(value.name) && !seen.has(value.name)) {
      return affineValue(
        bindings.get(value.name),
        bindings,
        new Set([...seen, value.name]),
        resolveReference
      );
    }
    return null;
  }
  if (value.type === 'Unary') {
    const operand = affineValue(value.operand, bindings, seen, resolveReference);
    if (!operand) return null;
    return value.operator === '-'
      ? { slope: -operand.slope, intercept: -operand.intercept }
      : operand;
  }
  if (value.type !== 'Binary') return null;
  const left = affineValue(value.left, bindings, seen, resolveReference);
  const right = affineValue(value.right, bindings, seen, resolveReference);
  if (!left || !right) return null;
  if (value.operator === '+') {
    return {
      slope: left.slope + right.slope,
      intercept: left.intercept + right.intercept,
    };
  }
  if (value.operator === '-') {
    return {
      slope: left.slope - right.slope,
      intercept: left.intercept - right.intercept,
    };
  }
  if (value.operator === '*' && (left.slope === 0 || right.slope === 0)) {
    return {
      slope: left.slope * right.intercept + right.slope * left.intercept,
      intercept: left.intercept * right.intercept,
    };
  }
  if (value.operator === '/' && right.slope === 0 && right.intercept !== 0) {
    return {
      slope: left.slope / right.intercept,
      intercept: left.intercept / right.intercept,
    };
  }
  return null;
}

function collectBreaks(value, bindings, breaks, coverage, resolveReference) {
  if (!value || typeof value !== 'object') return;
  if (value.type === 'Binary' && ['<', '<=', '>', '>=', '==', '!='].includes(value.operator)) {
    const left = affineValue(value.left, bindings, new Set(), resolveReference);
    const right = affineValue(value.right, bindings, new Set(), resolveReference);
    if (left && right && left.slope !== right.slope) {
      breaks.add((right.intercept - left.intercept) / (left.slope - right.slope));
    } else {
      coverage.complete = false;
    }
  }
  if (value.type === 'Brackets' || value.type === 'TaxableBrackets') {
    for (const arm of value.arms) {
      const lower = constantValue(arm.lower, bindings, new Set(), resolveReference);
      const upper = constantValue(arm.upper, bindings, new Set(), resolveReference);
      if (lower === null || upper === null) coverage.complete = false;
      else {
        breaks.add(lower);
        breaks.add(upper);
      }
    }
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        collectBreaks(item, bindings, breaks, coverage, resolveReference);
      }
    } else if (child && typeof child === 'object' && child !== value.location) {
      collectBreaks(child, bindings, breaks, coverage, resolveReference);
    }
  }
}

export function analyzePlotBreaks(models) {
  const analysis = new Map();
  for (const country of models.values()) {
    const breaks = new Set();
    const coverage = { complete: true };
    const resolveReference = (path, seen, mode) => {
      const keys = path.map(normalizeIdentifier);
      const component = keys.length === 1
        ? (country.byName.get(keys[0]) || [])[0]
        : keys.length === 2
          ? country.byKindAndName.get(`${keys[0]}:${keys[1]}`)
          : null;
      if (!component) return null;
      const key = `${country.countryKey}:${component.id}`;
      if (seen.has(key)) return null;
      const componentBindings = new Map(
        component.body.statements.map((statement) => [statement.name, statement.value])
      );
      const nextSeen = new Set([...seen, key]);
      return mode === 'affine'
        ? affineValue(component.body.result, componentBindings, nextSeen, resolveReference)
        : constantValue(component.body.result, componentBindings, nextSeen, resolveReference);
    };
    for (const component of country.components) {
      const bindings = new Map(
        component.body.statements.map((statement) => [statement.name, statement.value])
      );
      collectBreaks(component.body, bindings, breaks, coverage, resolveReference);
    }
    analysis.set(country.countryKey, Object.freeze({
      breaks: Object.freeze([...breaks]
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Number(value.toFixed(9)))
        .sort((left, right) => left - right)),
      complete: coverage.complete,
    }));
  }
  return analysis;
}
