# Siddhar Devotional Content Intake Audit

**Date:** 2026-07-27  
**Branch:** `quality/ci-gate`  
**Task type:** Documentation integrity and content-provenance control  
**Production impact:** None

## Objective

Revalidate the re-shared Siddhar Devotional Text Collection Register against the current repository and a limited set of authoritative public references, preserve the supplied material without silently promoting its claims, identify contradicted or unresolved records, and define the evidence required before production use.

## Repository inspection

The following repository checks were completed before writing the intake record:

- GitHub code search for `Agastiyar` returned no indexed matches.
- GitHub code search for `Siddhar` returned no indexed matches.
- GitHub code search for `Tirumantiram` returned no indexed matches.
- GitHub code search for `Bogar` returned no indexed matches.
- GitHub code search for `provenance` returned no indexed matches.
- Pull request #2 changed-file inventory contained quality, workflow, TypeScript, test, package, and documentation files but no pre-existing Siddhar devotional register.

These checks support the narrow conclusion that the supplied register was not already present in the inspected remediation changes. They do not prove that no related material exists in every historical branch, release artifact, external repository, drive, or unpublished document.

## Exact repository change

Created:

- `docs/content-intake/siddhar-devotional-register-unverified.md`

The new file:

- preserves the submitted names, verses, transliterations, meanings, source claims, authenticity labels, confidence labels, category report, source register, and gap register;
- explicitly marks all content as user-supplied and unverified;
- prevents the submitted labels from being interpreted as repository-approved authentication;
- defines a promotion rule requiring primary-source evidence, identifiers, review, rights, and editorial approval.

Intake commit:

- `2805f7e68e6235812c1596fbca000d7f36e29620`

## Limited external revalidation

This was a targeted source check, not an exhaustive manuscript study.

### 1. Thirumoolar opening verse — text/source supported

The Tamil Virtual Academy presents the line beginning `ஒன்றவன் தானே இரண்டவன் இன்னருள்` as the first `கடவுள் வாழ்த்து` verse of `திருமந்திரம்`. This supports the submitted text/source association for Thirumoolar Item 1.

Source reviewed:

- Tamil Virtual Academy, `திருமந்திரம்`, பொதுப்பாயிரம், கடவுள் வாழ்த்து, verse 1.
- https://www.tamilvu.org/slet/l41A0/l4170uri.jsp?book_id=118&head_id=67&song_no=2&sub_id=2371

The submitted publisher, editor, 1942 edition, and precise English gloss were not independently verified in this task.

### 2. Karuvoorar item — contradicted attribution

The submitted line `உலகெலாம் உணர்ந்து ஓதற்கு அரியவன்` is shown by the Tamil Virtual Academy as the opening verse of `பெரியபுராணம்` / `திருத்தொண்டர் புராணம்`, associated with Sekkizhar. It is not supported by that source as a Karuvoorar `திருவிசைப்பா` verse.

Source reviewed:

- Tamil Virtual Academy, `பெரியபுராணம்`, opening verse.
- https://www.tamilvu.org/slet/l41C1/l41C1per.jsp?sno=1

Required disposition:

- mark the current Karuvoorar Item 1 attribution as `CONTRADICTED — DO NOT PUBLISH`;
- do not silently replace it inside the preserved intake file;
- create a corrected editorial record only after a reviewer confirms the intended Karuvoorar verse from the Ninth Tirumurai.

### 3. GOML repository existence and catalogue model — supported

The Government of Tamil Nadu's Government Oriental Manuscripts Library catalogue is active and exposes structured manuscript fields including title, bundle number, work number, folio range, author, script, subject, status, and condition. This supports using official catalogue records as evidence.

Sources reviewed:

- GOML manuscript catalogue overview.
- https://www.tnarch.gov.in/goml/manuscript
- Example official Agathiyar manuscript record: `Agathiyar suthiram 18`, Bundle `TR 1204`, Work `R 6306`.
- https://tnarch.gov.in/goml/manuscripts/view/13943

### 4. Exact submitted manuscript identifiers — unresolved

The targeted public searches did not locate official indexed records for:

