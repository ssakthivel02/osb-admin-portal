import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
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
import {
  detectEvidenceMimeType,
  validateSiddharEvidenceFileIntegrity,
} from './check-siddhar-evidence-file-integrity.mjs';

const temporaryRoots = [];
const uploadPrefix = 'docs/content-intake/evidence/uploads/';
const contract = {
  schemaVersion: 1,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
  allowedFileExtensions: ['.jpeg', '.jpg', '.pdf', '.png', '.tif', '.tiff'],
  maxFileSizeBytes: 1024 * 1024,
};

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'siddhar-evidence-integrity-'));
  temporaryRoots.push(root);
  return root;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function writeEvidence(root, repositoryPath, content) {
  const absolutePath = join(root, repositoryPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
  return absolutePath;
}

function packet(files, overrides = {}) {
  return {
    path: 'docs/content-intake/evidence/submissions/SID-SUB-20260728-001.json',
    value: {
      packetId: 'SID-SUB-20260728-001',
      files,
    },
    ...overrides,
  };
}

function declaration(path, mimeType, content, overrides = {}) {
  return {
    path,
    sha256: sha256(content),
    mimeType,
    sizeBytes: content.length,
    ...overrides,
  };
}

const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02,
]);
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x01]);
const tiffLittleEndianBytes = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00]);
const tiffBigEndianBytes = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x08]);

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('evidence MIME signature detection', () => {
  it('detects PDF, PNG, JPEG, and both TIFF byte orders', () => {
    expect(detectEvidenceMimeType(pdfBytes)).toBe('application/pdf');
    expect(detectEvidenceMimeType(pngBytes)).toBe('image/png');
    expect(detectEvidenceMimeType(jpegBytes)).toBe('image/jpeg');
    expect(detectEvidenceMimeType(tiffLittleEndianBytes)).toBe('image/tiff');
    expect(detectEvidenceMimeType(tiffBigEndianBytes)).toBe('image/tiff');
  });

  it('rejects unknown content and incomplete PDF trailers', () => {
    expect(detectEvidenceMimeType(Buffer.from('plain text'))).toBeNull();
    expect(detectEvidenceMimeType(Buffer.from('%PDF-1.7\nmissing trailer'))).toBeNull();
  });
});

