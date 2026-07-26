import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('questionários publicados são imutáveis e versionáveis', () => {
  const questionsRoute = read('src/app/api/questionnaire-versions/[id]/questions/route.ts');
  const versionsRoute = read('src/app/api/questionnaires/[id]/versions/route.ts');
  assert.match(questionsRoute, /Versão publicada é imutável/);
  assert.match(versionsRoute, /source\.version \+ 1/);
  assert.match(versionsRoute, /options: \{ create:/);
});

test('resposta pública valida conteúdo, código e duplicidade anônima', () => {
  const route = read('src/app/api/public/campaigns/[token]/responses/route.ts');
  const schema = read('prisma/schema.prisma');
  assert.match(route, /validateQuestionnaireResponse/);
  assert.match(route, /normalizeParticipationCode/);
  assert.match(route, /codeHash: sha256/);
  assert.match(route, /P2002/);
  assert.match(schema, /@@unique\(\[campaignId,\s*anonymousFingerprint\]\)/);
  assert.doesNotMatch(route, /user-agent/);
});

test('formulário público salva rascunho somente no navegador', () => {
  const component = read('src/components/public-questionnaire.tsx');
  assert.match(component, /localStorage\.setItem\(draftKey/);
  assert.match(component, /localStorage\.removeItem\(draftKey/);
  assert.match(component, /crypto\?\.randomUUID/);
  assert.match(component, /progresso salvo automaticamente/);
});

test('campanha valida vínculos, publica códigos apenas no CSV e audita moderação', () => {
  const campaignRoute = read('src/app/api/companies/[id]/campaigns/route.ts');
  const codesRoute = read('src/app/api/campaigns/[id]/codes/route.ts');
  const moderationRoute = read('src/app/api/responses/[id]/moderation/route.ts');
  assert.match(campaignRoute, /companyId: company\.id/);
  assert.match(campaignRoute, /publishedAt: \{ not: null \}/);
  assert.match(codesRoute, /codeHash: sha256\(code\)/);
  assert.match(codesRoute, /text\/csv/);
  assert.match(moderationRoute, /authorizeTenantApi\('response\.moderate'\)/);
  assert.match(moderationRoute, /audit\(/);
});
