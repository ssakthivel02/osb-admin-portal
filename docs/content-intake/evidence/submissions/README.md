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
8. Keep all four declarations set to `true`.
9. Run `npm run check:siddhar-submissions`.
10. Run `npm run check:siddhar-files` to compare each declaration with the committed file bytes.
11. Run `npm run check:siddhar-coverage` to ensure every controlled upload is owned by exactly one valid packet and every packet declaration resolves to one controlled upload.
12. Submit the packet and source files for human review. Do not edit the canonical manifest status during intake.

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

The coverage validator reconciles packet declarations, controlled uploads, and manifest controls. None of these validators proves that a file is an authentic source, complete, correctly catalogued, legally reusable, or accurately transcribed.

## Manual review still required

A successful validation result means only that the packet is structurally complete, safely linked to the evidence backlog, byte-consistent with the committed file, and uniquely owns its controlled upload. Qualified reviewers must still examine:

- source identity and catalogue details;
- folio, page, verse, and adjacent context;
- Tamil transcription;
- transliteration method;
- English translation;
- contradiction handling;
- publication and image rights;
- final editorial status.

## Current repository state

No completed evidence packet is committed at present. This directory intentionally contains only this instruction file until real source material and reviewer metadata are supplied.
