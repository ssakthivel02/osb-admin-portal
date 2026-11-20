import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fingerprintSiddharSubjectFile } from './print-siddhar-subject-fingerprint.mjs';

const roots = [];

function root() {
  const value = mkdtempSync(join(tmpdir(), 'siddhar-fingerprint-cli-'));
  roots.push(value);
  return value;
}

function write(rootPath, path, value) {
  const absolute = join(rootPath, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  return absolute;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Siddhar subject fingerprint utility', () => {
  it('fingerprints an evidence submission packet', () => {
    const repositoryRootPath = root();
    const path = 'docs/content-intake/evidence/submissions/SID-SUB-20260701-001.json';
    write(repositoryRootPath, path, { packetId: 'SID-SUB-20260701-001', value: 1 });

    const result = fingerprintSiddharSubjectFile({ repositoryRootPath, path });

    expect(result.path).toBe(path);
    expect(result.algorithm).toBe('SHA256_CANONICAL_JSON_V1');
    expect(result.fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('fingerprints a rights decision record', () => {
    const repositoryRootPath = root();
    const path = 'docs/content-intake/evidence/rights/decisions/SID-RGT-DEC-20260701-001.json';
    write(repositoryRootPath, path, { decisionId: 'SID-RGT-DEC-20260701-001' });

    expect(
      fingerprintSiddharSubjectFile({ repositoryRootPath, path }).fingerprint,
    ).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is stable across JSON object key order', () => {
    const repositoryRootPath = root();
    const left =
      'docs/content-intake/evidence/submissions/SID-SUB-20260701-001.json';
    const right =
      'docs/content-intake/evidence/submissions/SID-SUB-20260701-002.json';
    write(repositoryRootPath, left, '{"b":2,"a":1}');
    write(repositoryRootPath, right, '{"a":1,"b":2}');

    expect(
      fingerprintSiddharSubjectFile({ repositoryRootPath, path: left }).fingerprint,
    ).toBe(
      fingerprintSiddharSubjectFile({ repositoryRootPath, path: right }).fingerprint,
    );
  });

  it('rejects paths outside the controlled subject namespaces', () => {
    const repositoryRootPath = root();
    const path = 'config/siddhar-editorial-disposition-governance.json';
    write(repositoryRootPath, path, { schemaVersion: 1 });

    expect(() =>
      fingerprintSiddharSubjectFile({ repositoryRootPath, path }),
    ).toThrow(/submissions\/ or rights\/decisions/);
  });

  it('rejects parent-directory traversal', () => {
    const repositoryRootPath = root();

    expect(() =>
      fingerprintSiddharSubjectFile({
        repositoryRootPath,
        path: 'docs/content-intake/evidence/submissions/../secret.json',
      }),
    ).toThrow(/normalised JSON path/);
  });

  it('rejects Windows-style path separators', () => {
    const repositoryRootPath = root();

    expect(() =>
      fingerprintSiddharSubjectFile({
        repositoryRootPath,
        path: 'docs\\content-intake\\evidence\\submissions\\packet.json',
      }),
    ).toThrow(/normalised JSON path/);
  });

  it('rejects non-JSON files', () => {
    const repositoryRootPath = root();

    expect(() =>
      fingerprintSiddharSubjectFile({
        repositoryRootPath,
        path: 'docs/content-intake/evidence/submissions/packet.txt',
      }),
    ).toThrow(/normalised JSON path/);
  });

  it('rejects missing files', () => {
    const repositoryRootPath = root();

    expect(() =>
      fingerprintSiddharSubjectFile({
        repositoryRootPath,
        path: 'docs/content-intake/evidence/submissions/missing.json',
      }),
    ).toThrow(/does not exist/);
  });

  it('rejects malformed JSON rather than hashing raw malformed bytes', () => {
    const repositoryRootPath = root();
    const path = 'docs/content-intake/evidence/submissions/bad.json';
    write(repositoryRootPath, path, '{"bad":');

    expect(() =>
      fingerprintSiddharSubjectFile({ repositoryRootPath, path }),
    ).toThrow(/valid JSON/);
  });

  it('rejects symbolic links to prevent subject path substitution', () => {
    const repositoryRootPath = root();
    const target = write(repositoryRootPath, 'outside/target.json', { value: 1 });
    const path = 'docs/content-intake/evidence/submissions/link.json';
    const link = join(repositoryRootPath, path);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link);

    expect(() =>
      fingerprintSiddharSubjectFile({ repositoryRootPath, path }),
    ).toThrow(/symbolic link/);
  });
});
