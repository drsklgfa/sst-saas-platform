import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { NextResponse } from 'next/server';

const statuses = new Set(['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED']);
const severities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeTenantApi('security.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const current = await db.securityIncident.findFirst({ where: { id, tenantId: tenant.id } });
  if (!current) return new Response('Incidente não encontrado', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status') ?? current.status);
  const severity = String(form.get('severity') ?? current.severity);
  const note = String(form.get('note') ?? '').trim().slice(0, 4000);
  if (!statuses.has(status) || !severities.has(severity)) return new Response('Dados inválidos', { status: 400 });
  const now = new Date();
  const actions = Array.isArray(current.actions) ? current.actions : [];
  const next = await db.securityIncident.update({
    where: { id },
    data: {
      status: status as 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED',
      severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      ownerId: user.id,
      containedAt: status === 'CONTAINED' && !current.containedAt ? now : current.containedAt,
      resolvedAt: status === 'RESOLVED' && !current.resolvedAt ? now : current.resolvedAt,
      closedAt: status === 'CLOSED' && !current.closedAt ? now : current.closedAt,
      actions: toPrismaJson(note ? [...actions, { note, at: now.toISOString(), userId: user.id }] : actions, []),
    },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'SECURITY_INCIDENT_UPDATED', entityType: 'SecurityIncident', entityId: id, before: current, after: next });
  return NextResponse.redirect(publicAppUrl('/settings/security?incident=updated'), 303);
}
