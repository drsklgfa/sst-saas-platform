import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { csvItems, optionalDate, optionalMoney } from '../src/domain/companies/validation.ts';

test('normaliza valores monetários brasileiros', () => {
  assert.equal(optionalMoney('1.234,56'), '1234.56');
  assert.equal(optionalMoney('90'), '90.00');
  assert.equal(optionalMoney(''), null);
  assert.throws(() => optionalMoney('R$ 1.000,00'));
});

test('normaliza datas e listas operacionais', () => {
  assert.equal(optionalDate('2026-07-22')?.toISOString(), '2026-07-22T12:00:00.000Z');
  assert.equal(optionalDate(''), null);
  assert.deepEqual(csvItems('Operar máquina, Inspecionar; Limpar\nRegistrar'), ['Operar máquina', 'Inspecionar', 'Limpar', 'Registrar']);
});

test('schema preserva estrutura e serviços sem exclusão destrutiva', async () => {
  const schema = await readFile('prisma/schema.prisma', 'utf8');
  assert.match(schema, /model ServiceContract \{/);
  assert.match(schema, /services\s+ServiceContract\[\]/);
  for (const model of ['CompanyContact', 'Establishment', 'Sector', 'GHE', 'JobFunction', 'Workstation', 'ServiceContract']) {
    const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    assert.match(block, /active\s+Boolean\s+@default\(true\)/, `${model} deve permitir arquivamento lógico`);
  }
});

test('backup portátil inclui serviços contratados', async () => {
  const exporter = await readFile('src/domain/backup/export-company.ts', 'utf8');
  const importer = await readFile('src/domain/backup/import-company.ts', 'utf8');
  assert.match(exporter, /services: true/);
  assert.match(importer, /source\.services/);
  assert.match(importer, /db\.serviceContract\.create/);
});

test('rotas operacionais exigem autorização, vínculo e auditoria', async () => {
  const files = [
    'src/app/api/companies/[id]/profile/route.ts',
    'src/app/api/companies/[id]/structure/route.ts',
    'src/app/api/companies/[id]/structure/[entityId]/route.ts',
    'src/app/api/companies/[id]/services/route.ts',
    'src/app/api/companies/[id]/services/[serviceId]/route.ts',
    'src/app/api/companies/[id]/contacts/route.ts',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /authorizeTenantApi\('company\.write'\)/, file);
    assert.match(source, /tenantId: tenant\.id|company: \{ tenantId: tenant\.id \}/, file);
    assert.match(source, /audit\(/, file);
  }
});
