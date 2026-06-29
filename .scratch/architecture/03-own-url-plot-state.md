# Own URL plot state end to end

Type: AFK

## What to build

Add one deep URL plot-state module that owns the canonical URL schema, parsing, serialization, defaults, display-context range conversion, hash subscription, and history writes.

React plot state remains authoritative after startup. The URL must update after every relevant state change, and browser back/forward navigation must restore React state.

Legacy URL keys are intentionally removed rather than retained as compatibility behavior.

## Exact edit plan

1. Add `src/urlPlotState.js`.
2. Move canonical URL parsing, serialization, default construction, range conversion, `hashchange` handling, and history-write policy from `src/App.jsx`.
3. Pass immutable tax catalogue and default configuration to the module once.
4. Use native `window`, `URLSearchParams`, and `history`; do not add an adapter interface or dependency.
5. Preserve initial URL normalization with `replaceState`.
6. Preserve later hash updates as history entries and restore state on `hashchange`.
7. Remove legacy aliases `r`, `u`, `x`, `c`, and `s`, plus their bitmap decoding helpers and maps.
8. Write only `type`, `currency`, `x_range`, `countries`, `schedules`, and `period`.
9. Add `tests/url-plot-state.test.js`.
10. Delete moved helpers, effects, derived hash values, and synchronization refs from `src/App.jsx`.

## Acceptance criteria

- [ ] Canonical URL state serializes and parses symmetrically.
- [ ] Empty country and schedule selections round-trip unchanged.
- [ ] Invalid canonical values use current defaults.
- [ ] Legacy keys are ignored.
- [ ] URL updates after every relevant React state change.
- [ ] Initial normalization replaces the current history entry.
- [ ] Later state changes create history entries.
- [ ] Back and forward navigation restore React plot state.
- [ ] No new dependency is added.
- [ ] Median URL-update benchmark regression is no greater than 1% across five batches.
- [ ] Any regression above 1% is optimized away before merge.
- [ ] Production bundle size does not increase.

## Blocked by

None - can start immediately.
