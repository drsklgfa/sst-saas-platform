import { publicAppUrl } from '@/lib/public-url';
import type { CampaignStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';

const allowed = new Set<CampaignStatus>(['ACTIVE', 'PAUSED', 'CLOSED', 'REOPENED', 'ARCHIVED', 'CANCELLED']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const status = String(form.get('status')) as CampaignStatus;
  if (!allowed.has(status)) return new Response('Status inválido', { status: 400 });
  const campaign = await db.campaign.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!campaign) return new Response('Campanha não encontrada', { status: 404 });
  if (['ARCHIVED', 'CANCELLED'].includes(campaign.status) && status !== campaign.status) return new Response('Campanha arquivada ou cancelada não pode ser reaberta', { status: 409 });
  const now = new Date();
  const updated = await db.campaign.update({
    where: { id: campaign.id },
    data: {
      status,
      startsAt: ['ACTIVE', 'REOPENED'].includes(status) && !campaign.startsAt ? now : undefined,
      endsAt: status === 'CLOSED' ? now : status === 'REOPENED' ? null : undefined,
    },
  });
  await audit({ tenantId: tenant.id, companyId: campaign.companyId, userId: user.id, action: 'CHANGE_STATUS', entityType: 'Campaign', entityId: campaign.id, before: { status: campaign.status }, after: { status: updated.status }, metadata: { previousStatus: campaign.status } });
  return NextResponse.redirect(publicAppUrl(`/campaigns/${campaign.id}`), 303);
}
