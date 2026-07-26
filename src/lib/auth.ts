import argon2 from 'argon2';
import type { CompanyAccess, CompanyUserRole, Membership, MembershipRole, Tenant, User } from '@prisma/client';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { env } from './env';
import { randomToken, sha256 } from './crypto';
import { hasCompanyPermission, hasTenantPermission, type CompanyPermission, type Permission } from './rbac';

const COOKIE = 'sst_session';

type LoadedMembership = Membership & { tenant: Tenant };
type LoadedCompanyAccess = CompanyAccess & { company: { id: string; tenantId: string; legalName: string; tradeName: string | null; status: string } };
export type CurrentUser = User & { memberships: LoadedMembership[]; companyAccesses: LoadedCompanyAccess[] };
export type TenantContext = { user: CurrentUser; membership: LoadedMembership; tenant: Tenant };
export type CompanyContext = { user: CurrentUser; access: LoadedCompanyAccess; company: LoadedCompanyAccess['company'] };

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(48);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    const sessions = await tx.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true }, skip: 9 });
    if (sessions.length) await tx.session.deleteMany({ where: { id: { in: sessions.map((session) => session.id) } } });
    await tx.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: requestHeaders.get('user-agent')?.slice(0, 500),
        ipHash: sha256(forwardedFor),
      },
    });
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          memberships: { where: { active: true }, include: { tenant: true }, orderBy: { createdAt: 'asc' } },
          companyAccesses: { where: { active: true, company: { status: 'ACTIVE' } }, include: { company: true }, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return session.user as CurrentUser;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireTenant(): Promise<TenantContext> {
  const user = await requireUser();
  const membership = user.memberships[0];
  if (!membership) redirect('/portal');
  return { user, membership, tenant: membership.tenant };
}

export async function requireTenantPermission(permission: Permission): Promise<TenantContext> {
  const context = await requireTenant();
  if (!hasTenantPermission(context.membership.role, permission, context.membership.permissions)) {
    redirect('/dashboard?forbidden=1');
  }
  return context;
}

export async function authorizeTenantApi(permission: Permission): Promise<TenantContext | Response> {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const membership = user.memberships[0];
  if (!membership) return new Response('Acesso interno necessário', { status: 403 });
  if (!hasTenantPermission(membership.role, permission, membership.permissions)) return new Response('Acesso negado', { status: 403 });
  return { user, membership, tenant: membership.tenant };
}

export async function requireCompanyPermission(companyId: string, permission: CompanyPermission): Promise<CompanyContext> {
  const user = await requireUser();
  const access = user.companyAccesses.find((candidate) => candidate.companyId === companyId);
  if (!access || !hasCompanyPermission(access.role, permission, access.permissions)) redirect('/portal?forbidden=1');
  return { user, access, company: access.company };
}

export async function authorizeCompanyApi(companyId: string, permission: CompanyPermission): Promise<CompanyContext | Response> {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const access = user.companyAccesses.find((candidate) => candidate.companyId === companyId);
  if (!access || !hasCompanyPermission(access.role, permission, access.permissions)) return new Response('Acesso negado', { status: 403 });
  return { user, access, company: access.company };
}

export function landingPageFor(user: CurrentUser): '/dashboard' | '/portal' {
  return user.memberships.length ? '/dashboard' : '/portal';
}

export type { CompanyUserRole, MembershipRole };
