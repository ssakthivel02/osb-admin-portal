# Siddhar Register Resubmission Reconciliation

**Date:** 2026-07-28  
**Branch:** `quality/ci-gate`  
**Task type:** Duplicate-intake reconciliation and evidence-gap review  
**Production impact:** None

## Objective

Revalidate the re-shared Siddhar Devotional Text Collection Register against the current repository, avoid duplicating material already preserved, record any newly located authoritative evidence, and identify the exact documents still required before authentication or production publication.

## Repository reconciliation

The re-shared register is already preserved in:

- `docs/content-intake/siddhar-devotional-register-unverified.md`

The current intake file already contains:

- Agastiyar items 1–3 and the submitted items 4–50 summary;
- Thirumoolar items 1–2 and the submitted items 3–50 summary;
- Bogar items 1–2;
- Korakkar items 1–2;
- Pambatti Siddhar item 1;
- Karuvoorar item 1;
- Sattaimuni items 1–2;
- Konganar items 1–2;
- the consolidated register for Siddhars 9–18;
- the devotional-category status report;
- the submitted master-source register;
- the submitted gap register;
- a fail-closed promotion rule.

No second copy of the raw register was added. The existing intake remains the canonical repository copy of the user-supplied text.

Related repository controls already present:

- `docs/quality/2026-07-27-siddhar-content-intake-audit.md`;
- `docs/quality/2026-07-28-siddhar-provenance-validator.md`;
- `src/content/siddharSourceRecord.ts`;
- `src/content/siddharSourceRecord.test.ts`.

## Revalidation status

### Supported association

The Tamil Virtual Academy presents `ஒன்றவன் தானே இரண்டவன் இன்னருள்` as the opening `கடவுள் வாழ்த்து` verse of `திருமந்திரம்`. This supports the submitted Thirumoolar text/source association. It does not independently establish the submitted 1942 publisher, editor, translation, or page details.

Source:

- Tamil Virtual Academy, `திருமந்திரம்`, opening verse: https://www.tamilvu.org/slet/l41A0/l4170uri.jsp?book_id=118&head_id=67&song_no=2&sub_id=2371

### Contradicted attribution

The Tamil Virtual Academy identifies `உலகெலாம் உணர்ந்து ஓதற்கு அரியவன்` as the opening of `பெரியபுராணம்`, associated with Sekkizhar. The submitted Karuvoorar/Thiruvisaippa attribution therefore remains `CONTRADICTED_DO_NOT_PUBLISH`.

Source:

- Tamil Virtual Academy, `பெரியபுராணம்`, opening verse: https://www.tamilvu.org/slet/l41C1/l41C1per.jsp?sno=1

### New authoritative catalogue evidence

The Government Oriental Manuscripts Library now exposes an official catalogue record for `Bogar 7000` with:

- type: paper manuscript;
- language: Tamil;
- Tamil title: `போகர் 7000`;
- bundle number: `TR 1016`;
- work number: `R 5664`;
- author: Bogar;
- subject: medicine;
- status: complete.

Source:

- Government Oriental Manuscripts Library, `Bogar 7000`: https://www.tnarch.gov.in/goml/manuscripts/view/13615

This supports the existence of an official GOML catalogue witness for the work `Bogar 7000`. It does **not** verify that the submitted moola mantra or dhyana sloka appears in that manuscript, nor does it verify the claimed 1994 edition, temple liturgy, translation, or usage instructions.

### Repository and temple existence

The current Government of Tamil Nadu GOML catalogue confirms that the manuscript repository and structured catalogue are active. The Tamil Nadu HR&CE directory confirms the existence of Arulmigu Agastheewarm Temple at Pazhaya Papanasam. Neither source, by itself, verifies the submitted Agastiyar 108 Potri handout or its exact wording.

Sources:

- GOML manuscript catalogue: https://www.tnarch.gov.in/goml/manuscript
- HR&CE temple entry: https://hrce.tn.gov.in/hrcehome/index_temple.php?action=contact_us&tid=37903

## Exact evidence documents still missing

The following evidence has not been supplied or independently located in an accessible authoritative record during this review:

1. Official catalogue page, catalogue scan, or repository letter for `GOML R.No. 3215 — Agastiyar Parippooranam 400`.
2. Title page, colophon, contents page, and verse-1 page for the claimed 1899 Vidya Anupalana Press edition edited by Arumuga Navalar.
3. A primary-source page showing the submitted Agastiyar invocation in `Parippooranam 400`.
4. Exact source page for the submitted Agastiyar Gayatri and evidence for its claimed Puranic status.
5. Scan or official digital copy of the Papanasam `Agastiyar 108 Potri` temple handout.
6. Manuscript folio or printed-edition page showing the submitted Bogar moola mantra.
7. Manuscript folio or printed-edition page showing `நவபாஷாண வித்தகாய வித்மஹே`.
8. Official Palani temple liturgy or authorised publication linking either Bogar item to temple worship.
9. Exact GOML catalogue record and folio for `Korakkar Chandra Regai` and the quoted abstinence verse.
10. Official catalogue page or manuscript image for `GOML R.No. 121 — Pambatti Siddhar Padalgal`.
11. Ninth Tirumurai source evidence for the intended Karuvoorar item; the currently submitted line is contradicted.
12. Catalogue record, manuscript image, or verified edition for `Sattaimuni Nigandu 1200` and its opening invocation.
13. Catalogue record, manuscript image, or verified edition for `Konganar Vaakkiyam` and the submitted `ஸ்ரீம்` claim.
14. Exact textual location and edition for Patanjali's `Yogena cittasya...` invocation.
15. Exact Bhagavata Purana verse or Dhanvantari Nighantu edition/page for the submitted Dhanvantari mantra.
16. Manuscript or critical-edition evidence for `Nandi Agaval`.
17. A documented catalogue methodology supporting universal negative claims about absent pre-18th-century Sahasranamam texts.
18. Primary evidence for claims concerning restricted Mala Mantras, Yantras, Mudras, and temple-only 108-name lists.
19. A declared transliteration standard and reviewer.
20. Independent Tamil transcription, English translation, and word-by-word review records.
21. Publication, reuse, and image-rights evidence for each source.
22. Named editorial approval for every item promoted beyond `UNRESOLVED`, `INFERRED`, or `MODERN_DEVOTIONAL`.

## Evidence-pack format requested

For each future document or image, record:

- Siddhar and item identifier;
- repository or temple name;
- exact catalogue, bundle, work, accession, or publication identifier;
- title, author, editor, publisher, edition, and year;
- folio, page, verse, or line range;
- direct official URL or scan filename;
- date accessed or photographed;
- transcription reviewer;
- transliteration standard and reviewer;
- translation reviewer;
- publication/reuse-rights status;
- proposed editorial status;
- reviewer name and review date.

## Safety impact

- No source code changed.
- No production content changed.
- No devotional claim was upgraded to authenticated status.
- No duplicate raw intake was created.
- No data was deleted.
- No dependency, lockfile, workflow, secret, deployment, or infrastructure changed.
- The contradicted Karuvoorar attribution remains blocked from publication.

## Command and tool evidence

Repository evidence was obtained through GitHub file and pull-request inspection. Public-source revalidation used official Tamil Virtual Academy, Government of Tamil Nadu GOML, and Tamil Nadu HR&CE pages.

No local install, lint, type-check, test, build, database, deployment, or infrastructure command was run for this documentation-only reconciliation. CI must be inspected separately before claiming that repository quality gates passed for this commit.

## Blockers

1. Most item-level claims still lack accessible primary-source pages or manuscript images.
2. Several exact catalogue identifiers remain unresolved.
3. The newly confirmed `Bogar 7000` catalogue record does not establish the submitted mantra text.
4. Rights and qualified editorial reviewers remain unspecified.
5. Production publication remains prohibited.

## Next task

Obtain and attach the highest-priority evidence pack in this order: the two claimed GOML records (`R.No. 3215` and `R.No. 121`), the 1899 Agastiyar edition pages, the exact `Bogar 7000` folios for the submitted verses, and the Ninth Tirumurai source for the intended Karuvoorar item. Validate each document through the existing typed provenance contract before changing any editorial status.

## Status

RESUBMISSION RECONCILED — NO DUPLICATE INTAKE ADDED  
ONE NEW WORK-LEVEL CATALOGUE WITNESS RECORDED  
ITEM-LEVEL AUTHENTICATION INCOMPLETE — PRODUCTION PUBLICATION BLOCKED
