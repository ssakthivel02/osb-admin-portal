# Siddhar Evidence Intake Workspace

This directory contains non-production evidence-control records for the user-supplied Siddhar devotional register. It does not authenticate devotional text, grant publication rights, or authorise medical, ritual, or production use.

## Canonical files

- `siddhar-evidence-manifest.json` — machine-readable backlog and current evidence status.
- `siddhar-evidence-submission-template.md` — metadata form for every document, scan, photograph, catalogue page, or official confirmation.

The preserved source register remains in `docs/content-intake/siddhar-devotional-register-unverified.md` and must not be silently rewritten.

## Manual work required — priority order

### P0: required first

1. Obtain the official GOML record or catalogue scan for `R.No. 3215 — Agastiyar Parippooranam 400`.
2. Obtain the title page, colophon, contents page, and claimed verse-1 page of the 1899 Agastiyar edition.
3. Obtain the exact Agastiyar invocation page plus one page before and after it.
4. Obtain the exact `Bogar 7000` folios for the submitted moola mantra and dhyana sloka from catalogue witness `TR 1016 / R 5664`.
5. Obtain the exact catalogue record and folio for the submitted Korakkar `Chandra Regai` verse.
6. Obtain the official GOML record and refrain folio for `R.No. 121 — Pambatti Siddhar Padalgal`.
7. Supply a recognised Ninth Tirumurai page and verse for the intended Karuvoorar item. Do not reuse the contradicted Periyapuranam line.
8. Nominate Tamil transcription, transliteration, translation, rights, and editorial reviewers.

### P1: follow after the P0 pack

- Agastiyar Gayatri source page and bibliographic evidence.
- Complete Papanasam 108 Potri handout with temple provenance.
- Official Palani publication linking the submitted Bogar text to liturgy.
- Sattaimuni Nigandu 1200 catalogue/edition and opening page.
- Konganar Vaakkiyam catalogue/edition and source context.
- Dhanvantari mantra exact verse or edition/page.
- Nandi Agaval exact work identity and manuscript/edition witness.

### P2: research controls

- Patanjali invocation exact edition and opening page.
- Reproducible catalogue methodology for universal absence claims.
- Named institutional or lineage evidence for restricted Mala Mantra, Yantra, and Mudra claims.

## Minimum image and document quality

For scans or photographs:

- capture the complete page, including page number, margins, headings, and repository markings;
- include the title page and colophon for printed books;
- include at least one adjacent page where context matters;
- keep text level, in focus, and readable at 100% zoom;
- prefer colour images at 300 DPI or higher;
- do not apply filters that remove annotations, stamps, damage, or marginalia;
- retain the original filename and create a separate working copy for annotation;
- record the date, location, repository, shelf mark, folio/page, and photographer or scanner.

Suggested filename:

```text
SID-EV-004__GOML__Agastiyar-Parippooranam-400__R3215__catalogue-page__YYYY-MM-DD.ext
```

## Rights and privacy rules

- Do not commit restricted manuscripts, paid-book scans, personal identification, private correspondence, initiation-only material, credentials, or access tokens.
- Record an official URL where possible instead of copying an image.
- Before storing an image, record whether it is public domain, openly licensed, used with permission, or review-only.
- Review-only evidence must not be exposed through the website build or public application data.
- A temple, library, or publisher name alone is not reuse permission.

## Review sequence

1. Intake completeness check.
2. Repository/catalogue identifier verification.
3. Tamil transcription review.
4. Transliteration-standard review.
5. Translation and word-by-word review.
6. Rights review.
7. Editorial status decision.
8. Typed provenance validation.
9. Production review in a separate approved change.

No record may skip directly from `UNRESOLVED` to production use.