- `GOML R.No. 3215 — Agastiyar Parippooranam 400`;
- `GOML R.No. 121 — Pambatti Siddhar Padalgal`;
- the submitted Korakkar `Chandra Regai` claim;
- `TSML MS 542 — Thiruvisaippa (Karuvoorar Collection)`.

Absence from the targeted search is not proof that these manuscripts do not exist. Until an official catalogue page, catalogue scan, manuscript image, or repository confirmation is supplied, these identifiers must remain `UNRESOLVED` rather than `PRIMARY-TEXT ATTESTED`.

### 5. Catalogue evidence standard — supported

The National Mission for Manuscripts describes manuscript cataloguing fields such as repository, record number, title, author, script, status, subject, folios, beginning and ending lines, colophon, catalogue volume, bundle number, manuscript number, editor, publisher, and year. The intake promotion rule follows this evidence model.

Source reviewed:

- National Mission for Manuscripts, `Cataloguing Manuscripts`.
- https://namami.gov.in/cataloguing-manuscripts

## Records requiring manual evidence before authentication

The following submitted classes remain unverified in this task:

- Agastiyar invocation source, manuscript number, 1899 edition, publisher, editor, and verse number;
- Agastiyar Gayatri's claimed Puranic/scriptural status;
- Agastiyar temple handout and 108-name tradition;
- Bogar mantra links to `Bogar Saptakanda 7000`, Palani liturgy, and manuscript colophons;
- Korakkar verse wording and GOML witness;
- Pambatti Siddhar manuscript number;
- Sattaimuni and Konganar manuscript claims;
- Patanjali invocation's precise textual location;
- Dhanvantari mantra's precise Bhagavata Purana or Nighantu location;
- Nandi Agaval manuscript witness;
- claims that individual Sahasranamam texts do not exist before a particular century;
- claims about restricted Mala Mantras, Yantras, Mudras, and temple-only 108-name lists.

Universal negative claims such as “no pre-18th century manuscripts exist” require a documented catalogue methodology and cannot be authenticated from an unsourced summary.

## Editorial status taxonomy required

Each future item must use one of the following non-overlapping states:

1. `CANONICAL_TEXT_VERIFIED`
2. `MANUSCRIPT_CATALOGUE_VERIFIED`
3. `MANUSCRIPT_IMAGE_VERIFIED`
4. `PRINT_EDITION_VERIFIED`
5. `OFFICIAL_TEMPLE_TRADITION_VERIFIED`
6. `LINEAGE_TRADITION_REPORTED`
7. `MODERN_DEVOTIONAL`
8. `INFERRED`
9. `UNRESOLVED`
10. `CONTRADICTED_DO_NOT_PUBLISH`

A record must not use `High confidence`, `Primary-text attested`, `Scripturally attested`, or equivalent language unless the supporting evidence is linked and independently reviewed.

## Command and tool evidence

Repository evidence was obtained through GitHub branch/PR inspection and code-search operations. External evidence was obtained through targeted public-source searches and page review.

No local shell, install, lint, type-check, test, build, deployment, database, secret, or infrastructure command was run for this documentation-only task. No PASS result is claimed from a local environment.

## Safety impact

- No source code changed.
- No production content changed.
- No deployment workflow changed.
- No infrastructure changed.
- No secrets were added or exposed.
- No data was deleted.
- No authentication, authorisation, API, persistence, or medical workflow was introduced.
- The intake is explicitly isolated from production use.
- Pull request #2 remains draft and must remain unmerged.

## Blockers

1. Most submitted records lack accessible primary-source images or official catalogue pages.
2. Exact manuscript identifiers have not been independently confirmed.
3. Several print-edition claims lack title-page, colophon, page, or verse evidence.
4. Translation and transliteration standards are not declared.
5. Publication and reuse rights are not documented.
6. There is no approved content schema or editorial review workflow in the current scaffold.
7. One submitted Karuvoorar attribution is contradicted by an authoritative Tamil text source.

## Next task

Define a typed, non-production Siddhar source-record schema and validator with mandatory provenance fields and the status taxonomy above. Add only synthetic validation fixtures; do not convert the devotional intake into application data until primary evidence and editorial review are available.

## Status

INTAKE SAFELY PRESERVED

LIMITED REVALIDATION COMPLETE

CONTENT AUTHENTICATION INCOMPLETE — PRODUCTION PUBLICATION BLOCKED
