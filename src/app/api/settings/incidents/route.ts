import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const severities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('security.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const title = String(form.get('title') ?? '').trim().slice(0, 180);
  const description = String(form.get('description') ?? '').trim().slice(0, 10000);
  const severity = String(form.get('severity') ?? 'MEDIUM');
  if (title.length < 3 || description.length < 5 || !severities.has(severity)) return new Response('Dados inválidos', { status: 400 });
  const incident = await db.securityIncident.create({ data: { tenantId: tenant.id, title, description, severity: severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', ownerId: user.id } });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'SECURITY_INCIDENT_CREATED', entityType: 'SecurityIncident', entityId: incident.id, after: incident });
  return NextResponse.redirect(publicAppUrl('/settings/security?incident=created'), 303);
}
