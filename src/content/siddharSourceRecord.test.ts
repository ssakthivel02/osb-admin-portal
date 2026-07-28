import { describe, expect, it } from 'vitest';

import { validateSiddharSourceRecord } from './siddharSourceRecord';

const validSyntheticRecord = {
  id: 'synthetic-agastiyar-001',
  siddharNameTamil: 'அகத்தியர்',
  siddharNameRomanized: 'Agastiyar',
  itemTitle: 'Synthetic verification fixture',
  tamilText: 'சோதனை உரை',
  transliteration: 'Sothanai urai',
  englishMeaning: 'Synthetic test text',
  status: 'MANUSCRIPT_CATALOGUE_VERIFIED',
  sourceReferences: [
    {
      repository: 'Synthetic Manuscript Repository',
      recordId: 'TEST-001',
      title: 'Synthetic catalogue entry',
      locator: 'folio 1r',
      evidenceUrl: 'https://example.invalid/catalogue/TEST-001',
      accessedOn: '2026-07-28',
    },
  ],
  review: {
    transcriptionReviewer: 'Synthetic Reviewer A',
    transliterationStandard: 'ISO 15919',
    transliterationReviewer: 'Synthetic Reviewer B',
    translationReviewer: 'Synthetic Reviewer C',
    editorialReviewer: 'Synthetic Reviewer D',
    reviewedOn: '2026-07-28',
  },
  rights: {
    rightsBasis: 'Synthetic fixture; no publication rights asserted',
    reusePermissionReference: 'TEST-RIGHTS-001',
  },
  productionEligible: false,
} as const;

describe('validateSiddharSourceRecord', () => {
  it('accepts a complete synthetic non-production record', () => {
    const result = validateSiddharSourceRecord(validSyntheticRecord);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('synthetic-agastiyar-001');
      expect(result.data.productionEligible).toBe(false);
    }
  });

  it('rejects an unsupported editorial status and missing provenance', () => {
    const result = validateSiddharSourceRecord({
      ...validSyntheticRecord,
      status: 'PRIMARY-TEXT ATTESTED',
      sourceReferences: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('record.status must use the approved editorial taxonomy');
      expect(result.errors).toContain(
        'record.sourceReferences must contain at least one evidence reference',
      );
    }
  });

  it('rejects malformed review dates, evidence URLs, and production promotion', () => {
    const result = validateSiddharSourceRecord({
      ...validSyntheticRecord,
      productionEligible: true,
      sourceReferences: [
        {
          ...validSyntheticRecord.sourceReferences[0],
          evidenceUrl: 'not-a-url',
          accessedOn: '28/07/2026',
        },
      ],
      review: {
        ...validSyntheticRecord.review,
        reviewedOn: 'tomorrow',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('record.productionEligible must be false during intake');
      expect(result.errors).toContain(
        'record.sourceReferences[0].evidenceUrl must be an HTTP(S) URL',
      );
      expect(result.errors).toContain(
        'record.sourceReferences[0].accessedOn must use YYYY-MM-DD',
      );
      expect(result.errors).toContain('record.review.reviewedOn must use YYYY-MM-DD');
    }
  });
});
