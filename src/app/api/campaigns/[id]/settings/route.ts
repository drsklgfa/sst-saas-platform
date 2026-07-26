import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { campaignStatusForCreation, parseOptionalIsoDate } from '@/domain/campaigns';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';

function currentPrivacy(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object' && !Array.isArray(settings) ? { ...(settings as Record<string, unknown>) } : {};
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const campaign = await db.campaign.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!campaign) return new Response('Campanha não encontrada', { status: 404 });
  if (['ARCHIVED', 'CANCELLED'].includes(campaign.status)) return new Response('Campanha arquivada ou cancelada não pode ser alterada', { status: 409 });
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  const expectedResponses = Math.max(0, Math.min(100000, Number(form.get('expectedResponses')) || 0));
  const minimumGroupSize = Math.max(3, Math.min(100, Number(form.get('minimumGroupSize')) || 5));
  const detailedGroupSize = Math.max(minimumGroupSize, Math.min(100, Number(form.get('detailedGroupSize')) || 10));
  const privacyNotice = String(form.get('privacyNotice') ?? '').trim().slice(0, 1000);
  if (!name || name.length > 200) return new Response('Nome inválido', { status: 400 });
  try {
    const startsAt = parseOptionalIsoDate(form.get('startsAtUtc'));
    const endsAt = parseOptionalIsoDate(form.get('endsAtUtc'));
    if (startsAt && endsAt && endsAt <= startsAt) return new Response('O encerramento precisa ser posterior à abertura', { status: 400 });
    const settings = { ...currentPrivacy(campaign.settings), privacyNotice };
    let status = campaign.status;
    if (['ACTIVE', 'SCHEDULED'].includes(status)) status = campaignStatusForCreation({ requested: 'ACTIVE', startsAt });
    const updated = await db.campaign.update({ where: { id: campaign.id }, data: { name, expectedResponses, minimumGroupSize, detailedGroupSize, startsAt, endsAt, status, settings: toPrismaJson(settings) } });
    await audit({ tenantId: tenant.id, companyId: campaign.companyId, userId: user.id, action: 'UPDATE', entityType: 'Campaign', entityId: campaign.id, before: campaign, after: updated });
    return NextResponse.redirect(publicAppUrl(`/campaigns/${campaign.id}?saved=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Configuração inválida', { status: 400 });
  }
}
