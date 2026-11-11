import { normalizeIdentifier } from './shared.js';

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
