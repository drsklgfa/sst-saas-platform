import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonicalJsonStringify, hashSnapshot, verifySnapshotHash } from '../src/domain/documents/integrity.ts';
import { auditDocumentSnapshot } from '../src/domain/documents/audit.ts';
import { parseTemplateSchema, validateTemplateSchema } from '../src/domain/documents/templates.ts';

test('hash canônico não depende da ordem das chaves', () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };
  assert.equal(canonicalJsonStringify(left), canonicalJsonStringify(right));
  assert.equal(hashSnapshot(left), hashSnapshot(right));
  assert.equal(verifySnapshotHash(right, hashSnapshot(left)), true);
});

test('auditoria documental identifica pendências críticas e permite justificativa posterior', () => {
  const result = auditDocumentSnapshot({
    document: { title: 'PGR 2026', type: { code: 'PGR' } },
    company: { legalName: 'Empresa Teste', cnpj: '12345678000190', establishments: [], risks: [], actionPlans: [], inspections: [] },
    sections: [
      { code: 'IDENTIFICATION', title: 'Identificação', enabled: true, content: { html: '<p>Empresa Teste</p>' } },
      { code: 'RISKS', title: 'Riscos', enabled: true, content: { html: '<p>Inventário</p>' } },
      { code: 'ACTION_PLAN', title: 'Plano', enabled: true, content: { html: '<p>Ações</p>' } },
    ],
  });
  assert.equal(result.status, 'ERROR');
  assert.ok(result.errorCount >= 2);
  assert.ok(result.checks.some((item) => item.code === 'PGR_ACTION_PLAN' && item.severity === 'ERROR'));
});

test('modelo documental normaliza seções e rejeita códigos duplicados', () => {
  const parsed = parseTemplateSchema({ sections: [{ code: ' identificação ', title: 'Identificação', html: '' }] });
  assert.equal(parsed.sections[0]?.code, 'IDENTIFICACAO');
  assert.match(parsed.sections[0]?.html ?? '', /Preencha/);
  assert.ok(validateTemplateSchema({ sections: [{ code: 'A', title: 'A' }, { code: 'A', title: 'B' }] }).some((item) => item.includes('repetido')));
});

test('prévia e documento oficial possuem tratamento visual separado', async () => {
  const html = await readFile('src/domain/reports/html.ts', 'utf8');
  assert.match(html, /PRÉVIA — NÃO OFICIAL/);
  assert.match(html, /input\.official \? '' :/);
  assert.match(html, /Documento oficial/);
});

test('schema liga arquivos, assinaturas e auditorias à revisão exata', async () => {
  const schema = await readFile('prisma/schema.prisma', 'utf8');
  assert.match(schema, /releasedVersion\s+Int\?/);
  assert.match(schema, /verificationCode\s+String\s+@unique/);
  assert.match(schema, /model DocumentAuditRun \{/);
  assert.match(schema, /documentVersionId\s+String/);
  assert.match(schema, /snapshotHash\s+String/);
  assert.match(schema, /signatureCount\s+Int\s+@default\(0\)/);
});

test('fluxo congela a revisão atual sem criar revisão artificial', async () => {
  const generator = await readFile('src/domain/reports/generate.ts', 'utf8');
  const revision = await readFile('src/app/api/documents/[id]/revisions/route.ts', 'utf8');
  const sections = await readFile('src/app/api/documents/[id]/sections/route.ts', 'utf8');
  assert.doesNotMatch(generator, /currentVersion \+ 1/);
  assert.match(generator, /lockedAt: new Date\(\)/);
  assert.match(revision, /nextVersion = document\.currentVersion \+ 1/);
  assert.match(sections, /Esta revisão está congelada/);
});

test('emissão oficial confere snapshot, assinaturas e revisão liberada', async () => {
  const release = await readFile('src/app/api/documents/[id]/release/route.ts', 'utf8');
  const generator = await readFile('src/domain/reports/generate.ts', 'utf8');
  const portal = await readFile('src/app/portal/company/[id]/page.tsx', 'utf8');
  assert.match(release, /file\.snapshotHash === version\.snapshot\?\.dataHash/);
  assert.match(release, /file\.signatureCount === signatureCount/);
  assert.match(generator, /releasedVersion: versionNumber/);
  assert.match(generator, /visibility: 'PRIVATE'/);
  assert.match(generator, /current\.currentVersion !== versionNumber/);
  assert.match(generator, /transaction\.documentFile\.updateMany/);
  assert.match(generator, /transaction\.fileObject\.update/);
  assert.match(portal, /document\.releasedVersion/);
});

test('arquivo do portal exige que a revisão do arquivo seja a revisão liberada', async () => {
  const route = await readFile('src/app/api/files/local/route.ts', 'utf8');
  assert.match(route, /releasedDocument\.versionNumber === releasedDocument\.document\.releasedVersion/);
});

test('backup versão 7 preserva cadeia documental', async () => {
  const exporter = await readFile('src/domain/backup/export-company.ts', 'utf8');
  const importer = await readFile('src/domain/backup/import-company.ts', 'utf8');
  assert.match(exporter, /version: 8/);
  assert.match(exporter, /auditRuns: true/);
  assert.match(importer, /documentVersionMap/);
  assert.match(importer, /db\.documentAuditRun\.create/);
  assert.match(importer, /snapshotHash/);
});
