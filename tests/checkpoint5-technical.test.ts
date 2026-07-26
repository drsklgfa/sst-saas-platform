import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateRisk } from '../src/domain/engines/risk-matrix.ts';
import { optionalMoney, progressValue } from '../src/domain/actions/validation.ts';

test('avalia risco inicial e residual com limites da matriz', () => {
  assert.deepEqual(calculateRisk(4, 3, 2), { score: 24, level: 'CRITICAL' });
  assert.deepEqual(calculateRisk(2, 2, 1), { score: 4, level: 'LOW' });
  assert.throws(() => calculateRisk(6, 1, 1));
});

test('valida custos e progresso do 5W2H', () => {
  assert.equal(optionalMoney('1.234,50'), '1234.50');
  assert.equal(optionalMoney(''), null);
  assert.equal(progressValue('65'), 65);
  assert.throws(() => progressValue('101'));
});

test('schema vincula evidências, vistoria, riscos e eficácia', async () => {
  const schema = await readFile('prisma/schema.prisma', 'utf8');
  assert.match(schema, /model InspectionEvidence \{/);
  assert.match(schema, /evidences\s+InspectionEvidence\[\]/);
  assert.match(schema, /inspectionId\s+String\?/);
  assert.match(schema, /effectivenessStatus\s+String\?/);
  assert.match(schema, /residualLevel\s+RiskLevel\?/);
  assert.match(schema, /actionEvidences\s+ActionEvidence\[\]/);
});

test('rotas de campo exigem autorização, vínculo e auditoria', async () => {
  const files = [
    'src/app/api/inspections/[id]/details/route.ts',
    'src/app/api/inspections/[id]/items/route.ts',
    'src/app/api/inspections/[id]/evidences/route.ts',
    'src/app/api/inspections/[id]/status/route.ts',
    'src/app/api/companies/[id]/risks/route.ts',
    'src/app/api/risks/[id]/route.ts',
    'src/app/api/companies/[id]/action-plans/route.ts',
    'src/app/api/action-plans/[id]/items/route.ts',
    'src/app/api/actions/[id]/route.ts',
    'src/app/api/actions/[id]/evidences/route.ts',
    'src/app/api/action-evidences/[id]/review/route.ts',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /authorizeTenantApi\(/, file);
    assert.match(source, /tenant\.id/, file);
    assert.match(source, /audit\(/, file);
  }
});

test('vistoria revisada bloqueia alteração e upload limita arquivo', async () => {
  const item = await readFile('src/app/api/inspections/[id]/items/route.ts', 'utf8');
  const evidence = await readFile('src/app/api/inspections/[id]/evidences/route.ts', 'utf8');
  const calculate = await readFile('src/app/api/inspections/[id]/calculate/route.ts', 'utf8');
  assert.match(item, /status === 'REVIEWED'/);
  assert.match(evidence, /20 \* 1024 \* 1024/);
  assert.match(calculate, /engineVersion: '1\.1\.0'/);
  assert.match(calculate, /durationMultiplier/);
});

test('backup versão 7 preserva evidências técnicas e campos ampliados', async () => {
  const exporter = await readFile('src/domain/backup/export-company.ts', 'utf8');
  const importer = await readFile('src/domain/backup/import-company.ts', 'utf8');
  assert.match(exporter, /version: 8/);
  assert.match(exporter, /evidences: true/);
  assert.match(importer, /inspectionMap/);
  assert.match(importer, /db\.inspectionEvidence\.create/);
  assert.match(importer, /effectivenessStatus/);
  assert.match(importer, /legalReferences/);
});

test('worker marca ações vencidas sem excluir histórico', async () => {
  const scheduler = await readFile('src/domain/action-scheduler.ts', 'utf8');
  const worker = await readFile('src/worker/index.ts', 'utf8');
  assert.match(scheduler, /AUTO_OVERDUE/);
  assert.match(scheduler, /status: 'OVERDUE'/);
  assert.match(worker, /syncOverdueActions/);
});

test('telas operacionais expõem inventário, 5W2H e evidências', async () => {
  const inspection = await readFile('src/app/(app)/inspections/[id]/page.tsx', 'utf8');
  const risks = await readFile('src/app/(app)/companies/[id]/risks/page.tsx', 'utf8');
  const actions = await readFile('src/app/(app)/companies/[id]/actions/page.tsx', 'utf8');
  assert.match(inspection, /Checklist técnico/);
  assert.match(inspection, /Memórias de cálculo/);
  assert.match(risks, /Inventário de riscos/);
  assert.match(actions, /Plano de ação 5W2H/);
  assert.match(actions, /Verificador/);
  assert.match(actions, /Resultado da eficácia/);
});
