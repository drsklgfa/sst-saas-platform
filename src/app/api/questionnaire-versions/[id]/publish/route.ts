import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';

function conditionReferences(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => item && typeof item === 'object' && typeof (item as { questionCode?: unknown }).questionCode === 'string' ? [(item as { questionCode: string }).questionCode] : []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const version = await db.questionnaireVersion.findFirst({ where: { id, questionnaire: { tenantId: tenant.id, active: true } }, include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } } });
  if (!version) return new Response('Versão não encontrada', { status: 404 });
  if (version.publishedAt) return NextResponse.redirect(publicAppUrl(`/questionnaires/${version.questionnaireId}?version=${version.version}`), 303);
  if (!version.questions.length) return new Response('Inclua pelo menos uma pergunta antes de publicar', { status: 409 });
  const invalidOptions = version.questions.find((question) => ['YES_NO', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'LIKERT'].includes(question.type) && question.options.length < 2);
  if (invalidOptions) return new Response(`A pergunta ${invalidOptions.code} precisa de pelo menos duas opções`, { status: 409 });
  const unsupported = version.questions.find((question) => question.type === 'FILE');
  if (unsupported) return new Response('Perguntas de arquivo não estão habilitadas em campanhas anônimas', { status: 409 });
  const codes = new Set(version.questions.map((question) => question.code));
  for (const question of version.questions) {
    for (const reference of conditionReferences(question.conditions)) if (!codes.has(reference)) return new Response(`A pergunta ${question.code} depende do código inexistente ${reference}`, { status: 409 });
  }
  const publishedAt = new Date();
  await db.questionnaireVersion.update({ where: { id: version.id }, data: { publishedAt } });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'PUBLISH', entityType: 'QuestionnaireVersion', entityId: version.id, after: { publishedAt, version: version.version } });
  return NextResponse.redirect(publicAppUrl(`/questionnaires/${version.questionnaireId}?version=${version.version}`), 303);
}
