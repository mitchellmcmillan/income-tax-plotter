# Use one TaxSpec execution path

Type: AFK

## Goal

Remove the duplicate runtime evaluator and direct rate interface after semantic compilation is complete. Generated prepared outcomes become the only execution path.

## Decisions

- Run last, after issues 06–08.
- Remove public `marginalRate()` and `overallRate()` direct methods.
- Keep no compatibility aliases; repository is private and production callers already use prepared outcomes.
- Generated compilation is mandatory.
- Remove silent compiler fallback.
- A compile failure throws a descriptive error.
- Add no interpreter-level prepared cache; the plot planner owns reuse and CLI prepares once.
- Delete `evaluationMethods.js` entirely.
- Keep compile-time analysis only inside the semantic compiler.
- Rename `TaxSpecInterpreter` to `TaxSpec`.
- Test observable prepared outcomes, not generated source or implementation parity.

## Final interface

`TaxSpec` retains:

- Construction from TaxSpec source and currency conversions.
- `getCatalogue()`.
- `prepare()` returning scalar marginal rate, overall rate, tax paid, and net pay accessors plus semantic plot-break metadata.

Direct rate methods and generated-source diagnostics do not remain.

## Staged implementation

1. **Audit compiler coverage**
   - Enumerate every semantic TaxSpec node.
   - Prove each node compiles through behavioral fixtures.
   - Confirm every shipped country prepares successfully.

2. **Replace parity-only tests**
   - Keep hand-calculated country schedule expectations.
   - Add behavioral fixtures for every TaxSpec construct and error mode.
   - Remove tests comparing two implementations.
   - Never inspect generated source, generated function names, or compiler internals.

3. **Make compilation mandatory**
   - Remove `_tryBuildPreparedCodegen` catch-and-fallback behavior.
   - Throw descriptive compile errors with TaxSpec location/context.
   - Preserve prepared outcome runtime errors.

4. **Remove direct methods**
   - Migrate remaining tests and scripts to `prepare()`.
   - Delete public direct marginal and overall methods.
   - Delete direct-method helpers used only by that interface.

5. **Delete runtime evaluation**
   - Remove `evaluationMethods.js` and its installer.
   - Remove evaluator state, memoization, guards, numeric integration, and fallback branches that generated execution no longer needs.
   - Retain required compile-time analysis inside the compiler only.

6. **Rename the module**
   - Rename `TaxSpecInterpreter.js` and class to `TaxSpec`.
   - Update production, scripts, and tests.
   - Delete old filename and aliases.

7. **Final deletion pass**
   - Remove parity helpers, dead shared functions, unused imports, and migration code.
   - Verify no second execution path remains.

## Verification

- Every semantic TaxSpec construct has public prepared-outcome behavior coverage.
- Every current country prepares and produces expected finite outcomes.
- Existing hand-calculated country schedules and error fixtures pass.
- Unsupported or invalid compilation fails descriptively; no silent fallback occurs.
- `TaxSpec` exposes only construction, `getCatalogue()`, and `prepare()`.
- Median prepare-time and warm-runtime regression is no greater than 1% across five batches.
- Production bundle size decreases.
- Production LOC decreases materially; expected deletion is approximately 1,000 LOC.

## Complete when

- `evaluationMethods.js`, its installer, direct rate methods, fallback branches, and parity-only tests are deleted.
- Generated prepared outcomes are the sole execution implementation.
- No caller or test inspects generated source or compiler internals.
- No compatibility alias for `TaxSpecInterpreter` remains.

## Blocked by

- `.scratch/architecture/06-rewrite-taxspec-as-semantic-model.md`
- `.scratch/architecture/07-deepen-tax-plot-planning.md`
- `.scratch/architecture/08-use-semantic-plot-breaks.md`
