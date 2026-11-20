# Siddhar Editorial Disposition Records

This directory contains non-production editorial-decision metadata. An editorial decision records a review outcome; it does **not** authenticate a text, change the evidence manifest, approve publication, or make an item production eligible.

## Safety rules

- Every decision uses a stable `SID-ED-DEC-YYYYMMDD-NNN` identifier.
- Every decision references exactly one existing `SID-SUB-*` packet and one existing `SID-EV-*` manifest control.
- The deciding reviewer must be the packet's completed `EDITORIAL` reviewer, must be active, conflict-cleared, and authorised for `EDITORIAL` review.
- `SOURCE_REVIEW_ONLY` requires all four packet review roles to be complete and requires authoritative rights provenance: `PERMISSION_GRANTED_REVIEWED` or `RESTRICTED_REVIEWED`.
- `HOLD_FOR_REVIEW`, `REJECT_EVIDENCE`, and `CORRECTION_EVIDENCE_ONLY` remain non-release dispositions and may retain unresolved rights because they do not approve reuse.
- A manifest item marked `CONTRADICTED_DO_NOT_PUBLISH` can never receive `SOURCE_REVIEW_ONLY`; it remains blocked even after correction evidence is supplied.
- Decision dates cannot predate packet submission or any review required for that disposition.
- AI-generated approvals, synthetic reviewers, broad authentication claims, and publication approvals are forbidden.
- Private correspondence, signatures, personal contact details, and identity mappings stay outside GitHub.

## Directory layout

```text
docs/content-intake/evidence/editorial/
  README.md
  siddhar-editorial-decision-template.json
  decisions/
    SID-ED-DEC-YYYYMMDD-NNN.json
```

The `decisions/` directory may remain absent while there are no genuine editorial decisions.

## Decision procedure

1. Complete a valid evidence packet and commit its source evidence under the controlled source-upload namespace.
2. Run the submission, source-file integrity, source-coverage, reviewer-governance, and rights-provenance gates.
3. Ensure the packet is `SUBMITTED_FOR_REVIEW`.
4. Complete the review roles required by the intended disposition.
5. For `SOURCE_REVIEW_ONLY`, complete all four review roles and obtain authoritative rights provenance.
6. For a contradicted manifest item, preserve the do-not-publish block and use only a non-release disposition allowed by governance.
7. Copy the editorial decision template into `decisions/` and replace every placeholder with current repository facts.
8. Record the current manifest status, packet status, packet-proposed disposition, rights status, rights decision ID, and exact completed review-role set.
9. Record a substantive decision basis. Do not claim authentication, publication approval, or production readiness.
10. Run `npm run check:siddhar-editorial`.
11. Keep the canonical manifest and application data unchanged until a separate, explicitly authorised release process exists.

## What the gate proves

A passing gate proves that the editorial decision is structurally valid, reconciled to the current packet and manifest, made by an authorised editorial reviewer after the required reviews, compatible with the current rights state, and non-production.

It does not prove source authenticity, textual correctness, translation quality, reviewer competence, legal ownership, legal enforceability, or publication suitability.
