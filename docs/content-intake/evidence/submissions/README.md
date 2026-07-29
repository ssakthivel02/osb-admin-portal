# Siddhar Evidence Submission Packets

This directory accepts completed, machine-readable evidence packets only.

## Safety status

Every packet is non-production intake material. A packet must never:

- change a manifest status automatically;
- mark devotional content as authenticated by itself;
- set `productionEligible` to `true`;
- contain credentials, private correspondence, unnecessary personal data, or medical instructions;
- replace the preserved user-supplied devotional register.

AI chat exports, research plans, generated code, search suggestions, synthetic reviewer identities, generated legal conclusions, and unverified translations are working notes only. They are not archival witnesses, reviewer approvals, rights permissions, or completed evidence packets.

## Submission procedure

1. Copy `../siddhar-evidence-submission-packet-template.json` into this directory.
2. Rename it using `SID-SUB-YYYYMMDD-NNN.json`.
3. Set `manifestItemId` to an existing `SID-EV-*` item from `../siddhar-evidence-manifest.json`.
4. Record the current manifest status in `manifestStatusObserved` without changing the manifest.
5. Replace every placeholder with source, locator, file-integrity, reviewer, and rights metadata.
6. Place evidence files under `../uploads/` using non-sensitive filenames.
7. Calculate SHA-256 for every file and record the exact byte size and MIME type.
8. Register each real reviewer in `config/siddhar-reviewer-governance.json` using a stable non-sensitive `SID-REV-*` ID, approved roles, a non-sensitive attestation reference, registration date, and conflict-of-interest declaration. Keep names, email addresses, phone numbers, private correspondence, and identity-mapping records outside the repository.
9. Assign packet review roles only to active registered reviewers authorised for that role. The editorial approver must be different from every transcription, transliteration, and translation reviewer on the same packet.
10. Keep `UNRESOLVED` and `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` rights at `NO_REUSE_APPROVED`, with no decision record or reviewer assignment.
11. For `PERMISSION_GRANTED` or `RESTRICTED`, follow `../rights/README.md`, create one controlled `SID-RGT-DEC-*` record, and link the packet rights fields exactly to that decision.
12. Keep all four packet declarations set to `true`.
13. Run `npm run check:siddhar-submissions`.
14. Run `npm run check:siddhar-files` to compare each source-file declaration with committed bytes.
15. Run `npm run check:siddhar-coverage` to ensure every controlled source upload is owned by exactly one valid packet.
16. Run `npm run check:siddhar-reviewers` to validate reviewer IDs, role authorisation, dates, assignment coverage, and separation of duties.
17. Run `npm run check:siddhar-rights` to validate rights status, controlled decision provenance, authorised rights reviewers, permission evidence, expiry, and packet/decision reconciliation.
18. Submit the packet and source files for human review. Do not edit the canonical manifest status during intake.

## Reviewer identity and separation of duties

The repository stores only non-sensitive reviewer governance metadata. A valid registry entry requires:

- a stable `SID-REV-*` reviewer ID;
- a public role label and affiliation with no contact details;
- one or more approved review roles;
- an active/inactive flag;
- a completed conflict-of-interest declaration before active assignment;
- a unique `SID-REV-ATTEST-YYYYMMDD-NNN` attestation reference;
- a real registration date.

The governance gate rejects synthetic, generic, AI-generated, test, dummy, or placeholder identities; unknown or inactive reviewers; assignments outside approved roles; invalid dates; contact details in the public registry; and one reviewer acting as both editorial approver and preparation reviewer on the same packet.

The gate does not prove that an individual is qualified or that an attestation is genuine. The governance owner must retain the real identity mapping, qualifications, signed declarations, and approval records outside the repository.

## Rights decision provenance

Rights metadata is fail-closed:

- `UNRESOLVED` and `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` permit only `NO_REUSE_APPROVED`;
- `PERMISSION_GRANTED` requires an authorised rights reviewer, a controlled decision record, and a byte-verified permission document under `docs/content-intake/evidence/uploads/rights/`;
- `RESTRICTED` requires an authorised rights reviewer and a controlled restriction decision;
- broad statements such as “all ancient texts are public domain”, “copyright free”, or “free to use” are rejected;
- expired permissions, missing files, hash mismatches, MIME disguises, orphan decisions, duplicate decision references, and packet/decision mismatches fail CI;
- a rights decision never makes an item production eligible and never changes the evidence manifest.

Real permission correspondence, signatures, contact details, private legal advice, and identity mappings must remain in an access-controlled system outside GitHub.

## Coverage ownership rule

Every regular source file under `docs/content-intake/evidence/uploads/` must be declared by exactly one valid `SID-SUB-*` packet. The coverage gate rejects orphan files, duplicate ownership, missing declarations, unsafe paths, symbolic links, and unsupported extensions.

An absent uploads directory and zero completed packets is a valid, truthful baseline. Uncovered manifest controls are reported for planning but do not fail CI until a packet or file is added incorrectly.

## Accepted evidence files

- PDF
- JPEG
- PNG
- TIFF

Maximum file size is 100 MiB per file. The source-file integrity gate and rights-provenance gate both verify repository containment, regular-file status, byte size, SHA-256, extension, MIME declaration, and recognised PDF/JPEG/PNG/TIFF signatures for the files in their respective scopes.

These validators do not independently prove source authenticity, ownership, legal validity, territorial coverage, textual correctness, translation quality, reviewer competence, or lawful publication.

## Manual review still required

Qualified owners must still examine:

- source identity and catalogue details;
- folio, page, verse, and adjacent context;
- Tamil transcription;
- transliteration method;
- English translation;
- contradiction handling;
- reviewer qualifications and conflicts;
- rights-holder identity, permission scope, territory, duration, and restrictions;
- final editorial and publication status.

## Current repository state

No completed evidence packet, registered reviewer, controlled rights decision, or permission document is committed at present. This directory intentionally contains only this instruction file until real source material, reviewer attestations, and rights evidence are supplied.
