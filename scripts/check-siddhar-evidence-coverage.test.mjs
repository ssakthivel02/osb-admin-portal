import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateSiddharEvidenceCoverage } from './check-siddhar-evidence-coverage.mjs';

const temporaryRoots = [];
const uploadPrefix = 'docs/content-intake/evidence/uploads/';
const submissionsPrefix = 'docs/content-intake/evidence/submissions/';
const contract = {
  schemaVersion: 1,
  packetStatuses: ['DRAFT', 'SUBMITTED_FOR_REVIEW'],
  allowedFileExtensions: ['.jpeg', '.jpg', '.pdf', '.png', '.tif', '.tiff'],
};

const manifest = {
  schemaVersion: 1,
  productionEligible: false,
  items: [
    {
      id: 'SID-EV-001',
      siddhar: 'Agastiyar',
      itemTitle: 'Catalogue record',
      priority: 'P0',
      status: 'UNRESOLVED',
    },
    {
      id: 'SID-EV-002',
      siddhar: 'Bogar',
      itemTitle: 'Work witness',
      priority: 'P0',
      status: 'WORK_CATALOGUE_VERIFIED',
    },
  ],
};

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'siddhar-evidence-coverage-'));
  temporaryRoots.push(root);
  return root;
}

function writeUpload(root, path, content = 'evidence') {
  const absolutePath = join(root, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  return absolutePath;
}

function packet({
  packetId = 'SID-SUB-20260728-001',
  manifestItemId = 'SID-EV-001',
  manifestStatusObserved = 'UNRESOLVED',
  submissionStatus = 'SUBMITTED_FOR_REVIEW',
  productionEligible = false,
  files = [`${uploadPrefix}SID-SUB-20260728-001-page-001.pdf`],
  path = `${submissionsPrefix}${packetId}.json`,
} = {}) {
  return {
    path,
    value: {
      packetId,
      manifestItemId,
      manifestStatusObserved,
      submissionStatus,
      productionEligible,
      files: files.map((filePath) => ({ path: filePath })),
    },
  };
}

function validate(root, packetFiles = [], manifestValue = manifest) {
  return validateSiddharEvidenceCoverage({
    manifest: manifestValue,
    packetFiles,
    repositoryRootPath: root,
    contract,
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Siddhar evidence orphan and coverage gate', () => {
  it('passes safely with zero packets and zero controlled files', () => {
    const result = validate(createRoot());

    expect(result.ok).toBe(true);
    expect(result.packetFileCount).toBe(0);
    expect(result.uploadFileCount).toBe(0);
    expect(result.coveredManifestItems).toBe(0);
    expect(result.uncoveredManifestItems).toBe(2);
    expect(result.coveragePercent).toBe(0);
    expect(result.automaticStatusChanges).toBe(0);
    expect(result.productionEligibleFiles).toBe(0);
  });

  it('marks one manifest item covered when one valid packet owns one real upload', () => {
    const root = createRoot();
    const path = `${uploadPrefix}SID-SUB-20260728-001-page-001.pdf`;
    writeUpload(root, path);

    const result = validate(root, [packet({ files: [path] })]);

    expect(result.ok).toBe(true);
    expect(result.validPacketCount).toBe(1);
    expect(result.coveredFileCount).toBe(1);
    expect(result.coveredManifestItems).toBe(1);
    expect(result.coveragePercent).toBe(50);
    expect(result.coverageByManifestItem[0]).toEqual(
      expect.objectContaining({
        manifestItemId: 'SID-EV-001',
        packetCount: 1,
        declaredFileCount: 1,
        observedFileCount: 1,
        coverageState: 'COVERED',
      }),
    );
  });

  it('fails for an orphan upload not declared by any packet', () => {
    const root = createRoot();
    writeUpload(root, `${uploadPrefix}orphan.pdf`);

    const result = validate(root);

    expect(result.ok).toBe(false);
    expect(result.orphanFileCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'coverage',
        message: 'upload file is orphaned and must be declared by exactly one valid packet',
      }),
    );
  });

  it('fails when a valid packet declares a file that is absent', () => {
    const root = createRoot();
    const path = `${uploadPrefix}missing.pdf`;

    const result = validate(root, [packet({ files: [path] })]);

    expect(result.ok).toBe(false);
    expect(result.missingDeclaredFileCount).toBe(1);
    expect(result.coverageByManifestItem[0].coverageState).toBe('FILES_MISSING');
  });

  it('fails when the same upload path is declared by more than one valid packet', () => {
    const root = createRoot();
    const path = `${uploadPrefix}duplicate.pdf`;
    writeUpload(root, path);

    const result = validate(root, [
      packet({ files: [path] }),
      packet({
        packetId: 'SID-SUB-20260728-002',
        path: `${submissionsPrefix}SID-SUB-20260728-002.json`,
        files: [path],
      }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.duplicateDeclarationPathCount).toBe(1);
    expect(result.coveredFileCount).toBe(0);
  });

  it('does not let an unknown manifest link satisfy upload coverage', () => {
    const root = createRoot();
    const path = `${uploadPrefix}unknown.pdf`;
    writeUpload(root, path);

    const result = validate(root, [
      packet({ manifestItemId: 'SID-EV-999', files: [path] }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.validPacketCount).toBe(0);
    expect(result.orphanFileCount).toBe(1);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'manifestItemId' }),
        expect.objectContaining({ field: 'coverage' }),
      ]),
    );
  });

  it('rejects stale manifest status snapshots', () => {
    const root = createRoot();
    const path = `${uploadPrefix}stale.pdf`;
    writeUpload(root, path);

    const result = validate(root, [
      packet({ manifestStatusObserved: 'SUPPORTED_ASSOCIATION', files: [path] }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.validPacketCount).toBe(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'manifestStatusObserved' }),
    );
  });

  it('rejects production-eligible packets', () => {
    const root = createRoot();
    const path = `${uploadPrefix}unsafe.pdf`;
    writeUpload(root, path);

    const result = validate(root, [
      packet({ productionEligible: true, files: [path] }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.validPacketCount).toBe(0);
    expect(result.productionEligibleFiles).toBe(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'productionEligible' }),
    );
  });

  it('rejects malformed and duplicate packet identities', () => {
    const root = createRoot();
    const firstPath = `${uploadPrefix}first.pdf`;
    const secondPath = `${uploadPrefix}second.pdf`;
    writeUpload(root, firstPath);
    writeUpload(root, secondPath);

    const result = validate(root, [
      packet({ packetId: 'bad-id', files: [firstPath], path: `${submissionsPrefix}bad.json` }),
      packet({ files: [firstPath] }),
      packet({ files: [secondPath], path: `${submissionsPrefix}duplicate.json` }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues.filter((issue) => issue.field === 'packetId').length).toBeGreaterThanOrEqual(2);
  });

  it('fails closed for invalid JSON, non-object packets, and missing file arrays', () => {
    const root = createRoot();
    const result = validate(root, [
      { path: `${submissionsPrefix}bad.json`, value: null, parseError: 'Unexpected token' },
      { path: `${submissionsPrefix}array.json`, value: [] },
      {
        path: `${submissionsPrefix}missing-files.json`,
        value: {
          packetId: 'SID-SUB-20260728-003',
          manifestItemId: 'SID-EV-001',
          manifestStatusObserved: 'UNRESOLVED',
          submissionStatus: 'DRAFT',
          productionEligible: false,
        },
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: '(json)' }),
        expect.objectContaining({ field: '(packet)' }),
        expect.objectContaining({ field: 'files' }),
      ]),
    );
  });

  it('rejects traversal, backslash, and non-normalised declaration paths', () => {
    const root = createRoot();
    const result = validate(root, [
      packet({
        files: [
          '../private.pdf',
          'docs\\content-intake\\evidence\\uploads\\file.pdf',
          `${uploadPrefix}nested/../file.pdf`,
        ],
      }),
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues.filter((issue) => issue.field.startsWith('files['))).toHaveLength(3);
  });

  it('reports unsupported actual upload extensions as quality failures', () => {
    const root = createRoot();
    writeUpload(root, `${uploadPrefix}notes.txt`);

    const result = validate(root);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'extension' }),
        expect.objectContaining({ field: 'coverage' }),
      ]),
    );
  });

  it('rejects symbolic links inside the controlled uploads directory', () => {
    const root = createRoot();
    const target = writeUpload(root, 'outside/source.pdf');
    const link = join(root, `${uploadPrefix}linked.pdf`);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link);

    const result = validate(root);

    expect(result.ok).toBe(false);
    expect(result.uploadFileCount).toBe(0);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ message: 'symbolic links are forbidden in the uploads directory' }),
    );
  });

  it('rejects a symbolic-link uploads root', () => {
    const root = createRoot();
    const targetDirectory = join(root, 'outside-uploads');
    mkdirSync(targetDirectory, { recursive: true });
    mkdirSync(join(root, 'docs/content-intake/evidence'), { recursive: true });
    symlinkSync(targetDirectory, join(root, 'docs/content-intake/evidence/uploads'));

    const result = validate(root);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ message: 'uploads directory must not be a symbolic link' }),
    );
  });

  it('supports nested evidence directories while preserving repository-relative coverage', () => {
    const root = createRoot();
    const path = `${uploadPrefix}agastiyar/1899/title-page.pdf`;
    writeUpload(root, path);

    const result = validate(root, [packet({ files: [path] })]);

    expect(result.ok).toBe(true);
    expect(result.coveredFileCount).toBe(1);
  });

  it('ignores files outside the controlled uploads directory', () => {
    const root = createRoot();
    writeUpload(root, 'docs/content-intake/evidence/research-notes.pdf');

    const result = validate(root);

    expect(result.ok).toBe(true);
    expect(result.uploadFileCount).toBe(0);
  });

  it('reports partial coverage when one of several declared files is absent', () => {
    const root = createRoot();
    const present = `${uploadPrefix}present.pdf`;
    const missing = `${uploadPrefix}missing.pdf`;
    writeUpload(root, present);

    const result = validate(root, [packet({ files: [present, missing] })]);

    expect(result.ok).toBe(false);
    expect(result.coverageByManifestItem[0].coverageState).toBe('PARTIAL');
    expect(result.coverageByManifestItem[0].observedFileCount).toBe(1);
  });

  it('keeps coverage output deterministically sorted by manifest ID', () => {
    const root = createRoot();
    const reversedManifest = {
      ...manifest,
      items: [...manifest.items].reverse(),
    };

    const result = validate(root, [], reversedManifest);

    expect(result.coverageByManifestItem.map((item) => item.manifestItemId)).toEqual([
      'SID-EV-001',
      'SID-EV-002',
    ]);
    expect(result.issues).toEqual([]);
  });

  it('fails closed for duplicate or malformed manifest items', () => {
    const root = createRoot();
    const invalidManifest = {
      items: [manifest.items[0], manifest.items[0], { itemTitle: 'Missing ID' }],
    };

    const result = validate(root, [], invalidManifest);

    expect(result.ok).toBe(false);
    expect(result.manifestItemCount).toBe(1);
    expect(result.issues.filter((issue) => issue.field === 'id')).toHaveLength(2);
  });
});
