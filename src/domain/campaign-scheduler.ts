import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';

export async function syncCampaignSchedules(now = new Date()): Promise<{ opened: number; closed: number }> {
  const toOpen = await db.campaign.findMany({ where: { status: 'SCHEDULED', startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, include: { company: { select: { tenantId: true } } } });
  const toClose = await db.campaign.findMany({ where: { status: { in: ['ACTIVE', 'REOPENED', 'SCHEDULED'] }, endsAt: { lte: now } }, include: { company: { select: { tenantId: true } } } });
  let opened = 0;
  let closed = 0;
  if (toOpen.length || toClose.length) {
    await db.$transaction(async (tx) => {
      for (const campaign of toOpen) {
        const changed = await tx.campaign.updateMany({ where: { id: campaign.id, status: 'SCHEDULED' }, data: { status: 'ACTIVE' } });
        if (!changed.count) continue;
        opened += 1;
        await tx.auditLog.create({ data: { tenantId: campaign.company.tenantId, companyId: campaign.companyId, action: 'AUTO_OPEN', entityType: 'Campaign', entityId: campaign.id, before: toPrismaJson({ status: campaign.status }), after: toPrismaJson({ status: 'ACTIVE', at: now.toISOString() }), metadata: toPrismaJson({ source: 'worker-scheduler' }) } });
      }
      for (const campaign of toClose) {
        const changed = await tx.campaign.updateMany({ where: { id: campaign.id, status: { in: ['ACTIVE', 'REOPENED', 'SCHEDULED'] } }, data: { status: 'CLOSED' } });
        if (!changed.count) continue;
        closed += 1;
        await tx.auditLog.create({ data: { tenantId: campaign.company.tenantId, companyId: campaign.companyId, action: 'AUTO_CLOSE', entityType: 'Campaign', entityId: campaign.id, before: toPrismaJson({ status: campaign.status }), after: toPrismaJson({ status: 'CLOSED', at: now.toISOString() }), metadata: toPrismaJson({ source: 'worker-scheduler' }) } });
      }
    });
  }
  return { opened, closed };
}
