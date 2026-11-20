# Siddhar Decision-Subject Fingerprint and Stale-Decision Gate

**Date:** 2026-11-20  
**Prepared branch:** `quality/siddhar-decision-fingerprint`  
**Review branch:** `quality/ci-gate`  
**Review base:** `audit/repository-baseline`  
**Production impact:** None  
**Automatic manifest changes:** 0  
**Publication approvals:** 0

## Objective

Complete the next verified remediation item from the editorial-disposition evidence record: bind every future editorial decision to the exact canonical evidence packet and, when present, the exact controlled rights decision reviewed at sign-off.

The gate must reject stale decisions if either subject changes, preserve the Karuvoorar contradiction block, add no runtime dependency, make no production change, and never fabricate evidence or human review.

## Repository truth before this batch

- The prior progress record explicitly named a dependency-free decision-subject fingerprint / stale-decision gate as the next task.
- The evidence manifest contains 24 controlled `SID-EV-*` items.
- `SID-EV-003` remains `CONTRADICTED_DO_NOT_PUBLISH`.
- The repository contains zero completed evidence packets, zero rights decisions, and zero editorial decisions.
- Therefore no real decision fingerprint may be invented merely to improve coverage.

## Final implementation head before this evidence record

`2c5c101ae929fb937eeb3c712072299ff7cf289c`

## Files added

1. `scripts/siddhar-subject-fingerprint.mjs`
2. `scripts/siddhar-subject-fingerprint.test.mjs`
3. `scripts/print-siddhar-subject-fingerprint.mjs`
4. `scripts/print-siddhar-subject-fingerprint.test.mjs`
5. `docs/quality/2026-11-20-siddhar-decision-fingerprint.md`

## Files updated

6. `config/siddhar-editorial-disposition-governance.json`
7. `docs/content-intake/evidence/editorial/siddhar-editorial-decision-template.json`
8. `scripts/check-siddhar-editorial-disposition.mjs`
9. `scripts/check-siddhar-editorial-disposition.test.mjs`
10. `docs/content-intake/evidence/editorial/README.md`
11. `package.json`

No dependency was added. `package-lock.json` is unchanged by this batch.

## Core contract

The editorial governance now fixes:

```text
algorithm: SHA256_CANONICAL_JSON_V1
fingerprint: sha256:<64 lowercase hex characters>
no-rights-decision sentinel: NONE
```

An editorial decision records:

- `subjectFingerprintAlgorithm`
- `packetFingerprint`
- `rightsDecisionFingerprint`

The packet fingerprint covers the complete parsed packet object, including source metadata, locators, file declarations, review state, rights state, disposition, declarations, and notes.

If a packet references a real `SID-RGT-DEC-*` record, the rights-decision fingerprint covers that complete parsed decision object. If no controlled rights decision exists, the only valid value is `NONE`.

## Canonicalisation semantics

`SHA256_CANONICAL_JSON_V1`:

- recursively sorts object keys using locale-independent JavaScript code-unit ordering;
- preserves array order;
- preserves strings exactly, including whitespace;
- preserves JSON primitive types;
- rejects non-finite numbers;
- rejects `undefined`, functions, symbols, and bigint rather than silently dropping values;
- hashes UTF-8 canonical JSON with Node's built-in SHA-256 implementation.

Formatting and object-key ordering alone therefore do not make a decision stale. Semantic changes do.

## Forty-seven quality controls added

### Canonical fingerprint semantics — 20 controls

1. Fix the algorithm identifier to `SHA256_CANONICAL_JSON_V1`.
2. Fix the no-rights sentinel to `NONE`.
3. Ensure `NONE` is never accepted as a SHA-256 fingerprint.
4. Sort object keys recursively.
5. Preserve array order as semantic input.
6. Preserve string whitespace.
7. Preserve null, boolean, number, and string types.
8. Produce identical fingerprints for equivalent object-key order.
9. Change fingerprints when nested values change.
10. Change fingerprints when array order changes.
11. Change fingerprints when a value type changes.
12. Change fingerprints when a field is added.
13. Emit lowercase `sha256:<64 hex>` only.
14. Reject uppercase digest text.
15. Reject short digests.
16. Reject unprefixed digests.
17. Preserve Unicode deterministically.
18. Reject NaN.
19. Reject Infinity.
20. Reject values that canonical JSON cannot represent rather than silently deleting them.

### Read-only operator utility — 10 controls

21. Fingerprint a controlled `SID-SUB-*` packet file.
22. Fingerprint a controlled `SID-RGT-DEC-*` rights-decision file.
23. Produce identical fingerprints for equivalent JSON key order.
24. Reject files outside the packet / rights-decision namespaces.
25. Reject parent-directory traversal.
26. Reject Windows-style path separators.
27. Reject non-JSON subject files.
28. Reject missing subject files.
29. Reject malformed JSON rather than hashing malformed raw bytes.
30. Reject symbolic links to prevent subject substitution.

