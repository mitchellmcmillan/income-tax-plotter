# Remove leaked interpreter fields

Type: AFK

## What to build

Remove public access to interpreter implementation fields and replace caller-needed country, schedule, currency, and plot-break metadata with one deliberate catalogue interface.

Keep `TaxSpecInterpreter`, `prepare()`, direct rate methods, and current error behavior. Remove generated source from the prepared result rather than replacing it with another diagnostics interface.

## Exact edit plan

1. Add `TaxSpecInterpreter.getCatalogue()`.
2. Build the catalogue once during interpreter construction.
3. Return a cached plain snapshot containing:
   - countries: id, label, currency, schedule kinds, plot breaks
   - currencies: code and EUR conversion rate
4. Shallow-freeze every record plus containing arrays and object.
5. Remove public access to `modelByCountry`, `currencyToEur`, nested parser/model fields, and `generatedCode`.
6. Update `src/App.jsx` to use `getCatalogue()` for country, schedule, currency, and plot-break metadata.
7. Update tests to use the catalogue instead of interpreter internals.
8. Replace generated-source string assertions with observable interpreted/generated parity and benchmark checks.
9. Keep `TaxSpecInterpreter`, `prepare()`, direct rate methods, and error behavior unchanged.
10. Delete compatibility fields added by the semantic-lowering issue.

## Acceptance criteria

- [ ] No caller accesses `modelByCountry`, `currencyToEur`, parser contexts, model Maps, or execution plans.
- [ ] `getCatalogue()` contains every current country, schedule kind, currency conversion, and plot break.
- [ ] Catalogue records cannot be mutated.
- [ ] Repeated `getCatalogue()` calls return the same cached snapshot.
- [ ] Prepared evaluation no longer exposes `generatedCode`.
- [ ] Tests do not inspect generated function names or source markers.
- [ ] Interpreted and generated execution remain behaviorally equivalent.
- [ ] Existing direct rate methods and errors remain unchanged.
- [ ] Median warm runtime regression is no greater than 1% across five benchmark batches.
- [ ] Any regression above 1% is optimized away before merge.
- [ ] Production bundle size does not increase.

## Blocked by

`.scratch/architecture/01-lower-taxspec-once.md`
