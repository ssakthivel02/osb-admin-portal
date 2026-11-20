# Siddhar Provenance Validator Quality Record

**Date:** 2026-07-28  
**Branch:** `quality/ci-gate`  
**Task:** Typed, non-production Siddhar source-record schema and runtime validator

## Objective

Implement the next verified content-integrity backlog item without converting the unverified Siddhar devotional intake into application or production data.

## Repository inspection

Before implementation:

- repository search found no existing `SiddharSourceRecord` schema or provenance validator;
- `tsconfig.app.json` already enforced strict TypeScript, including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noPropertyAccessFromIndexSignature`;
- Vitest was already configured through the existing `test` and `test:ci` scripts;
- the prior intake audit explicitly required a typed source-record contract and synthetic fixtures as the next task.

No dependency or lockfile change was required.

## Exact changes

### `src/content/siddharSourceRecord.ts`

Added:

- a closed ten-state editorial taxonomy;
- typed source-reference, reviewer, rights, and source-record contracts;
- a discriminated validation result;
- runtime checks for mandatory Tamil and Romanized identity fields;
- non-empty text and provenance requirements;
- at least one evidence reference;
- HTTP(S) evidence URLs;
- `YYYY-MM-DD` evidence-access and review dates;
- mandatory transcription, transliteration, translation, and editorial reviewers;
- mandatory transliteration standard and rights evidence;
- a hard non-production invariant requiring `productionEligible: false`;
- explicit rejection of unsupported labels such as `PRIMARY-TEXT ATTESTED`.

### `src/content/siddharSourceRecord.test.ts`

Added synthetic-only tests covering:

1. acceptance of a complete non-production record;
2. rejection of an unsupported editorial status and absent provenance;
3. rejection of production promotion, malformed evidence URLs, and malformed dates.

The fixtures do not assert that any real Siddhar text, manuscript, temple tradition, translation, or rights claim is authentic.

## Commits

- schema and validator: `0e38e1d0b033f0298cf0a0350dac0c4715213273`
- synthetic tests: `f1cb1aa91f26380125b41333ee3f70b5db6cb88d`
- strict indexed-access correction: `b272e022fa6de48ce366f3a2a4dd7245c35d9707`

## Command evidence

The first CI execution, Quality Gate run `30316139510` (#134), correctly failed at strict TypeScript type-checking. The diagnostic evidence showed `TS4111` errors because properties originating from `Record<string, unknown>` were accessed with dot notation while `noPropertyAccessFromIndexSignature` was enabled.

The validator was corrected to use bracket access for untrusted record properties. No compiler control was weakened or disabled.

For corrected commit `b272e022fa6de48ce366f3a2a4dd7245c35d9707`:

- Quality Gate run `30316260670` (#136): **success**;
- CodeQL run `30316260667` (#30): **success**.

The successful quality workflow executed the existing immutable dependency installation, lockfile drift check, lint, strict type-check, Vitest suite, production build, evidence uploads, and high-severity dependency audit.

No local shell PASS result is claimed. Validation evidence comes from GitHub Actions.

## Safety impact

- no data was deleted;
- no unverified devotional text was promoted into application data;
- no production content or infrastructure changed;
- no dependency or lockfile changed;
- no secrets were added or exposed;
- no authentication, API, persistence, deployment, or medical workflow changed;
- no merge to `main` was performed;
- the validator is isolated under `src/content` and enforces `productionEligible: false`.

## Blockers

1. The re-shared devotional register still lacks independently verified evidence for most real records.
2. Exact manuscript catalogue identifiers, scans, folios, editions, and page or verse locators remain unresolved for many claims.
3. Publication and reuse rights are not documented.
4. Named qualified reviewers and an approved editorial workflow do not yet exist.
5. The validator is not yet connected to a serialized intake format or a dedicated content-validation command.
6. The application still has minimal general test coverage and no measured coverage threshold.

## Next task

Add a machine-readable, non-production JSON intake format plus a dedicated `validate:content` command that validates files against this contract and fails closed. Use only synthetic fixtures in CI. Do not ingest the user-supplied devotional register as approved data until primary evidence, rights, and editorial review are complete.

## Status

TYPED PROVENANCE CONTRACT COMPLETE  
STRICT TYPESCRIPT, TESTS, BUILD, AUDIT, AND CODEQL VERIFIED  
REAL CONTENT AUTHENTICATION AND PRODUCTION PUBLICATION REMAIN BLOCKED
