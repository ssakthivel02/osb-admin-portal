# Siddhar Rights Decision Records

This directory contains non-production rights-decision metadata only. It must not contain private correspondence, personal contact details, signatures, credentials, or unrestricted copies of permission letters.

## Safety rules

- A packet with `UNRESOLVED` or `PUBLIC_DOMAIN_CLAIM_UNVERIFIED` rights remains `NO_REUSE_APPROVED`.
- `PERMISSION_GRANTED` requires one controlled decision record, one authorised rights reviewer, and one verifiable permission-evidence file.
- `RESTRICTED` requires one controlled decision record and one authorised rights reviewer.
- A rights decision never changes the evidence manifest or makes devotional content production eligible.
- Broad statements such as “all ancient texts are public domain”, “copyright free”, or “free to use” are not acceptable evidence.
- AI chat output, generated legal conclusions, web-search summaries, and unsigned drafts are working notes only.

## Directory layout

```text
docs/content-intake/evidence/rights/
  README.md
  siddhar-rights-decision-template.json
  decisions/
    SID-RGT-DEC-YYYYMMDD-NNN.json
docs/content-intake/evidence/uploads/rights/
  SID-RGT-PERM-YYYYMMDD-NNN.pdf
```

The `decisions/` directory may remain absent while there are no real decisions. The controlled permission-evidence directory may remain absent while there are no real permission documents.

## Manual procedure

1. Confirm the evidence packet already exists and remains non-production.
2. Appoint a registered, active reviewer whose non-sensitive ID is included in `authorisedReviewerIds` in `config/siddhar-rights-governance.json`.
3. Keep the real identity, qualifications, signed conflict declaration, contact details, and private permission correspondence in an access-controlled system outside this repository.
4. For `PERMISSION_GRANTED`, obtain the actual permission letter or licence evidence from the rights holder.
5. Save only the approved evidence copy under `docs/content-intake/evidence/uploads/rights/`.
6. Record its exact SHA-256, byte size, MIME type, effective date, expiry date, and scope.
7. Create one `SID-RGT-DEC-*` decision record by copying the template.
8. Link the packet rights section to the decision ID, record path, reviewer ID, and decision date.
9. Run `npm run check:siddhar-rights` together with every existing Siddhar evidence gate.
10. Do not change the evidence manifest or production status as part of the rights decision.

## What validation proves

A successful gate proves that repository metadata, reviewer authorisation, dates, controlled paths, permission-file bytes, and packet/decision links are internally consistent. It does not independently prove ownership, legal validity, territorial coverage, moral-rights clearance, trademark clearance, privacy clearance, or the authenticity of an off-repository signature.
