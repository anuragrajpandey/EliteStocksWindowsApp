import { getCachedSettings } from '../services/settings-cache';
import v2CssUrl from '../styles/ModernV2.css?url';
import v3CssUrl from '../styles/ModernV3.css?url';
import lightThemeOverridesUrl from '../light-theme-overrides.css?url';

/**
 * UI Design versions (Settings → UI → UI Design).
 *
 *   v1 — Classic: no `modern-ui` classes, only the base stylesheet is loaded.
 *   v2 — Modern:  `html.modern-ui`, loads ModernV2.css (also required by v3).
 *   v3 — Liquid Glass: `html.modern-ui.modern-ui-v3`, loads ModernV2.css + ModernV3.css.
 *
 * The version stylesheets are injected at runtime so users only download the
 * CSS for the design they actually use. Cascade order is guaranteed by
 * inserting every version link immediately before the (always-loaded)
 * light-theme-overrides link, which stays last.
 */
export type UiDesign = 'v1' | 'v2' | 'v3';

let v2Link: HTMLLinkElement | null = null;
let v3Link: HTMLLinkElement | null = null;
let lightLink: HTMLLinkElement | null = null;

function makeLink(href: string): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.uiVersionCss = 'true';
  return link;
}

/** The light-theme override sheet is always needed and must win every tie, so it stays last. */
function ensureLightLink(): HTMLLinkElement {
  if (!lightLink) {
    lightLink = makeLink(lightThemeOverridesUrl);
    document.head.appendChild(lightLink);
  }
  return lightLink;
}

/** Insert a version stylesheet before the light-theme sheet, preserving v2 → v3 → light order. */
function insertBeforeLight(link: HTMLLinkElement): void {
  const anchor = ensureLightLink();
  document.head.insertBefore(link, anchor);
}

/** Normalize the persisted setting value (string | boolean) into a UiDesign. */
export function resolveUiDesign(value: unknown): UiDesign {
  if (value === 'v3') return 'v3';
  if (value === false || value === 'v1') return 'v1';
  return 'v2';
}

/**
 * Apply a UI design version:
 *  - toggles `modern-ui` / `modern-ui-v3` classes and `data-ui-version`
 *  - loads/unloads the version stylesheets accordingly (idempotent)
 */
export function applyUiDesign(design: UiDesign): void {
  const root = document.documentElement;
  if (!root) return;

  root.classList.remove('modern-ui', 'modern-ui-v3');
  if (design === 'v3') {
    root.classList.add('modern-ui', 'modern-ui-v3');
  } else if (design === 'v2') {
    root.classList.add('modern-ui');
  }
  root.setAttribute('data-ui-version', design);

  // V2 styles apply to both V2 and V3.
  if (design === 'v2' || design === 'v3') {
    if (!v2Link) v2Link = makeLink(v2CssUrl);
    if (!v2Link.isConnected) insertBeforeLight(v2Link);
  } else if (v2Link) {
    v2Link.remove();
  }

  if (design === 'v3') {
    if (!v3Link) v3Link = makeLink(v3CssUrl);
    if (!v3Link.isConnected) insertBeforeLight(v3Link);
  } else if (v3Link) {
    v3Link.remove();
  }

  ensureLightLink();
}

/**
 * Apply the persisted design before first paint (best-effort, from the shared
 * settings cache). The authoritative application happens again once the app's
 * main settings sync resolves.
 */
export function initUiDesign(): void {
  getCachedSettings()
    .then((res) => {
      const value = res?.data?.modernUiEnabled;
      applyUiDesign(value === undefined || value === null ? 'v3' : resolveUiDesign(value));
    })
    .catch(() => applyUiDesign('v3'));
}
