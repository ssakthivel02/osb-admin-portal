# Siddhar Evidence Submission Packets

This directory accepts completed, machine-readable evidence packets only.

## Safety status

Every packet is non-production intake material. A packet must never:

- change a manifest status automatically;
- mark devotional content as authenticated by itself;
- set `productionEligible` to `true`;
- contain credentials, private correspondence, unnecessary personal data, or medical instructions;
- replace the preserved user-supplied devotional register.

AI chat exports, research plans, generated code, search suggestions, synthetic reviewer identities, and unverified translations are working notes only. They are not archival witnesses, reviewer approvals, rights permissions, or completed evidence packets.

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
10. Keep all four declarations set to `true`.
11. Run `npm run check:siddhar-submissions`.
12. Run `npm run check:siddhar-files` to compare each declaration with the committed file bytes.
13. Run `npm run check:siddhar-coverage` to ensure every controlled upload is owned by exactly one valid packet and every packet declaration resolves to one controlled upload.
14. Run `npm run check:siddhar-reviewers` to validate reviewer IDs, role authorisation, review dates, assignment coverage, and separation of duties.
15. Submit the packet and source files for human review. Do not edit the canonical manifest status during intake.

## Reviewer identity and separation of duties

The repository stores only non-sensitive reviewer governance metadata. A valid registry entry requires:

- a stable `SID-REV-*` reviewer ID;
- a public role label and affiliation with no contact details;
- one or more approved review roles;
- an active/inactive flag;
- a completed conflict-of-interest declaration before active assignment;
- a unique `SID-REV-ATTEST-YYYYMMDD-NNN` attestation reference;
- a real registration date.

The governance gate rejects:

- synthetic, generic, AI-generated, test, dummy, or placeholder identities;
- packet reviewer values that do not use the stable reviewer-ID format;
- references to reviewers absent from the registry;
- inactive reviewers or reviewers without a conflict declaration;
- assignments outside a reviewer's approved roles;
- completed reviews without a real review date;
- review dates in the future or before packet submission;
- one reviewer holding both an editorial approval role and a preparation role in the same packet;
- contact details or unexpected private-identity fields in the public registry.

The gate does not prove that an individual is qualified or that an attestation is genuine. The governance owner must retain the real identity mapping, qualifications, signed declarations, and approval records outside the public repository.

## Coverage ownership rule

Every regular file under `docs/content-intake/evidence/uploads/` must be declared by exactly one valid `SID-SUB-*` packet. The coverage gate rejects:

- orphan files with no valid packet declaration;
- one path declared by more than one packet;
- declarations pointing to missing files;
- malformed or stale packets being used to satisfy coverage;
- symbolic links or redirected upload directories;
- unsupported file extensions inside the controlled uploads path.

An absent uploads directory and zero completed packets is a valid, truthful baseline. Uncovered manifest controls are reported for planning but do not fail CI until a packet or file is added incorrectly.

## Accepted evidence files

- PDF
- JPEG
- PNG
- TIFF

Maximum file size is 100 MiB per file. The packet validator checks declared metadata. The file-integrity validator additionally checks that each path resolves inside the repository, exists as a regular non-symlink file, matches the declared byte size and SHA-256 digest, and has a PDF/JPEG/PNG/TIFF byte signature consistent with its extension and declared MIME type.

The coverage validator reconciles packet declarations, controlled uploads, and manifest controls. The reviewer-governance validator reconciles packet assignments with the non-sensitive reviewer registry and role-separation policy. None of these validators proves that a file is an authentic source, complete, correctly catalogued, legally reusable, accurately transcribed, or reviewed by a suitably qualified person.

## Manual review still required

A successful validation result means only that the packet is structurally complete, safely linked to the evidence backlog, byte-consistent with the committed file, uniquely owns its controlled upload, and uses structurally valid reviewer assignments. Qualified reviewers must still examine:

- source identity and catalogue details;
- folio, page, verse, and adjacent context;
- Tamil transcription;
- transliteration method;
- English translation;
- contradiction handling;
- publication and image rights;
- reviewer qualifications and conflicts;
- final editorial status.

## Current repository state

No completed evidence packet or registered reviewer is committed at present. This directory intentionally contains only this instruction file until real source material, reviewer attestations, and rights metadata are supplied.
