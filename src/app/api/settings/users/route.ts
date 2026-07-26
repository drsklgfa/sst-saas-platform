import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import { env } from '@/lib/env';
import { audit } from '@/lib/audit';
import { NextResponse } from 'next/server';
import type { MembershipRole } from '@prisma/client';

const roles = new Set<MembershipRole>(['OWNER', 'ADMIN', 'RESPONSIBLE_TECH', 'CONSULTANT', 'ASSISTANT', 'REVIEWER', 'COMMERCIAL', 'FINANCE', 'READER']);

async function createInvite(userId: string, createdById: string): Promise<string> {
  const raw = randomToken(40);
  await db.$transaction([
    db.userInvite.deleteMany({ where: { userId, companyId: null, usedAt: null } }),
    db.userInvite.create({ data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 72 * 3_600_000), createdById } }),
  ]);
  return `${env.APP_URL}/activate/${raw}`;
}

export async function POST(request: Request) {
  const authorization = await authorizeTenantApi('settings.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user: creator, membership: creatorMembership } = authorization;
  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'create');

  if (operation !== 'create') {
    const membershipId = String(form.get('membershipId') ?? '');
    const membership = await db.membership.findFirst({ where: { id: membershipId, tenantId: tenant.id }, include: { user: true } });
    if (!membership) return new Response('Usuário interno não encontrado', { status: 404 });
    if (membership.userId === creator.id && operation === 'suspend') return new Response('Você não pode suspender sua própria conta', { status: 409 });
    if (membership.role === 'OWNER' && operation === 'suspend') {
      const activeOwners = await db.membership.count({ where: { tenantId: tenant.id, role: 'OWNER', active: true } });
      if (activeOwners <= 1) return new Response('A consultoria precisa manter ao menos um proprietário ativo', { status: 409 });
    }

    if (operation === 'suspend') {
      await db.$transaction([
        db.membership.update({ where: { id: membership.id }, data: { active: false } }),
        db.session.deleteMany({ where: { userId: membership.userId } }),
        db.userInvite.deleteMany({ where: { userId: membership.userId, companyId: null, usedAt: null } }),
      ]);
      await audit({ tenantId: tenant.id, userId: creator.id, action: 'SUSPEND', entityType: 'Membership', entityId: membership.id, before: membership, after: { active: false } });
      return NextResponse.redirect(publicAppUrl('/settings/users'), 303);
    }

    if (operation === 'reactivate' || operation === 'reinvite') {
      await db.membership.update({ where: { id: membership.id }, data: { active: true } });
      const inviteUrl = await createInvite(membership.userId, creator.id);
      await audit({ tenantId: tenant.id, userId: creator.id, action: operation.toUpperCase(), entityType: 'Membership', entityId: membership.id, before: membership, after: { active: true } });
      return NextResponse.redirect(publicAppUrl(`/settings/users?invite=${encodeURIComponent(inviteUrl)}`), 303);
    }
    return new Response('Operação inválida', { status: 400 });
  }

  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = String(form.get('role') ?? 'CONSULTANT') as MembershipRole;
  if (!name || name.length > 150 || !/^\S+@\S+\.\S+$/.test(email)) return new Response('Nome ou e-mail inválidos', { status: 400 });
  if (!roles.has(role)) return new Response('Perfil inválido', { status: 400 });
  if (role === 'OWNER' && creatorMembership.role !== 'OWNER') return new Response('Somente um proprietário pode criar outro proprietário', { status: 403 });

  const target = await db.user.upsert({ where: { email }, update: { name }, create: { email, name, active: true } });
  const membership = await db.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: target.id } },
    update: { role, active: true },
    create: { tenantId: tenant.id, userId: target.id, role },
  });
  const inviteUrl = await createInvite(target.id, creator.id);
  await audit({ tenantId: tenant.id, userId: creator.id, action: 'UPSERT', entityType: 'Membership', entityId: membership.id, after: { userId: target.id, email, role, active: true } });
  return NextResponse.redirect(publicAppUrl(`/settings/users?invite=${encodeURIComponent(inviteUrl)}`), 303);
}
