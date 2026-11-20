# Colour Contrast Inventory and Automated Guard

**Date:** 2026-07-28  
**Branch:** `quality/color-contrast-inventory`  
**Delivered through:** `quality/ci-gate`  
**Parent commit:** `d2c3d7ad51f8f8a7a67dc206cefb68aa08d69189`  
**Implementation commit:** `0af010e170c2b651401affad094a7cc6a928bb03`  
**Production impact:** None

## Objective

Complete the next verified accessibility backlog item by documenting the known solid foreground/background design-token pairs and enforcing their minimum text-contrast ratios with deterministic, dependency-free tests.

## Repository inspection

Before implementation:

- the previous accessibility baseline explicitly identified colour-contrast automation as the next task;
- repository search returned no existing contrast calculator, contrast inventory, or contrast-specific automated test;
- `src/styles.css` defined the primary solid colour tokens used by the preview;
- several components also use translucent and gradient surfaces, which cannot be truthfully certified from token values alone;
- the existing Vitest, strict TypeScript, ESLint, build, dependency-audit, and CodeQL gates could validate a dependency-free contrast utility without changing `package-lock.json`.

## Exact changes

### `src/accessibility/colorContrast.ts`

Added:

- strict `ContrastPair` and `ContrastResult` contracts;
- six-digit hexadecimal colour validation;
- sRGB channel linearisation;
- relative-luminance calculation;
- WCAG-style contrast-ratio calculation;
- explicit normal-text and large-text thresholds;
- a closed inventory of eight verified solid token pairs;
- fail-closed evaluation returning the calculated ratio, required minimum, and pass state.

### `src/accessibility/colorContrast.test.ts`

Added deterministic Vitest assertions that:

1. every verified normal-text token pair remains at or above `4.5:1`;
2. black on white evaluates to approximately `21:1`;
3. identical white colours evaluate to approximately `1:1`;
4. the lower `3:1` threshold is used only for an explicitly declared large-text fixture;
5. malformed and non-hex colour inputs are rejected.

No dependency or lockfile change was required.

## Verified inventory

| Usage | Foreground | Background | Ratio | Required | Result |
|---|---:|---:|---:|---:|---|
| Primary text on page | `#eff6ff` | `#07101f` | `17.50:1` | `4.5:1` | Pass |
| Muted text on page | `#b9c8dd` | `#07101f` | `11.21:1` | `4.5:1` | Pass |
| Cyan accent on page | `#67e8f9` | `#07101f` | `13.14:1` | `4.5:1` | Pass |
| Gold accent on page | `#f9c74f` | `#07101f` | `12.07:1` | `4.5:1` | Pass |
| Dark text on cyan action | `#06101e` | `#67e8f9` | `13.16:1` | `4.5:1` | Pass |
| Dark text on gold pill | `#08101f` | `#f9c74f` | `12.05:1` | `4.5:1` | Pass |
| Light text on strong surface | `#dbeafe` | `#111f3a` | `13.44:1` | `4.5:1` | Pass |
| Muted text on strong surface | `#b9c8dd` | `#111f3a` | `9.66:1` | `4.5:1` | Pass |

These results apply only to the declared solid pairs. They do not certify text rendered over gradients, alpha-blended panels, images, browser focus states, forced-colour mode, or user-supplied themes.

## Command and workflow evidence

No local repository PASS result is claimed. Validation evidence comes from GitHub Actions for implementation commit `0af010e170c2b651401affad094a7cc6a928bb03`.

- Quality Gate run `30322054057` (#160): **success**.
- CodeQL run `30322054040` (#54): **success**.

The Quality Gate completed:

```bash
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm audit --audit-level=high
```

It also uploaded type-check evidence, JUnit test evidence, the production-build artifact, and dependency-audit evidence. CodeQL completed JavaScript and TypeScript repository analysis successfully.

## Safety boundaries

- no data deletion;
- no secret or credential changes;
- no dependency or lockfile changes;
- no production infrastructure or deployment changes;
- no authentication, API, persistence, analytics, scoring, or AI changes;
- no Siddhar content status or publication changes;
- no merge to `main`.

## Blockers

1. This inventory covers only known solid colour pairs.
2. Gradient and translucent-surface contrast still requires browser-computed sampling or manual review.
3. Focus indicators, hover states, selected states, and image overlays are not yet automatically measured.
4. No browser-driven keyboard traversal, zoom/reflow, forced-colour, or screen-reader validation has been recorded.
5. Full WCAG conformance remains unestablished.

## Next task

Add browser-rendered accessibility evidence for keyboard focus order, skip-link behaviour, zoom/reflow, and forced-colour mode. Prefer a small, reviewable test harness and avoid claiming screen-reader or full WCAG conformance without corresponding manual evidence.

## Status

SOLID TOKEN CONTRAST INVENTORY IMPLEMENTED  
QUALITY GATE AND CODEQL VERIFIED  
GRADIENT, TRANSLUCENT, AND BROWSER-STATE CONTRAST REMAIN UNVERIFIED
