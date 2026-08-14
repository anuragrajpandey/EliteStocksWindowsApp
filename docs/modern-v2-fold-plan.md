# ModernV2.css — Remaining Shared-Look Scoped Rules: Follow-Up Folding Plan

Status: **group A applied** (category icon accents → `--cat-icn-*`); remaining groups follow this plan.
Audited against `041caf96` + the current working tree (Aug 2026).

## Context

ModernV2.css holds `.modern-ui`-scoped rules that apply to **both** v2 and v3
(`html.modern-ui` matches v2; `html.modern-ui.modern-ui-v3` matches v3 too).
The leak sweep found zero remaining leaks in these rules — ModernV3.css has
**no override** for any class below (verified: 0 references for each family),
so none of them defeat a v3-redefined token consumer. They are **shared looks**:
v2 authors the value, v3 inherits it unchanged.

That means the fold is *not* per-version. The recipe is:

1. Define a token family in **ModernV2.css** (`html.modern-ui` block) with the
   current literal values (v2 == v3 for these; a future v3 override just
   redefines the same token in ModernV3.css, which is what the whole refactor
   has been building toward).
2. Move the surface literals into the component bases as
   `var(--<token>, <old base value>)` consumers so v1 stays untouched.
3. Delete the `.modern-ui` scoped rules from ModernV2.css.
4. Keep layout/geometry (positions, sizes, cursor, transforms) literal in the
   bases — only surfaces (background, border, color, shadow, filter, radius)
   become tokens.

## Remaining groups (in file order)

### A. Category sidebar icons — `--cat-icn-*` — ✅ APPLIED

Done: `.category-icon`, `.category-icon svg`, and the five accent families
(all-channels / favorites / watchlist / recent / custom-group) with base +
`:hover`/`.selected` states folded into a 40-token `--cat-icn-*` family in
ModernV2.css, consumed by CategoryStrip.css (`.category-icon` + the five
accent classes, placed before the VOD active-icon rules so tie-breaking is
unchanged). The 12 `.modern-ui` scoped rules were deleted. Value-preserving
vs the base: radius 5→6, color 0.5→0.6, display inline-flex→flex, border
none→`1px solid`, transition, and 11px svg all became tokens with the v1
values as fallbacks — the audit's deleted-rule coverage check caught that
`display: flex` needed its own token.

### B. Sidebar header + add-group button — `--cat-hdr-*` / `--cat-add-*` (lines ~636-677)

Rules: `.sidebar-section-header` (+ `::after`), `.category-strip-title`
(+ `::before`), `.category-strip-header .add-group-btn`, `.add-group-btn:hover`.

- `sidebar-section-header::after` is the one class in this family that
  **v3 does override** (ModernV3.css has a rule for it) — check whether the v3
  override beats the v2 value before folding; if so this sub-rule becomes a
  real per-version pair (`--cat-hdr-after-*` in both sheets).
- Surfaces: title color, divider `::after`/`::before` gradient, add-btn
  bg/border/color/hover.
- Base consumers: `CategoryStrip.css`.

### C. Section divider — `--cat-divider-*` (line ~683)

Single rule `.section-divider` (gradient line). Fold into the CategoryStrip
base; keep the `::before`-style geometry literal.

### D. Guide current-time indicator — `--gcti-*` (lines ~717-731)

Rules: `.guide-current-time-indicator`, `.guide-time-header .guide-current-time-indicator::before`.
The v2 `::before` (dot) and the indicator bar are v2 looks v3 keeps. Base:
`ChannelPanel.css`. Surfaces: indicator bg/box-shadow, `::before` bg/size.

### E. Guide scrollbars — `--guide-scroll-*` (lines ~695-706, 749-762)

Rules: `.category-strip-scrollable::-webkit-scrollbar(+thumb)` and
`.guide-channels::-webkit-scrollbar(+thumb)`. Note: ModernV3.css has its own
**separate** scrollbar blocks (failover/managers, audio/subtitle) that do not
target these two classes — so this is a clean shared look. Base: ChannelPanel /
CategoryStrip. Consider sharing the `--scrollbar-*` family introduced in the
ModernV3.css blocks instead of a new `--guide-scroll-*` family, since the
values are the same (thin, 0.08 thumb, accent hover).

### F. Alternate-view NowPlayingBar — `--npb-alt-*` (lines ~764-800)

Rules: `.guide-top-section.alternate-view .now-playing-bar .npb-*` (progress
section, controls row, extra controls, volume slider, description/divider,
channel section) — inside a `@media` block. These are v2-authored layout +
surfaces for the alternate guide layout; v3 keeps them. Most of the values are
spacing/geometry; the few surfaces (e.g. divider background) can be folded, but
**low priority** — this is the messiest group (deep selectors, media query).
Recommend deferring until the simpler groups are done, and treating most of it
as intentional literal layout.

### G. Video preview resizer — `--resizer-*` (lines ~807-882)

Rules: `.guide-preview-resizer` (+ `.vertical`), `.resizer-dot` (+ vertical,
hover, active states). Almost entirely geometry/transform/cursor — only the dot
backgrounds/glow shadows are surfaces (`--resizer-dot-bg`, `--resizer-dot-glow`,
hover/active variants). Base: `ChannelPanel.css`. Fold the dot surfaces;
**keep all geometry literal** (it is not themable).

### H. Guide program progress — `--guide-prog-*` (lines ~886-904)

Rules: `.guide-program-progress-bar`, `.guide-program-progress-fill`
(duplicated at ~733-748 and ~886-904 — **dedupe first**, one pair is dead).
Surfaces: bar bg/radius, fill gradient + glow shadow. Base: `ChannelPanel.css`
or `ProgramBlock.css` (whichever owns the rendered elements). Values use
`--accent-primary` mixes — keep those as token values.

### I. Program context menu — `--ctx-menu-*` (lines ~906-942)

Rules: `.program-context-menu`, `.context-menu-item` (+ `:hover`),
`.context-menu-separator`. Surfaces: menu gradient bg, border, radius, shadow,
backdrop-filter, item hover bg, separator gradient. Base: the context-menu
component file. Layout (padding, font-size, radius of items) literal.

## Suggested order

1. **H** (dedupe + smallest surface set)
2. **A** (largest visible win; CategoryStrip already token-aware)
3. **I** (self-contained component)
4. **B** (careful: the `::after` per-version exception)
5. **D + E** (ChannelPanel, shares the new `--scrollbar-*` family)
6. **C, G** (small)
7. **F** (defer / mostly literal layout)

## Acceptance gates (same as the rest of the refactor)

- `pnpm css:audit` (check-globals + audit-tokens + check-css) passes.
- UI typecheck passes.
- Value-preservation audit against the previous commit: fallbacks neutral,
  token values == old literals, dark + light coverage, 0 drops.
- No `.modern-ui` scoped rule remains that defeats a v3 token consumer
  (re-run the leak sweep — currently 0).
