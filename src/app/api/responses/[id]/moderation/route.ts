import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('response.moderate');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const campaignId = String(form.get('campaignId') ?? '');
  const decision = String(form.get('decision') ?? '');
  const reason = String(form.get('reason') ?? '').trim().slice(0, 1000);
  if (!['include', 'exclude'].includes(decision)) return new Response('Decisão inválida', { status: 400 });
  if (decision === 'exclude' && reason.length < 5) return new Response('Justificativa obrigatória', { status: 400 });
  const session = await db.responseSession.findFirst({ where: { id, campaignId, campaign: { company: { tenantId: tenant.id } } }, include: { campaign: { select: { companyId: true } } } });
  if (!session) return new Response('Resposta não encontrada', { status: 404 });
  const included = decision === 'include';
  const moderation = { decision: included ? 'INCLUDED' : 'EXCLUDED', reason: reason || 'Reinclusão após revisão técnica', moderatedAt: new Date().toISOString(), moderatedById: user.id };
  const updated = await db.responseSession.update({ where: { id: session.id }, data: { includedInConsolidation: included, moderation: toPrismaJson(moderation) } });
  await audit({ tenantId: tenant.id, companyId: session.campaign.companyId, userId: user.id, action: included ? 'INCLUDE_RESPONSE' : 'EXCLUDE_RESPONSE', entityType: 'ResponseSession', entityId: updated.id, before: session, after: updated, metadata: { reason } });
  return NextResponse.redirect(publicAppUrl(`/campaigns/${campaignId}`), 303);
}
