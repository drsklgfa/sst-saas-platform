import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { normalizeBrazilPhone } from '@/lib/phone';
import { optionalText, requiredText } from '@/domain/companies/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  try {
    const form = await request.formData();
    const operation = String(form.get('operation') ?? 'create');
    if (!['create', 'update', 'archive', 'restore'].includes(operation)) return new Response('Operação inválida', { status: 400 });
    const contactId = String(form.get('contactId') ?? '').trim();
    const before = contactId ? await db.companyContact.findFirst({ where: { id: contactId, companyId: company.id } }) : null;
    if (operation !== 'create' && !before) return new Response('Contato não encontrado', { status: 404 });

    if (operation === 'archive' || operation === 'restore') {
      const after = await db.companyContact.update({ where: { id: contactId }, data: { active: operation === 'restore', isPrimary: operation === 'archive' ? false : before?.isPrimary } });
      await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: operation.toUpperCase(), entityType: 'CompanyContact', entityId: contactId, before, after });
      return NextResponse.redirect(publicAppUrl(`/companies/${company.id}/contacts?updated=1`), 303);
    }

    const phoneDisplay = optionalText(form.get('phone'), 40);
    let phoneE164: string | null = null;
    if (phoneDisplay) {
      try { phoneE164 = normalizeBrazilPhone(phoneDisplay); } catch { return new Response('Telefone inválido', { status: 400 }); }
    }
    const email = optionalText(form.get('email'), 254)?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response('E-mail inválido', { status: 400 });
    const isPrimary = form.get('isPrimary') === 'true';
    if (isPrimary) await db.companyContact.updateMany({ where: { companyId: company.id, id: contactId ? { not: contactId } : undefined }, data: { isPrimary: false } });
    const data = {
      name: requiredText(form.get('name'), 'Nome'),
      role: optionalText(form.get('role'), 120),
      email,
      phoneDisplay,
      phoneE164,
      hasWhatsapp: form.get('hasWhatsapp') === 'true',
      preferredChannel: optionalText(form.get('preferredChannel'), 30),
      isPrimary,
      active: true,
    };
    const after = operation === 'update'
      ? await db.companyContact.update({ where: { id: contactId }, data })
      : await db.companyContact.create({ data: { companyId: company.id, ...data } });
    await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: operation === 'update' ? 'UPDATE' : 'CREATE', entityType: 'CompanyContact', entityId: after.id, before, after });
    return NextResponse.redirect(publicAppUrl(`/companies/${company.id}/contacts?${operation === 'update' ? 'updated' : 'created'}=1`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
