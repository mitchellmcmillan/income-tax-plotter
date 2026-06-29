# Rewrite TaxSpec as a semantic model

Type: AFK

## Goal

Replace parser-shaped lowering with a complete semantic TaxSpec model. Keep generated functions as the hot path while deleting duplicate compiler traversals and all downstream ANTLR-shaped interfaces.

## Decisions

- Deliver as staged, independently verifiable changes; complete replacement is mandatory.
- Preserve the current `TaxSpecInterpreter` public interface and error behavior.
- Use plain tagged JavaScript objects. No classes, visitor framework, parser-style methods, or ANTLR contexts.
- One compiler traversal emits value code, derivative code, and dependencies together.
- Keep one small semantic evaluator as correctness oracle and fallback.
- Preserve threshold meaning and source locations for later semantic-discontinuity work.
- Do not change plotting behavior in this issue.

## Staged implementation

1. **Characterize current behavior**
   - Record parse, prepare, warm-evaluation, and bundle baselines.
   - Keep prepared/direct parity coverage across every catalogue country.

2. **Introduce semantic nodes**
   - Lower literals, identifiers, blocks, boolean/comparison/arithmetic expressions, calls, pieces, schedules, brackets, references, `eval`, and `fix`.
   - Store only data and `type` tags.
   - Retain threshold semantics and source locations.
   - Prove no ANTLR context or parser-compatible method escapes lowering.

3. **Move semantic evaluation**
   - Rewrite the fallback evaluator against semantic nodes.
   - Migrate constructs in dependency order.
   - Keep public errors and non-positive-income behavior unchanged after every stage.

4. **Unify compilation**
   - Replace value, symbolic-derivative, and dependency walkers with one recursive compiler traversal.
   - Return value code, derivative code, constants, and dependencies from each node compilation.
   - Preserve current fast bracket, piece, reference, `eval`, and `fix` behavior.

5. **Reconnect prepared evaluation**
   - Generate the same scalar outcome functions from compiled semantic nodes.
   - Retain the semantic evaluator only as oracle/fallback.
   - Benchmark after each migrated construct.

6. **Delete migration code**
   - Remove reflective `lowerValue`.
   - Remove parser-shaped `getText`, `getChild`, token accessors, `bodyCtx`, and duplicate walkers.
   - Remove temporary adapters and compatibility branches.

## Verification

- Public-behavior tests use only `TaxSpecInterpreter`, `prepare()`, and `getCatalogue()`.
- Every current country matches prepared and direct evaluation across representative incomes.
- Every TaxSpec construct has semantic evaluator/compiler parity coverage.
- Existing errors remain unchanged.
- Median warm runtime regression is no greater than 1% across five batches.
- Parse and prepare benchmarks must not regress; optimize any regression before merge.
- Production bundle size does not increase.
- Production LOC decreases materially; no numeric deletion target.

## Complete when

- All execution and analysis consume semantic nodes.
- No ANTLR context or parser-shaped compatibility object exists outside parsing/lowering.
- One compiler traversal owns value, derivative, and dependency compilation.
- Old walkers and temporary migration code are deleted.

## Deferred

- Replacing plot jump scanning with semantic discontinuity candidates: issue 08.
- Removing the fallback evaluator or direct rate methods: issue 09.
