# Lower TaxSpec once

Type: AFK

## What to build

Add one deep semantic lowering module that converts the ANTLR parse tree into a parser-independent TaxSpec model. Interpreted and generated execution must consume that shared model instead of walking grammar contexts independently.

Preserve the existing `TaxSpecInterpreter` interface, including `prepare()`, direct rate methods, `modelByCountry`, and `generatedCode`, through a compatibility view. Removing leaked fields is a separate issue.

## Exact edit plan

1. Add `src/taxspec/lowerTaxSpec.js` with plain JavaScript objects using `type` tags.
2. Move identifier normalization, reference resolution, dependency analysis, and normalized expression construction into semantic lowering.
3. Keep execution-specific fast plans and code emission out of the semantic model.
4. Rewrite `src/taxspec/evaluationMethods.js` to evaluate semantic nodes.
5. Rewrite `src/taxspec/codegenMethods.js` to generate from the same semantic nodes.
6. Update `src/TaxSpecInterpreter.js` to lower once and expose its existing interface through compatibility data.
7. Keep old walkers only while parity is being established; delete them before merge.
8. Add public-behavior parity coverage for interpreted and generated execution across every country.

## Acceptance criteria

- [ ] ANTLR contexts do not escape the lowering module.
- [ ] Interpretation, code generation, dependency analysis, and fast-plan selection consume the semantic model.
- [ ] Existing public behavior and compatibility fields remain unchanged.
- [ ] Existing tests pass unchanged.
- [ ] Interpreted and generated results match across every country.
- [ ] Median warm runtime regression is no greater than 1% across five benchmark batches.
- [ ] Any regression above 1% is optimized away before merge.
- [ ] Production bundle size does not increase.
- [ ] Duplicate grammar walkers and temporary migration code are deleted.

## Blocked by

None - can start immediately.