describe('Siddhar evidence file integrity validator', () => {
  it('passes safely and truthfully when no completed packets exist', () => {
    const root = createRoot();
    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [],
      repositoryRootPath: root,
    });

    expect(result).toEqual({
      ok: true,
      contractSchemaVersion: 1,
      packetCount: 0,
      declaredFileCount: 0,
      checkedFileCount: 0,
      missingFileCount: 0,
      mismatchCount: 0,
      automaticStatusChanges: 0,
      productionEligibleFiles: 0,
      issues: [],
    });
  });

  it('accepts a real file whose path, size, digest, extension, and signature agree', () => {
    const root = createRoot();
    const path = `${uploadPrefix}SID-SUB-20260728-001-page-001.pdf`;
    writeEvidence(root, path, pdfBytes);

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet([declaration(path, 'application/pdf', pdfBytes)])],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(true);
    expect(result.checkedFileCount).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it('accepts all approved image signatures when metadata agrees', () => {
    const root = createRoot();
    const fixtures = [
      ['page.png', 'image/png', pngBytes],
      ['page.jpg', 'image/jpeg', jpegBytes],
      ['page.tif', 'image/tiff', tiffLittleEndianBytes],
      ['page.tiff', 'image/tiff', tiffBigEndianBytes],
    ];

    const declarations = fixtures.map(([name, mimeType, content]) => {
      const path = `${uploadPrefix}${name}`;
      writeEvidence(root, path, content);
      return declaration(path, mimeType, content);
    });

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet(declarations)],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(true);
    expect(result.checkedFileCount).toBe(4);
  });

  it('fails closed when a declared evidence file is missing', () => {
    const root = createRoot();
    const path = `${uploadPrefix}missing.pdf`;
    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet([declaration(path, 'application/pdf', pdfBytes)])],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.missingFileCount).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'path', message: 'declared evidence file is missing' }),
    );
  });

  it('detects byte-size and SHA-256 mismatches', () => {
    const root = createRoot();
    const path = `${uploadPrefix}mismatch.pdf`;
    writeEvidence(root, path, pdfBytes);

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [
        packet([
          declaration(path, 'application/pdf', pdfBytes, {
            sizeBytes: pdfBytes.length + 1,
            sha256: '1'.repeat(64),
          }),
        ]),
      ],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sizeBytes' }),
        expect.objectContaining({ field: 'sha256' }),
      ]),
    );
  });

  it('detects extension, declared MIME, and byte-signature disagreement', () => {
    const root = createRoot();
    const path = `${uploadPrefix}disguised.png`;
    writeEvidence(root, path, pdfBytes);

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet([declaration(path, 'image/png', pdfBytes)])],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'mimeSignature' }),
        expect.objectContaining({ field: 'extension' }),
      ]),
    );
  });

  it('rejects unrecognised signatures even when declared extension and MIME agree', () => {
    const root = createRoot();
    const content = Buffer.from('not a PDF');
    const path = `${uploadPrefix}fake.pdf`;
    writeEvidence(root, path, content);

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet([declaration(path, 'application/pdf', content)])],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'mimeSignature', message: 'file signature is not recognised' }),
    );
  });

  it('rejects traversal, backslash, and non-normalised repository paths', () => {
    const root = createRoot();
    const declarations = [
      declaration('../private/file.pdf', 'application/pdf', pdfBytes),
      declaration('docs\\content-intake\\evidence\\uploads\\file.pdf', 'application/pdf', pdfBytes),
      declaration(`${uploadPrefix}nested/../file.pdf`, 'application/pdf', pdfBytes),
    ];

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [packet(declarations)],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.filter((issue) => issue.field === 'path')).toHaveLength(3);
  });

  it('rejects symbolic links and directories', () => {
    const root = createRoot();
    const targetPath = `${uploadPrefix}target.pdf`;
    const linkPath = `${uploadPrefix}linked.pdf`;
    const directoryPath = `${uploadPrefix}directory.pdf`;
    const absoluteTarget = writeEvidence(root, targetPath, pdfBytes);
    const absoluteLink = join(root, linkPath);
    mkdirSync(dirname(absoluteLink), { recursive: true });
    symlinkSync(absoluteTarget, absoluteLink);
    mkdirSync(join(root, directoryPath), { recursive: true });

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [
        packet([
          declaration(linkPath, 'application/pdf', pdfBytes),
          declaration(directoryPath, 'application/pdf', pdfBytes),
        ]),
      ],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'symbolic links are forbidden' }),
        expect.objectContaining({ message: 'must reference a regular file' }),
      ]),
    );
  });

  it('rejects duplicate declarations and duplicate actual file content', () => {
    const root = createRoot();
    const firstPath = `${uploadPrefix}first.pdf`;
    const secondPath = `${uploadPrefix}second.pdf`;
    writeEvidence(root, firstPath, pdfBytes);
    writeEvidence(root, secondPath, pdfBytes);

    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [
        packet([
          declaration(firstPath, 'application/pdf', pdfBytes),
          declaration(firstPath, 'application/pdf', pdfBytes),
          declaration(secondPath, 'application/pdf', pdfBytes),
        ]),
      ],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'path', message: 'is declared more than once' }),
        expect.objectContaining({
          field: 'sha256',
          message: 'actual file content duplicates another evidence file',
        }),
      ]),
    );
  });

  it('rejects invalid packet JSON results, non-object packets, and missing file arrays', () => {
    const root = createRoot();
    const result = validateSiddharEvidenceFileIntegrity({
      contract,
      packetFiles: [
        { path: 'bad.json', value: null, parseError: 'Unexpected token' },
        { path: 'array.json', value: [] },
        { path: 'missing-files.json', value: {} },
      ],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: '(json)' }),
        expect.objectContaining({ field: '(packet)' }),
        expect.objectContaining({ field: 'files' }),
      ]),
    );
  });

  it('enforces the canonical maximum file size independently of declared metadata', () => {
    const root = createRoot();
    const content = Buffer.concat([pdfBytes, Buffer.alloc(128)]);
    const path = `${uploadPrefix}oversize.pdf`;
    writeEvidence(root, path, content);

    const result = validateSiddharEvidenceFileIntegrity({
      contract: { ...contract, maxFileSizeBytes: 64 },
      packetFiles: [packet([declaration(path, 'application/pdf', content)])],
      repositoryRootPath: root,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ field: 'sizeBytes' }));
  });
});
