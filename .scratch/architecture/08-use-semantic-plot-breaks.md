# Use semantic plot breaks

Type: AFK

## Goal

Replace whole-domain heuristic jump scanning with semantic discontinuity candidates from prepared TaxSpec evaluation. Preserve current visuals and retain scanning only when semantic analysis cannot prove complete coverage.

## Decisions

- Implement after issues 06 and 07.
- Do not special-case countries or schedules.
- Collect candidates generically from TaxSpec semantics.
- Candidate means “probe here,” not “guaranteed jump.”
- Prepared evaluation exposes immutable display-context `plotBreaks` and `plotBreakCoverageComplete`.
- Complete coverage skips whole-domain scanning.
- Incomplete coverage uses the current detector as a private planner fallback.
- Preserve current domain splitting, integer-aligned probes, midpoint jump markers, and jump-size thresholds.
- Every country in shipped `income.tax` must achieve complete coverage through generic analysis.

## Semantic candidate sources

- Bracket bounds.
- Piece-condition income thresholds.
- Allowance caps and schedule thresholds.
- Referenced schedule candidates.
- Cross-country and currency conversions.
- Pay-period conversion.
- Statically resolvable `eval` income mappings.
- Threshold-bearing branches inside `fix`.

Analysis follows references and transforms thresholds into the prepared display currency and pay period. It marks coverage incomplete only when a dynamic income mapping or threshold cannot be proven.

## Staged implementation

1. **Characterize visual behavior**
   - Snapshot forced breaks, detected jumps, continuous domains, and bounds for every current country and rate mode.
   - Record accessor-call counts, initial-plan time, repeated-pan time, and bundle size.

2. **Add semantic break analysis**
   - Compile candidate thresholds alongside value, derivative, and dependency information.
   - Track completeness through expressions, references, `eval`, and `fix`.
   - Add no country-name or schedule-name branches.

3. **Expose prepared display breaks**
   - Return immutable `plotBreaks` and `plotBreakCoverageComplete` from `prepare()`.
   - Convert candidates using the same currency and periods used by scalar outcome accessors.
   - Remove raw numeric-literal interpretation from callers.

4. **Probe semantic candidates**
   - Split domains at converted candidates.
   - Probe nearest integer-aligned incomes on each side.
   - Confirm jump size with current thresholds.
   - Emit current midpoint jump markers.

5. **Gate fallback scanning**
   - Complete series run candidate probes only.
   - Incomplete series use the existing detector and cache.
   - Do not allocate scanner cache entries for complete series.

6. **Delete obsolete plumbing**
   - Remove raw-literal plot-break conversion.
   - Remove whole-domain scan work and scanner cache policy from the complete path.
   - Remove temporary dual behavior after parity is established.

## Verification

- All shipped countries report `plotBreakCoverageComplete: true`.
- No country-specific analysis code exists.
- Existing forced breaks, jump markers, domains, and bounds remain visually identical.
- Complete series perform zero whole-domain jump scans.
- Custom TaxSpec with an unprovable dynamic threshold reports incomplete coverage and preserves fallback behavior.
- Initial-plan median benchmark improves across five batches.
- Repeated-pan median benchmark regression is no greater than 1%.
- Production bundle size does not increase.

## Complete when

- Normal application plotting uses semantic candidate probes only.
- Shipped `income.tax` needs no scanner fallback.
- Fallback remains private, lazy, and limited to incomplete custom TaxSpec.
- Raw numeric literals are no longer treated as plot-break metadata.

## Blocked by

- `.scratch/architecture/06-rewrite-taxspec-as-semantic-model.md`
- `.scratch/architecture/07-deepen-tax-plot-planning.md`
