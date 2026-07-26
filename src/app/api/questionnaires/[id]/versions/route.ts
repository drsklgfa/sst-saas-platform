import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const questionnaire = await db.questionnaire.findFirst({
    where: { id, tenantId: tenant.id, active: true },
    include: { versions: { orderBy: { version: 'desc' }, take: 1, include: { questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } } } } },
  });
  if (!questionnaire) return new Response('Questionário não encontrado', { status: 404 });
  const source = questionnaire.versions[0];
  if (!source) return new Response('Versão de origem não encontrada', { status: 409 });
  const created = await db.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      version: source.version + 1,
      title: source.title,
      instructions: source.instructions,
      scoringConfig: toPrismaJson(source.scoringConfig),
      questions: {
        create: source.questions.map((question) => ({
          code: question.code,
          text: question.text,
          helpText: question.helpText,
          type: question.type,
          required: question.required,
          position: question.position,
          dimension: question.dimension,
          reverseScore: question.reverseScore,
          minValue: question.minValue,
          maxValue: question.maxValue,
          conditions: toPrismaJson(question.conditions, []),
          metadata: toPrismaJson(question.metadata),
          options: { create: question.options.map((option) => ({ value: option.value, label: option.label, score: option.score, position: option.position })) },
        })),
      },
    },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'CREATE_VERSION', entityType: 'QuestionnaireVersion', entityId: created.id, metadata: { questionnaireId: questionnaire.id, sourceVersion: source.version, version: created.version } });
  return NextResponse.redirect(publicAppUrl(`/questionnaires/${questionnaire.id}?version=${created.version}`), 303);
}
