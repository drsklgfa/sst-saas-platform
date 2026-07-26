import { db } from '@/lib/db';

export async function syncOverdueActions(now = new Date()): Promise<number> {
  const due = await db.actionItem.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'WAITING_EVIDENCE', 'WAITING_VALIDATION', 'PARTIAL', 'REJECTED'] },
    },
    include: { actionPlan: { include: { company: true } } },
    take: 500,
  });
  for (const item of due) {
    await db.$transaction(async (tx) => {
      await tx.actionItem.update({ where: { id: item.id }, data: { status: 'OVERDUE' } });
      await tx.auditLog.create({ data: {
        tenantId: item.actionPlan.company.tenantId,
        companyId: item.actionPlan.companyId,
        action: 'AUTO_OVERDUE', entityType: 'ActionItem', entityId: item.id,
        before: { status: item.status }, after: { status: 'OVERDUE', dueDate: item.dueDate?.toISOString() }, metadata: {},
      } });
    });
  }
  return due.length;
}
