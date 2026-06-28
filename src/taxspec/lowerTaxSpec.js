import {
  extractNumericLiterals,
  normalizeCurrency,
  normalizeIdentifier,
  parseStringLiteral,
} from './shared.js';

function lowerValue(value, cache) {
  if (Array.isArray(value)) return value.map((item) => lowerValue(item, cache));
  if (!value || typeof value !== 'object') return value;
  if (cache.has(value)) return cache.get(value);

  const lowered = { type: value.constructor?.name?.replace(/Context$/, '') || 'Token' };
  cache.set(value, lowered);
  const text = value.getText();
  if (!value.constructor?.name?.endsWith('Context')) {
    lowered.getText = () => text;
    return lowered;
  }

  const children = (value.children || []).map((child) => lowerValue(child, cache));
  lowered.getText = () => text;
  lowered.getChild = (index) => children[index];

  const prototype = Object.getPrototypeOf(value);
  const names = new Set([
    ...Object.getOwnPropertyNames(prototype),
    ...Object.keys(value).filter((name) => typeof value[name] === 'function'),
  ]);
  for (const name of names) {
    if (name === 'constructor') continue;
    if (typeof value[name] !== 'function') continue;
    const source = Function.prototype.toString.call(value[name]);
    if (!source.includes('getToken') && !source.includes('getTypedRuleContext')) continue;

    try {
      const result = value[name]();
      const stored = lowerValue(result, cache);
      lowered[name] = (index) => (
        index === undefined || !Array.isArray(stored) ? stored : stored[index]
      );
    } catch {
      // Methods requiring arguments are not semantic accessors.
    }
  }

  return lowered;
}

function countryName(countryCtx) {
  const name = countryCtx.countryName?.();
  if (name?.IDENT?.()) return name.IDENT().getText();
  if (name?.STRING?.()) return parseStringLiteral(name.STRING().getText());
  if (countryCtx.IDENT?.()) return countryCtx.IDENT().getText();
  if (countryCtx.STRING?.()) return parseStringLiteral(countryCtx.STRING().getText());
  throw new Error('Country block missing name.');
}

function currencyMetadata(countryCtx, name) {
  if (!countryCtx.currencyMeta?.()) return { currency: 'EUR', currencyToEur: null };

  const text = countryCtx.currencyMeta().getText().replace(/^\(/, '').replace(/\)$/, '');
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

      const body = lowerValue(componentCtx.cell().wrapper().block(), new WeakMap());
      return {
        type: 'Component',
        id: `${kindKey}:${componentKey}`,
        countryName: name,
        countryKey,
        currency,
        kind,
        kindKey,
        componentName,
        componentKey,
        body,
        bodyCtx: body,
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

    countries.set(countryKey, {
      type: 'Country',
      countryName: name,
      countryKey,
      currency,
      currencyKey: normalizeCurrency(currency),
      currencyToEur,
      numericLiterals: extractNumericLiterals(countryCtx.getText()),
      components,
      byKindAndName,
      byKind,
      byName,
    });
  }

  return countries;
}
