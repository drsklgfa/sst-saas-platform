import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  const category = String(form.get('category') ?? '').trim().toUpperCase();
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim() || null;
  const instructions = String(form.get('instructions') ?? '').trim() || null;
  if (!name || name.length > 180 || !title || title.length > 180 || !/^[A-Z0-9_\-]{2,80}$/.test(category)) return new Response('Dados do questionário inválidos', { status: 400 });

  const questionnaire = await db.questionnaire.create({
    data: {
      tenantId: tenant.id,
      name,
      category,
      description,
      versions: { create: { version: 1, title, instructions } },
    },
    include: { versions: true },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'CREATE', entityType: 'Questionnaire', entityId: questionnaire.id, after: questionnaire });
  return NextResponse.redirect(publicAppUrl(`/questionnaires/${questionnaire.id}`), 303);
}
