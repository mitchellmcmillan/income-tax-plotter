# Share tax-outcome derivation

Type: AFK

## What to build

Deepen the existing prepared evaluation module so browser and CLI callers receive marginal rate, overall rate, tax paid, and net pay with display-currency and pay-period conversion handled in one place.

Keep scalar accessors rather than allocating an outcome object for every sampled income.

## Exact edit plan

1. Extend `TaxSpecInterpreter.prepare(country, enabledSchedules, currency, periodsPerYear = 1)`.
2. Return `marginalRate`, `overallRate`, `taxPaid`, and `netPay` scalar accessors.
3. Annualize displayed income internally before tax evaluation.
4. Return `taxPaid` and `netPay` in the selected currency and pay period.
5. Preserve existing three-argument `prepare()` behavior.
6. Centralize non-positive-income semantics in prepared accessors.
7. Throw a descriptive error when valid numeric income produces a non-finite outcome.
8. Update `src/App.jsx` to use prepared outcome accessors and remove manual annualization, tax-paid/net-pay derivation, and redundant value caches.
9. Update `scripts/plot-marginal-rate-common.js` to use the same accessors and retain fail-fast behavior.
10. Add `tests/tax-outcomes.test.js` covering countries, currencies, pay periods, non-positive income, and non-finite errors.

## Acceptance criteria

- [ ] Prepared evaluation exposes four scalar accessors.
- [ ] Existing three-argument `prepare()` callers remain compatible.
- [ ] Annual, monthly, fortnightly, and weekly outcomes are equivalent after conversion.
- [ ] Currency conversion remains correct.
- [ ] `marginalRate` is zero below zero.
- [ ] `overallRate` and `taxPaid` are zero at or below zero.
- [ ] `netPay` equals input income at or below zero.
- [ ] Non-finite outcomes throw descriptive errors.
- [ ] Browser and CLI no longer derive tax paid or net pay independently.
- [ ] Median hot-path benchmark regression is no greater than 1% across five batches.
- [ ] Any regression above 1% is optimized away before merge.
- [ ] Production bundle size does not increase.

## Blocked by

`.scratch/architecture/01-lower-taxspec-once.md`
