# Concentrate plot planning

Type: AFK

## What to build

Add one deep plot-planning module that owns series selection, sampling, bounds, cache policy, forced breaks, and discontinuity planning. React supplies current plot state and renders the returned renderer-neutral plans with Mafs.

Tax outcome derivation remains outside this module until its separate issue. No visual redesign is included.

## Exact edit plan

1. Add `src/plotPlanning.js`.
2. Move sampling, sampled-bound calculation, jump detection, domain splitting, autoscale, mode-to-series selection, and lookahead cache policy from `src/App.jsx`.
3. Keep planner caches internal; do not pass cache Maps through the interface.
4. Return renderer-neutral series plans containing domains, jumps, bounds, styles, and accessors.
5. Keep Mafs imports and JSX in `src/App.jsx`.
6. Add `tests/plot-planning.test.js` covering all rate modes, forced breaks, detected jumps, bounds, and equivalent results after cache reuse.
7. Add a deterministic Node benchmark covering initial planning and repeated overlapping pans.
8. Delete moved constants, helpers, duplicated mode selection, and cache refs from `src/App.jsx`.

## Acceptance criteria

- [ ] All five rate modes produce the same plotted series.
- [ ] Forced TaxSpec breaks and detected discontinuities remain unchanged.
- [ ] Autoscale lookahead and cache reuse during panning remain unchanged.
- [ ] Currency and pay-period domains remain unchanged.
- [ ] Existing line styles and Mafs rendering remain unchanged.
- [ ] Plot-planning tests run without React, Mafs, or Monaco.
- [ ] Median benchmark regression is no greater than 1% across five batches.
- [ ] Any regression above 1% is optimized away before merge.
- [ ] Production bundle size does not increase.
- [ ] Moved planning code no longer remains in `src/App.jsx`.

## Blocked by

None - can start immediately.
