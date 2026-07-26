import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { campaignAvailability, normalizeParticipationCode } from '@/domain/campaigns';
import { detectResponseQuality, validateQuestionnaireResponse } from '@/domain/questionnaires/rules';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';
import { toPrismaJson } from '@/lib/prisma-json';

const schema = z.object({
  deviceId: z.string().min(16).max(120),
  code: z.string().max(40).optional().default(''),
  startedAt: z.string().datetime(),
  answers: z.array(z.object({ questionId: z.string().uuid(), value: z.unknown() })).max(500),
  bodyPains: z.array(z.object({ regionCode: z.string().min(2).max(50), intensity: z.number().int().min(1).max(10) })).max(50).default([]),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const networkLimit = checkRateLimit(`response-network:${token}:${requestAddress(request.headers)}`, 120, 60 * 60_000);
  if (!networkLimit.allowed) return Response.json({ error: 'Muitas tentativas nesta rede. Aguarde e tente novamente.' }, { status: 429, headers: { 'retry-after': String(networkLimit.retryAfterSeconds) } });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const campaign = await db.campaign.findFirst({
    where: { OR: [{ publicToken: token }, { targets: { some: { token } } }] },
    include: {
      targets: true,
      questionnaires: { include: { questionnaireVersion: { include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } } } }, orderBy: { position: 'asc' } },
    },
  });
  if (!campaign || campaignAvailability(campaign) !== 'OPEN') return Response.json({ error: 'Campanha fechada ou indisponível' }, { status: 409 });
  const target = campaign.targets.find((candidate) => candidate.token === token);
  if (campaign.targets.length > 0 && !target) return Response.json({ error: 'Use o link correspondente ao seu grupo de trabalho' }, { status: 409 });
  const fingerprint = sha256(`campaign-device-v2|${campaign.id}|${parsed.data.deviceId}`);
  const deviceLimit = checkRateLimit(`response-device:${fingerprint}`, 5, 10 * 60_000);
  if (!deviceLimit.allowed) return Response.json({ error: 'Muitas tentativas neste navegador. Aguarde alguns minutos.' }, { status: 429, headers: { 'retry-after': String(deviceLimit.retryAfterSeconds) } });

  const questions = campaign.questionnaires.flatMap((item) => item.questionnaireVersion.questions.map((question) => ({
    id: question.id,
    code: question.code,
    type: question.type,
    required: question.required,
    minValue: question.minValue,
    maxValue: question.maxValue,
    conditions: question.conditions,
    options: question.options.map((option) => ({ value: option.value, score: option.score })),
  })));
  const validation = validateQuestionnaireResponse({ questions, answers: parsed.data.answers, bodyPains: parsed.data.bodyPains });
  if (!validation.valid) return Response.json({ error: validation.errors[0] ?? 'Respostas inválidas', errors: validation.errors }, { status: 400 });

  const startedAt = new Date(parsed.data.startedAt);
  const durationSeconds = Math.max(0, Math.min(86_400, Math.round((Date.now() - startedAt.getTime()) / 1000)));
  const activeAnswers = parsed.data.answers.filter((answer) => validation.activeQuestionIds.has(answer.questionId));
  const qualityFlags = detectResponseQuality({ durationSeconds, activeQuestionCount: validation.activeQuestionIds.size, answers: activeAnswers });
  const allQuestions = campaign.questionnaires.flatMap((item) => item.questionnaireVersion.questions);
  const questionById = new Map<string, (typeof allQuestions)[number]>(allQuestions.map((question) => [question.id, question] as const));
  const normalizedCode = normalizeParticipationCode(parsed.data.code);
  if (campaign.anonymousCodesEnabled && normalizedCode.length < 6) return Response.json({ error: 'Informe um código anônimo válido' }, { status: 400 });

  try {
    await db.$transaction(async (tx) => {
      if (campaign.anonymousCodesEnabled) {
        const code = await tx.anonymousCode.findFirst({ where: { campaignId: campaign.id, codeHash: sha256(normalizedCode), usedAt: null } });
        if (!code) throw new Error('INVALID_CODE');
        const consumed = await tx.anonymousCode.updateMany({ where: { id: code.id, usedAt: null }, data: { usedAt: new Date() } });
        if (!consumed.count) throw new Error('INVALID_CODE');
      }

      await tx.responseSession.create({
        data: {
          campaignId: campaign.id,
          gheId: target?.gheId,
          status: 'SUBMITTED',
          anonymousFingerprint: fingerprint,
          submittedAt: new Date(),
          durationSeconds,
          qualityFlags: toPrismaJson(qualityFlags, []),
          moderation: toPrismaJson({ automatedFlags: qualityFlags, reviewed: false }),
          answers: {
            create: activeAnswers.map((answer) => {
              const question = questionById.get(answer.questionId);
              const selected = question?.options.find((option) => option.value === String(answer.value));
              const number = question?.type === 'NUMBER' ? Number(answer.value) : selected?.score ?? null;
              return { questionId: answer.questionId, value: toPrismaJson(answer.value, ''), numericValue: typeof number === 'number' && Number.isFinite(number) ? number : null };
            }),
          },
          bodyPains: { create: parsed.data.bodyPains },
        },
      });
    });
    return Response.json({ ok: true }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CODE') return Response.json({ error: 'Código inválido ou já utilizado' }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return Response.json({ error: 'Este navegador já registrou uma participação nesta campanha' }, { status: 409 });
    console.error('Falha ao registrar resposta pública:', error);
    return Response.json({ error: 'Não foi possível registrar a resposta' }, { status: 500 });
  }
}
