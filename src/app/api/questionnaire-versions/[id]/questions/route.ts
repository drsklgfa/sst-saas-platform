import { publicAppUrl } from '@/lib/public-url';
import type { QuestionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { parseConditions, parseQuestionOptions, slugQuestionCode } from '@/domain/questionnaires/editor';
import { toPrismaJson } from '@/lib/prisma-json';

const allowedTypes = new Set<QuestionType>(['YES_NO', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'LIKERT', 'NUMBER', 'TEXT', 'LONG_TEXT', 'DATE', 'BODY_MAP', 'MATRIX']);
function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new Error('Número inválido');
  return number;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const version = await db.questionnaireVersion.findFirst({ where: { id, questionnaire: { tenantId: tenant.id } }, include: { questionnaire: true, questions: { orderBy: { position: 'desc' }, take: 1 } } });
  if (!version) return new Response('Versão não encontrada', { status: 404 });
  if (version.publishedAt) return new Response('Versão publicada é imutável. Crie uma nova versão.', { status: 409 });
  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'create');
  const questionId = String(form.get('questionId') ?? '').trim();

  if (operation === 'delete') {
    const question = await db.question.findFirst({ where: { id: questionId, questionnaireVersionId: version.id } });
    if (!question) return new Response('Pergunta não encontrada', { status: 404 });
    await db.question.delete({ where: { id: question.id } });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'DELETE', entityType: 'Question', entityId: question.id, before: question });
    return NextResponse.redirect(publicAppUrl(`/questionnaires/${version.questionnaireId}?version=${version.version}&saved=1`), 303);
  }

  try {
    const text = String(form.get('text') ?? '').trim();
    const type = String(form.get('type') ?? '') as QuestionType;
    const code = slugQuestionCode(form.get('code') || text);
    const helpText = String(form.get('helpText') ?? '').trim() || null;
    const dimension = String(form.get('dimension') ?? '').trim().toUpperCase() || null;
    const required = form.get('required') === 'true';
    const reverseScore = form.get('reverseScore') === 'true';
    const minValue = optionalNumber(form.get('minValue'));
    const maxValue = optionalNumber(form.get('maxValue'));
    const conditions = parseConditions(form.get('conditions'));
    if (!text || text.length > 1000 || !code || !allowedTypes.has(type)) return new Response('Dados da pergunta inválidos', { status: 400 });
    if (minValue !== null && maxValue !== null && minValue > maxValue) return new Response('O valor mínimo não pode superar o máximo', { status: 400 });
    const options = parseQuestionOptions(type, form.get('options'));
    const requestedPosition = Number(form.get('position'));
    const position = Number.isInteger(requestedPosition) && requestedPosition > 0 ? requestedPosition : (version.questions[0]?.position ?? 0) + 1;
    const duplicate = await db.question.findFirst({ where: { questionnaireVersionId: version.id, code, id: operation === 'update' ? { not: questionId } : undefined } });
    if (duplicate) return new Response('Já existe uma pergunta com esse código nesta versão', { status: 409 });

    if (operation === 'update') {
      const before = await db.question.findFirst({ where: { id: questionId, questionnaireVersionId: version.id }, include: { options: true } });
      if (!before) return new Response('Pergunta não encontrada', { status: 404 });
      const updated = await db.$transaction(async (tx) => {
        await tx.questionOption.deleteMany({ where: { questionId: before.id } });
        return tx.question.update({
          where: { id: before.id },
          data: { text, code, type, helpText, dimension, required, reverseScore, minValue, maxValue, position, conditions: toPrismaJson(conditions, []), options: { create: options } },
          include: { options: true },
        });
      });
      await audit({ tenantId: tenant.id, userId: user.id, action: 'UPDATE', entityType: 'Question', entityId: updated.id, before, after: updated });
    } else {
      const created = await db.question.create({
        data: { questionnaireVersionId: version.id, text, code, type, helpText, dimension, required, reverseScore, minValue, maxValue, position, conditions: toPrismaJson(conditions, []), options: { create: options } },
        include: { options: true },
      });
      await audit({ tenantId: tenant.id, userId: user.id, action: 'CREATE', entityType: 'Question', entityId: created.id, after: created });
    }
    return NextResponse.redirect(publicAppUrl(`/questionnaires/${version.questionnaireId}?version=${version.version}&saved=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
