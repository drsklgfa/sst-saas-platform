import type { NotificationType } from '@prisma/client';
import { db } from './db';
import { hasTenantPermission, type Permission } from './rbac';
import { toPrismaJson } from './prisma-json';

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
  companyId?: string | null;
  metadata?: unknown;
};

export async function notifyUsers(userIds: Array<string | null | undefined>, input: NotificationInput) {
  const unique = [...new Set(userIds.filter((value): value is string => Boolean(value)))];
  if (!unique.length) return;
  await db.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: input.type,
      title: input.title.slice(0, 240),
      body: input.body?.slice(0, 1000) ?? null,
      href: input.href ?? null,
      companyId: input.companyId ?? null,
      metadata: toPrismaJson(input.metadata ?? {}),
    })),
  });
}

export async function notifyTenantPermission(
  tenantId: string,
  permission: Permission,
  input: NotificationInput,
  excludeUserIds: string[] = [],
) {
  const memberships = await db.membership.findMany({
    where: { tenantId, active: true, user: { active: true } },
    select: { userId: true, role: true, permissions: true },
  });
  const excluded = new Set(excludeUserIds);
  const targets = memberships
    .filter((membership) => !excluded.has(membership.userId) && hasTenantPermission(membership.role, permission, membership.permissions))
    .map((membership) => membership.userId);
  await notifyUsers(targets, input);
}

export async function conversationHrefForUser(userId: string, conversationId: string, tenantId: string, companyId: string | null) {
  const [membership, companyAccess] = await Promise.all([
    db.membership.findFirst({ where: { userId, tenantId, active: true }, select: { id: true } }),
    companyId ? db.companyAccess.findFirst({ where: { userId, companyId, active: true }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (membership) return `/messages/${conversationId}`;
  if (companyAccess) return `/portal/messages/${conversationId}`;
  return null;
}
