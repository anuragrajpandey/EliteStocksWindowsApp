# ModernV2.css — Remaining Shared-Look Scoped Rules: Follow-Up Folding Plan

Status: **groups A, B, C, D, E, H applied**; remaining: F, G, I.
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

### B. Sidebar header + add-group button — `--cat-hdr-*` / `--cat-add-*` (lines ~636-677) — ✅ APPLIED

Done: title, section-header, add-group-btn, and divider surface + typography
values folded into `--cat-title-*` / `--cat-hdr-*` / `--cat-add-*` /
`--cat-divider-*` tokens (v2 values), consumed by the CategoryStrip.css bases
with v1 fallbacks. The `.sidebar-section-header::after` per-version exception
resolved exactly as predicted: v3's override wins, so the v2 gradient moved
into a **v2 definition of the existing `--ssha-divider-bg` token** (v3
redefines it in ModernV3.css; light sheet owns light). The `.category-strip-title::before`
dot has no v1 base (modern-UI construct) so it stays a thin consumer in
ModernV2.css with the shadow tokenized. Identical geometry (`transform`,
`height: 1px`, `margin`) stays literal in the bases. The audit's deleted-rule
coverage check was extended to accept base-rule literals + var() fallbacks
(a token v3 redefines would otherwise hide the v2 value behind first-wins).

### C. Section divider — `--cat-divider-*` (line ~683) — ✅ APPLIED

Done: `.section-divider` bg + width folded into `--cat-divider-bg` /
`--cat-divider-width` (v2 values: accent 30% gradient, `calc(100% - 40px)`),
consumed by the CategoryStrip.css base with the v1 gradient /
`calc(100% - 24px)` fallbacks. `height: 1px` and `margin` were identical to
the base and stay literal.

### D. Guide current-time indicator — `--gcti-*` (lines ~717-731) — ✅ APPLIED

Done: indicator gradient + glow + `::before` drop-shadow folded into
`--gcti-bg` / `--gcti-shadow` / `--gcti-before-filter`, consumed by all three
ChannelPanel.css indicator variants (the v2 rule tied the base variants on
specificity and won by load order, so **all** instances got the glow — all
three got the `box-shadow` consumer with `none` fallback).

### E. Guide scrollbars — `--guide-scroll-*` (lines ~695-706, 749-762) — ✅ APPLIED

Done: gradient thumbs folded into `--guide-scroll-strip-*` /
`--guide-scroll-ch-*`, consumed by the CategoryStrip/ChannelPanel bases with
the flat base thumbs as fallbacks. **Deviation from the plan**: the v2 thumbs
are **gradients**, not the flat `--scrollbar-*` values, so a shared family
would have changed the values — dedicated tokens were used instead.

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

### H. Guide program progress — `--guide-prog-*` (lines ~886-904) — ✅ APPLIED

Done: the two duplicated pairs were deduped (single render location; pair 2
wins shared props, pair 1's inset shadow survives) into `--guide-prog-*`
tokens (bar bg, inset shadow, margin-top, fill gradient + 10px glow, radius),
consumed by the ChannelPanel.css base with v1 fallbacks. `--accent-primary`
mixes kept as token values.

### I. Program context menu — `--ctx-menu-*` (lines ~906-942)

Rules: `.program-context-menu`, `.context-menu-item` (+ `:hover`),
`.context-menu-separator`. Surfaces: menu gradient bg, border, radius, shadow,
backdrop-filter, item hover bg, separator gradient. Base: the context-menu
component file. Layout (padding, font-size, radius of items) literal.

## Suggested order

1. **H** ✅ (dedupe + smallest surface set)
2. **A** ✅ (largest visible win; CategoryStrip already token-aware)
3. **I** (self-contained component)
4. **B** ✅ (careful: the `::after` per-version exception)
5. **D + E** ✅ (ChannelPanel; dedicated `--guide-scroll-*` family instead of the shared `--scrollbar-*`)
6. **C, G** — C ✅ done; G (resizer dot surfaces) remaining
7. **F** (defer / mostly literal layout)

Remaining: **I** (program context menu → `--ctx-menu-*`), **G** (resizer dots),
**F** (alternate-view NPB — mostly literal layout, low priority).

## Acceptance gates (same as the rest of the refactor)

- `pnpm css:audit` (check-globals + audit-tokens + check-css) passes.
- UI typecheck passes.
- Value-preservation audit against the previous commit: fallbacks neutral,
  token values == old literals, dark + light coverage, 0 drops.
- No `.modern-ui` scoped rule remains that defeats a v3 token consumer
  (re-run the leak sweep — currently 0).
