# Accessibility Semantic Baseline

**Date:** 2026-07-28  
**Branch:** `quality/accessibility-baseline`  
**Delivered through:** `quality/ci-gate`  
**Parent commit:** `79473c351ef95849375fd082b417f821d98b4b50`  
**Implementation commit:** `276c9f1e5e9166e0833f5e21fb4fb48f5d3dddf8`  
**Production impact:** None

## Objective

Complete the next verified remediation backlog item by establishing a dependency-minimal accessibility baseline for keyboard bypass navigation, landmark structure, heading hierarchy, informative-image alternatives, and in-page link integrity.

## Repository inspection

Before implementation:

- repository search found no existing skip link, automated accessibility suite, or axe integration;
- the page already used semantic `header`, `nav`, `main`, `section`, and `footer` elements;
- the primary navigation already had an accessible name;
- both major informative images already had descriptive `alt` text;
- the existing quality workflow already executed ESLint, strict TypeScript, Vitest, build, dependency audit, and CodeQL;
- adding an accessibility dependency would require a lockfile change and was unnecessary for this narrow semantic baseline.

## Exact changes

### `src/App.tsx`

- Added a first-focusable `Skip to main content` link.
- Added stable `main-content` target identification.
- Added `tabIndex={-1}` to the main landmark so the bypass target can receive programmatic focus without entering normal tab order.
- Imported the isolated accessibility stylesheet.

### `src/accessibility.css`

- Added visible-on-focus styling for the skip link.
- Added a high-contrast focus treatment.
- Kept the link visually out of the way until focused.
- Disabled the transition when reduced motion is requested.

### `src/accessibilityBaseline.test.tsx`

Added deterministic Vitest assertions for:

1. keyboard bypass navigation and focusable main target;
2. exactly one page-level `h1`;
3. named primary navigation;
4. non-empty alternative text for every informative image exposed through the accessibility tree;
5. discernible text for every link;
6. valid targets for every in-page anchor.

## Command and workflow evidence

No local PASS result is claimed. Validation evidence comes from GitHub Actions for implementation commit `276c9f1e5e9166e0833f5e21fb4fb48f5d3dddf8`.

- Quality Gate run `30319275564` (#153): **success**.
- CodeQL run `30319275565` (#47): **success**.

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

It also uploaded type-check evidence, JUnit test evidence, the production build artifact, and dependency-audit evidence. CodeQL completed JavaScript and TypeScript repository analysis successfully.

## Safety boundaries

- no data deletion;
- no secret or credential changes;
- no dependency or lockfile changes;
- no production infrastructure or deployment changes;
- no authentication, API, persistence, analytics, scoring, or AI changes;
- no Siddhar content status or publication changes;
- no merge to `main`.

## Blockers

1. This is a semantic regression baseline, not a complete WCAG audit.
2. Automated colour-contrast calculation is not yet enforced.
3. No browser-based keyboard traversal or screen-reader validation has been recorded.
4. Focus order, zoom/reflow, forced-colour mode, and mobile assistive-technology behaviour still require manual or browser-driven testing.
5. Dynamic states remain limited because the preview does not yet contain real dialogs, forms, menus, validation, or asynchronous content.

## Next task

Add a documented colour-contrast inventory for the design tokens and introduce a small automated check for known foreground/background token pairs. Do not claim full WCAG conformance until browser-based keyboard, zoom/reflow, and assistive-technology testing are completed.

## Status

ACCESSIBILITY SEMANTIC BASELINE IMPLEMENTED  
QUALITY GATE AND CODEQL VERIFIED  
FULL WCAG CONFORMANCE NOT ESTABLISHED