The utility is read-only:

```bash
npm run fingerprint:siddhar -- <packet-path> [rights-decision-path ...]
```

It writes no repository state, changes no decision, and grants no approval.

### Editorial stale-decision integration — 17 controls

31. Report a matching packet/rights subject as `FRESH`.
32. Reject a packet changed after editorial sign-off.
33. Detect packet changes even when legacy semantic snapshot fields remain unchanged.
34. Detect source-file declaration changes after sign-off.
35. Detect review-note changes after sign-off.
36. Reject malformed packet fingerprints.
37. Reject unsupported fingerprint algorithms.
38. Require `NONE` when no controlled rights decision exists.
39. Require a real fingerprint when a controlled rights decision exists.
40. Reject a rights decision changed after editorial sign-off.
41. Accept a current rights-decision fingerprint for `SOURCE_REVIEW_ONLY`.
42. Report `NO_DECISION` for manifest items without editorial decisions.
43. Sort fingerprint coverage deterministically by manifest ID.
44. Preserve the Karuvoorar contradiction block even when the subject fingerprint is fresh.
45. Reject governance drift in the fingerprint algorithm.
46. Reject governance drift in the fingerprint pattern.
47. Reject governance drift in the `NONE` sentinel.

The existing malformed-decision regression was also strengthened so malformed/non-object editorial files are counted in the global invalid-fingerprint total even when they cannot be scoped to a manifest item.

## Report fields added

The machine-readable editorial report now includes:

- `malformedFingerprintCount`
- `stalePacketFingerprintCount`
- `staleRightsDecisionFingerprintCount`
- `freshFingerprintDecisionCount`
- `staleFingerprintDecisionCount`
- `invalidFingerprintDecisionCount`
- `unscopedInvalidFingerprintDecisionCount`
- `noDecisionFingerprintManifestItems`
- `fingerprintAlgorithm`
- `fingerprintCounts`
- `fingerprintCoverageByManifestItem`

Per-manifest fingerprint states are:

- `NO_DECISION`
- `FRESH`
- `STALE`
- `INVALID`

A stale fingerprint is a hard validation failure. It cannot be treated as current editorial readiness.

## End-to-end findings and corrections

### 1. Locale-dependent canonical ordering risk

The first canonical helper used `localeCompare()` for key ordering. That can differ with runtime locale / ICU behavior, which is unacceptable for a durable subject digest.

Correction: canonical object keys now use fixed JavaScript code-unit `.sort()` ordering.

### 2. Replacement-string test fixture corruption

During test-fixture editing, a JavaScript `String.replace` replacement string containing `$'` triggered replacement-token semantics and corrupted the fixture. Lint caught the unterminated string before tests could run.

Correction: the complete editorial test file was rebuilt from the last green `quality/ci-gate` version and all fingerprint additions were reapplied through function-valued replacements, which do not interpret `$'` tokens.

### 3. Caught-error provenance

ESLint's `preserve-caught-error` rule correctly rejected the fingerprint CLI's JSON parse rethrow because it did not retain the source exception.

Correction: the user-facing error now carries `{ cause: error }`.

### 4. Malformed decision accounting

A malformed JSON editorial decision already failed validation, but because it returned before subject reconciliation it could understate the global invalid-fingerprint total.

Correction: malformed/non-object decision records now contribute to `invalidFingerprintDecisionCount` through `unscopedInvalidFingerprintDecisionCount`.

No lint, test, audit, or CodeQL rule was weakened to accommodate these findings.

## Final child-branch verification

Exact implementation head:

`2c5c101ae929fb937eeb3c712072299ff7cf289c`

GitHub Actions:

- Quality Gate #351 — run `44679116019` — **SUCCESS**
- CodeQL #245 — run `44679115910` — **SUCCESS**

Quality Gate evidence:

```text
20 test files passed
244 tests passed
0 failed
0 errors

public-environment policy: PASS
Siddhar manifest gate: PASS
submission packet gate: PASS
source-file integrity: PASS
source coverage: PASS
reviewer governance: PASS
rights provenance: PASS
editorial disposition + stale-subject gate: PASS
lint: PASS
strict TypeScript: PASS
tests: PASS
production build: PASS
dependency audit: PASS
```

Compared with the previous 197-test baseline, this batch adds 47 regression tests.

