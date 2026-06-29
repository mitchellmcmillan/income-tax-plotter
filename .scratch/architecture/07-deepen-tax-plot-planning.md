# Deepen tax plot planning

Type: AFK

## Goal

Make `plotPlanning.js` own the complete TaxSpec-to-plot-plan implementation. React supplies UI state and renders a renderer-neutral plan; it does not prepare countries or derive plotting accessors.

## Decisions

- Deepen the existing module; do not add a pass-through module.
- Bind one interpreter when creating the planner.
- Recreate the planner only when edited TaxSpec produces a new interpreter.
- React retains UI state. Mafs retains rendering.
- Preserve current failure behavior: invalid edited TaxSpec keeps the prior interpreter; an unpreparable country yields no series.
- Cache prepared outcomes and stable accessors by country, schedules, display currency, and periods per year.
- Domain and rate-mode changes reuse preparation and sampling caches.
- Expose one immutable plotting catalogue for controls and legends; own country ordering and colors inside the planner.

## Planner ownership

- Country and schedule selection.
- Country preparation.
- Display-currency and pay-period outcome accessors.
- Rate percentage scaling.
- Plot-break conversion.
- Mode-to-series selection and styles.
- Sampling, bounds, discontinuities, domains, lookahead, and caches.
- Immutable plotting catalogue: country id, label, schedules, and color.

## React ownership

- Control state and editor state.
- URL synchronization.
- Passing current selections, display context, rate mode, and domain to the planner.
- Rendering the returned plan with Mafs.
- Rendering controls and legends from the planner catalogue.

## Staged implementation

1. **Characterize the current seam**
   - Add real TaxSpec-to-plan tests for every rate mode.
   - Record initial-plan and repeated-pan benchmarks.

2. **Move plotting catalogue**
   - Move country ordering, schedule metadata, and color assignment from `App.jsx`.
   - Return one cached immutable catalogue from the planner.
   - Update controls and legends to consume it.

3. **Move country preparation**
   - Move enabled-schedule filtering and `prepare()` calls behind the planner seam.
   - Cache by country, schedules, currency, and periods.
   - Keep accessor identities stable across domain and mode changes.

4. **Move display plotting semantics**
   - Move aligned-income handling, percentage scaling, and plot-break conversion.
   - Remove the four outcome wrappers and country-line assembly from `App.jsx`.

5. **Join existing planning**
   - Feed internally prepared series directly into sampling, bounds, jump detection, and domain splitting.
   - Preserve cache invalidation when interpreter or preparation inputs change.

6. **Delete old interface**
   - Remove `countryLines` and caller-built accessor requirements.
   - Remove obsolete App memos, constants, and derived arrays.
   - Remove temporary adapters.

## Verification

- Planner tests exercise real TaxSpec through the public planner interface without React, Mafs, or Monaco.
- All five rate modes preserve series, styles, bounds, forced breaks, and detected jumps.
- Annual, monthly, fortnightly, and weekly plots preserve domains and outcomes.
- Currency conversion preserves plotted values.
- Invalid edited TaxSpec and unpreparable-country behavior remain unchanged.
- Initial planning and repeated-pan median benchmarks regress no more than 1% across five batches.
- Production bundle size does not increase.
- Production LOC decreases materially.

## Complete when

- `App.jsx` contains no country preparation, plot-break conversion, outcome wrappers, or plot cache policy.
- Controls and legends use the planner's immutable plotting catalogue.
- The planner owns stable preparation/accessor and sampling caches.
- The old shallow planner interface and migration code are deleted.

## Blocked by

None. Compatible with issue 06; semantic break improvements remain issue 08.
