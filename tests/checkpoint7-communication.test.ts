import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('schema preserva mensagens, anexos, comentários e notificações', async () => {
  const schema = await source('prisma/schema.prisma');
  assert.match(schema, /model MessageAttachment/);
  assert.match(schema, /model EntityComment/);
  assert.match(schema, /model CommentAttachment/);
  assert.match(schema, /attachments\s+MessageAttachment\[\]/);
  assert.match(schema, /metadata\s+Json\s+@default\("\{\}"\)/);
  assert.match(schema, /resolvedAt\s+DateTime\?/);
  assert.match(schema, /muted\s+Boolean\s+@default\(false\)/);
});

test('mensagens suportam anexos, notas internas e notificações por destinatário', async () => {
  const route = await source('src/app/api/conversations/[id]/messages/route.ts');
  assert.match(route, /form\.getAll\('attachments'\)/);
  assert.match(route, /internalAuthorized && form\.get\('internal'\)/);
  assert.match(route, /conversationHrefForUser/);
  assert.match(route, /candidate\.muted/);
  assert.match(route, /MESSAGE_ATTACHMENT/);
});

test('arquivos internos de comunicação exigem permissão de mensagens', async () => {
  const route = await source('src/app/api/files/local/route.ts');
  assert.match(route, /internalMessageAttachment/);
  assert.match(route, /internalCommentAttachment/);
  assert.match(route, /hasTenantPermission\(membership\.role, 'message\.manage'/);
  assert.match(route, /messageAttachment && hasCompanyPermission/);
});

test('central de notificações possui leitura individual e em lote', async () => {
  const page = await source('src/app/(app)/notifications/page.tsx');
  const portal = await source('src/app/portal/notifications/page.tsx');
  const read = await source('src/app/api/notifications/[id]/read/route.ts');
  const readAll = await source('src/app/api/notifications/read-all/route.ts');
  assert.match(page, /Marcar todas como lidas/);
  assert.match(portal, /Atualizações da consultoria/);
  assert.match(read, /userId: user\.id/);
  assert.match(readAll, /readAt: null/);
});

test('conversas possuem atribuição, prioridade, situação e auditoria', async () => {
  const route = await source('src/app/api/conversations/[id]/manage/route.ts');
  const page = await source('src/app/(app)/messages/[id]/page.tsx');
  assert.match(route, /authorizeTenantApi\('message\.manage'\)/);
  assert.match(route, /assignedToId/);
  assert.match(route, /conversationStatuses/);
  assert.match(route, /await audit/);
  assert.match(page, /Organização da conversa/);
});

test('comentários vinculados validam entidade e respeitam visibilidade', async () => {
  const internal = await source('src/app/api/companies/[id]/comments/route.ts');
  const portal = await source('src/app/api/portal/companies/[id]/comments/route.ts');
  const resolver = await source('src/domain/communication/entities.ts');
  assert.match(resolver, /ACTION_EVIDENCE/);
  assert.match(resolver, /DOCUMENT/);
  assert.match(internal, /internal \? 'PRIVATE' : 'COMPANY'/);
  assert.match(portal, /authorizeCompanyApi\(id, 'message\.reply'\)/);
  assert.match(portal, /notifyTenantPermission/);
});

test('evidências, ações e documentos geram alertas operacionais', async () => {
  const evidence = await source('src/app/api/portal/actions/[id]/evidence/route.ts');
  const action = await source('src/app/api/portal/actions/[id]/status/route.ts');
  const review = await source('src/app/api/action-evidences/[id]/review/route.ts');
  const report = await source('src/domain/reports/generate.ts');
  assert.match(evidence, /notifyTenantPermission/);
  assert.match(action, /type: 'ACTION'/);
  assert.match(review, /notifyUsers/);
  assert.match(report, /Documento liberado/);
});

test('backup versão 7 preserva conversas, anexos e comentários', async () => {
  const exporter = await source('src/domain/backup/export-company.ts');
  const importer = await source('src/domain/backup/import-company.ts');
  assert.match(exporter, /version: 8/);
  assert.match(exporter, /comments:/);
  assert.match(exporter, /attachments: true/);
  assert.match(importer, /messageAttachment\.create/);
  assert.match(importer, /entityComment\.create/);
  assert.match(importer, /commentAttachment\.create/);
});

test('backup completo da plataforma usa o mesmo formato portátil versão 7', async () => {
  const exporter = await source('src/domain/backup/export-platform.ts');
  assert.match(exporter, /version: 8/);
});
