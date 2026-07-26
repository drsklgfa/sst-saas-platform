import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  const form = await request.formData();
  const gheId = String(form.get('gheId') ?? '').trim() || null;
  const title = String(form.get('title') ?? '').trim();
  if (!title || title.length > 200) return new Response('Título inválido', { status: 400 });
  if (gheId) {
    const ghe = await db.gHE.findFirst({ where: { id: gheId, active: true, sector: { active: true, establishment: { companyId: company.id, active: true } } } });
    if (!ghe) return new Response('GHE não pertence à empresa', { status: 400 });
  }

  const inspection = await db.inspection.create({
    data: {
      companyId: company.id,
      gheId,
      title,
      notes: String(form.get('notes') ?? '').trim() || null,
      status: 'IN_PROGRESS',
      performedById: user.id,
      performedAt: new Date(),
    },
  });
  await audit({ tenantId: tenant.id, companyId: company.id, userId: user.id, action: 'CREATE', entityType: 'Inspection', entityId: inspection.id, after: inspection });
  return NextResponse.redirect(publicAppUrl(`/inspections/${inspection.id}`), 303);
}
