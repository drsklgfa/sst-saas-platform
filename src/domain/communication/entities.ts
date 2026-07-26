import { db } from '@/lib/db';

export const commentEntityTypes = new Set(['ACTION', 'ACTION_EVIDENCE', 'DOCUMENT', 'RISK']);

export async function resolveCommentEntity(companyId: string, entityType: string, entityId: string) {
  if (!commentEntityTypes.has(entityType)) return null;
  if (entityType === 'ACTION') {
    const value = await db.actionItem.findFirst({ where: { id: entityId, actionPlan: { companyId } }, select: { id: true, code: true, action: true } });
    return value ? { label: `${value.code} — ${value.action}` } : null;
  }
  if (entityType === 'ACTION_EVIDENCE') {
    const value = await db.actionEvidence.findFirst({ where: { id: entityId, actionItem: { actionPlan: { companyId } } }, select: { id: true, description: true } });
    return value ? { label: value.description ?? 'Evidência do plano de ação' } : null;
  }
  if (entityType === 'DOCUMENT') {
    const value = await db.document.findFirst({ where: { id: entityId, companyId }, select: { id: true, title: true } });
    return value ? { label: value.title } : null;
  }
  const value = await db.risk.findFirst({ where: { id: entityId, companyId }, select: { id: true, code: true, hazard: true } });
  return value ? { label: `${value.code} — ${value.hazard}` } : null;
}
