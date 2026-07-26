import { db } from './db';
import { toPrismaJson, toPrismaNullableJson } from './prisma-json';

export interface AuditInput {
  tenantId: string;
  userId?: string;
  companyId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

export async function audit(input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      companyId: input.companyId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: toPrismaNullableJson(input.before),
      after: toPrismaNullableJson(input.after),
      metadata: toPrismaJson(input.metadata ?? {}),
    },
  });
}
