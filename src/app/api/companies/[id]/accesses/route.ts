import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';
import type { CompanyUserRole } from '@prisma/client';

const roles = new Set<CompanyUserRole>(['RH_ADMIN', 'SST', 'MANAGER', 'ACTION_OWNER', 'DIRECTOR', 'READER', 'AUDITOR']);

async function createInvite(userId: string, companyId: string, createdById: string): Promise<string> {
  const raw = randomToken(40);
  await db.$transaction([
    db.userInvite.deleteMany({ where: { userId, companyId, usedAt: null } }),
    db.userInvite.create({
      data: {
        userId,
        companyId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 72 * 3_600_000),
        createdById,
      },
    }),
  ]);
  return `${env.APP_URL}/activate/${raw}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('access.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user: creator } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'create');

  if (operation !== 'create') {
    const accessId = String(form.get('accessId') ?? '');
    const access = await db.companyAccess.findFirst({ where: { id: accessId, companyId: company.id }, include: { user: true } });
    if (!access) return new Response('Acesso não encontrado', { status: 404 });

    if (operation === 'suspend') {
      await db.$transaction([
        db.companyAccess.update({ where: { id: access.id }, data: { active: false } }),
        db.session.deleteMany({ where: { userId: access.userId } }),
        db.userInvite.deleteMany({ where: { userId: access.userId, companyId: company.id, usedAt: null } }),
      ]);
      await audit({ tenantId: tenant.id, companyId: company.id, userId: creator.id, action: 'SUSPEND', entityType: 'CompanyAccess', entityId: access.id, before: access, after: { active: false } });
      return NextResponse.redirect(publicAppUrl(`/companies/${company.id}/accesses`), 303);
    }

    if (operation === 'reactivate' || operation === 'reinvite') {
      await db.companyAccess.update({ where: { id: access.id }, data: { active: true } });
      const inviteUrl = await createInvite(access.userId, company.id, creator.id);
      await audit({ tenantId: tenant.id, companyId: company.id, userId: creator.id, action: operation.toUpperCase(), entityType: 'CompanyAccess', entityId: access.id, before: access, after: { active: true } });
      return NextResponse.redirect(publicAppUrl(`/companies/${company.id}/accesses?invite=${encodeURIComponent(inviteUrl)}`), 303);
    }

    return new Response('Operação inválida', { status: 400 });
  }

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const name = String(form.get('name') ?? '').trim();
  const role = String(form.get('role') ?? 'RH_ADMIN') as CompanyUserRole;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || name.length > 150) return new Response('Nome ou e-mail inválidos', { status: 400 });
  if (!roles.has(role)) return new Response('Perfil inválido', { status: 400 });

  const target = await db.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, active: true },
  });
  const access = await db.companyAccess.upsert({
    where: { companyId_userId: { companyId: company.id, userId: target.id } },
    update: { role, active: true },
    create: { companyId: company.id, userId: target.id, role },
  });
  const inviteUrl = await createInvite(target.id, company.id, creator.id);
  await audit({ tenantId: tenant.id, companyId: company.id, userId: creator.id, action: 'UPSERT', entityType: 'CompanyAccess', entityId: access.id, after: { userId: target.id, email, role, active: true } });
  return NextResponse.redirect(publicAppUrl(`/companies/${company.id}/accesses?invite=${encodeURIComponent(inviteUrl)}`), 303);
}
