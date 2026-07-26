import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomToken } from '@/lib/crypto';
import { audit } from '@/lib/audit';
import { campaignStatusForCreation, parseOptionalIsoDate } from '@/domain/campaigns';
import { toPrismaJson } from '@/lib/prisma-json';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  const expectedResponses = Math.max(0, Math.min(100000, Number(form.get('expectedResponses')) || 0));
  const minimumGroupSize = Math.max(3, Math.min(100, Number(form.get('minimumGroupSize')) || 5));
  const detailedGroupSize = Math.max(minimumGroupSize, Math.min(100, Number(form.get('detailedGroupSize')) || 10));
  const gheIds = [...new Set(form.getAll('gheIds').map(String).filter(Boolean))];
  const questionnaireVersionIds = [...new Set(form.getAll('questionnaireVersionIds').map(String).filter(Boolean))];
  const anonymousCodesEnabled = form.get('anonymousCodesEnabled') === 'true';
  const privacyNotice = String(form.get('privacyNotice') ?? '').trim().slice(0, 1000);
  if (!name || name.length > 200) return new Response('Nome da campanha inválido', { status: 400 });
  if (!questionnaireVersionIds.length) return new Response('Selecione pelo menos um questionário publicado', { status: 400 });

  try {
    const startsAt = parseOptionalIsoDate(form.get('startsAtUtc'));
    const endsAt = parseOptionalIsoDate(form.get('endsAtUtc'));
    if (startsAt && endsAt && endsAt <= startsAt) return new Response('O encerramento precisa ser posterior à abertura', { status: 400 });
    const status = campaignStatusForCreation({ requested: String(form.get('requestedStatus') ?? 'ACTIVE'), startsAt });

    const [validGhes, validVersions] = await Promise.all([
      gheIds.length ? db.gHE.findMany({ where: { id: { in: gheIds }, active: true, sector: { active: true, establishment: { active: true, companyId: company.id } } }, select: { id: true, employeeCount: true } }) : Promise.resolve([]),
      db.questionnaireVersion.findMany({ where: { id: { in: questionnaireVersionIds }, publishedAt: { not: null }, questionnaire: { tenantId: tenant.id, active: true } }, select: { id: true } }),
    ]);
    if (validGhes.length !== gheIds.length) return new Response('Um ou mais GHEs não pertencem à empresa', { status: 400 });
    if (validVersions.length !== questionnaireVersionIds.length) return new Response('Um ou mais questionários são inválidos ou não estão publicados', { status: 400 });

    const campaign = await db.campaign.create({
      data: {
        companyId: company.id,
        name,
        publicToken: randomToken(24),
        status,
        startsAt: startsAt ?? (status === 'ACTIVE' ? new Date() : null),
        endsAt,
        expectedResponses,
        minimumGroupSize,
        detailedGroupSize,
        anonymousCodesEnabled,
        settings: toPrismaJson({ privacyNotice, allowBrowserResume: true, fingerprintVersion: 2 }),
        targets: validGhes.length ? { create: validGhes.map((ghe) => ({ gheId: ghe.id, expectedResponses: ghe.employeeCount, token: randomToken(24) })) } : undefined,
        questionnaires: { create: validVersions.map((version, index) => ({ questionnaireVersionId: version.id, position: index + 1 })) },
      },
    });
    await audit({ tenantId: tenant.id, companyId: company.id, userId: user.id, action: 'CREATE', entityType: 'Campaign', entityId: campaign.id, after: campaign });
    return NextResponse.redirect(publicAppUrl(`/campaigns/${campaign.id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Não foi possível criar a campanha', { status: 400 });
  }
}