Dependency audit:

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 0,
  "critical": 0,
  "total": 0
}
```

### Key run #351 artifacts

- editorial/fingerprint report — artifact `14603866503` — `sha256:ed0f97e917c317049ced1f9bd0b6a84c05f37f39cc91b45c46f945c05ece911e`
- test evidence — artifact `14603172940` — `sha256:d303f9ce3b8888cdc7e0a0352a097101680d7a93045cf6243a8a563e43d331a2`
- dependency audit — artifact `14603312915` — `sha256:654321e49973d936622f2d6ab52f71e7f8c62dd160df3cedf40efb46ffadd6e4`
- production build — artifact `14603018423` — `sha256:2d03262cbb779a18a873811d44f6269342f0e2c7b47e72f81cae7a3fc07a4ab0`
- rights provenance — artifact `14603087592` — `sha256:6a53430b158e726e0ee1c2d85211690ac947b4087d872c5ceb5904a99f48a8e9`

Artifacts have seven-day retention.

## Current truthful fingerprint state

Run #351 reports:

```json
{
  "ok": true,
  "manifestItemCount": 24,
  "packetFileCount": 0,
  "rightsDecisionFileCount": 0,
  "editorialDecisionFileCount": 0,
  "validEditorialDecisionCount": 0,
  "malformedFingerprintCount": 0,
  "stalePacketFingerprintCount": 0,
  "staleRightsDecisionFingerprintCount": 0,
  "freshFingerprintDecisionCount": 0,
  "staleFingerprintDecisionCount": 0,
  "invalidFingerprintDecisionCount": 0,
  "unscopedInvalidFingerprintDecisionCount": 0,
  "noDecisionFingerprintManifestItems": 24,
  "fingerprintAlgorithm": "SHA256_CANONICAL_JSON_V1",
  "fingerprintCounts": {
    "FRESH": 0,
    "STALE": 0,
    "INVALID": 0,
    "NO_DECISION": 24
  },
  "readinessCounts": {
    "NO_PACKET": 24
  },
  "automaticManifestChanges": 0,
  "productionEligibleItems": 0,
  "publicationApprovals": 0
}
```

This is the correct result. There are no real editorial decisions to fingerprint yet.

`SID-EV-003` Karuvoorar remains `CONTRADICTED_DO_NOT_PUBLISH`. A future fresh fingerprint cannot remove that content block.

## Data appended without fabrication

The repository now has deterministic fingerprint-readiness coverage for all 24 manifest controls.

No source file, source page, catalogue record, reviewer, review result, rights decision, permission, editorial decision, fingerprint, authentication status, or publication status was invented.

## Manual work still required

1. Obtain the outstanding primary-source evidence for the P0 controls.
2. Create real `SID-SUB-*` packets with committed source files, exact hashes, MIME, size, repository identity, and precise locators.
3. Nominate real qualified transcription, transliteration, translation, editorial, and rights reviewers.
4. Keep private identities, contacts, qualifications, signed attestations, conflicts, correspondence, and legal advice outside GitHub.
5. Complete the required human reviews and record real review dates.
6. Obtain real item-level rights evidence / restrictions and create valid `SID-RGT-DEC-*` records where authoritative rights are asserted.
7. Before creating an editorial decision, use the read-only fingerprint command for the current packet and, where applicable, current rights decision.
8. Copy those exact fingerprints into the `SID-ED-DEC-*` record.
9. If a packet or rights decision changes after sign-off, do not reuse the old editorial decision; human re-review is required.
10. Keep `SID-EV-003` Karuvoorar limited to correction / hold / reject handling while contradicted.
11. Do not change the canonical manifest or application content merely because a fingerprint or editorial gate passes.

No manual coding or hashing implementation is required; the repository now provides the read-only fingerprint command.

## Blockers

- 0 completed evidence packets
- 0 controlled source files
- 0 registered reviewers
- 0 completed human reviews
- 0 rights decisions
- 0 editorial decisions
- 0 fresh decision fingerprints
- 24 controls remain `NO_PACKET` and `NO_DECISION`
- production publication remains blocked

## Next verified task

Add a dependency-free **editorial decision supersession and re-review lineage gate**.

The fingerprint gate correctly makes old decisions stale when their subjects change. The current one-decision-per-packet rule, however, would force an operator to delete the stale decision before adding a replacement, losing useful audit history.

The next gate should:

1. preserve old editorial decisions as immutable history;
2. add a controlled `supersedesDecisionId` lineage field;
3. require replacements to reference the same packet and manifest control;
4. require replacement chronology to move forward;
5. reject self-reference and supersession cycles;
6. permit only one active current decision per packet;
7. mark superseded decisions non-current without deleting them;
8. require a fresh packet / rights fingerprint on the replacement;
9. preserve reviewer authorisation and review chronology requirements;
10. preserve the Karuvoorar contradiction block;
11. report current, superseded, stale, and invalid decision lineage across all 24 controls;
12. make no automatic manifest, publication, or production change.

## Status

47 QUALITY CONTROLS / REGRESSION TESTS ADDED  
244 TESTS PASSED / 0 FAILURES / 0 ERRORS  
QUALITY GATE #351 SUCCESS  
CODEQL #245 SUCCESS  
NPM AUDIT: 0 VULNERABILITIES  
24 MANIFEST CONTROLS FINGERPRINT-REPORTED  
24 NO_DECISION / 0 FRESH / 0 STALE / 0 INVALID  
0 AUTOMATIC MANIFEST CHANGES / 0 PUBLICATION APPROVALS / 0 PRODUCTION ITEMS
