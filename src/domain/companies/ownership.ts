import { db } from '@/lib/db';

export type StructureEntity = 'establishment' | 'sector' | 'ghe' | 'function' | 'workstation';

export async function findStructureEntity(companyId: string, entityType: StructureEntity, entityId: string) {
  if (entityType === 'establishment') {
    return db.establishment.findFirst({ where: { id: entityId, companyId } });
  }
  if (entityType === 'sector') {
    return db.sector.findFirst({ where: { id: entityId, establishment: { companyId } } });
  }
  if (entityType === 'ghe') {
    return db.gHE.findFirst({ where: { id: entityId, sector: { establishment: { companyId } } } });
  }
  if (entityType === 'function') {
    return db.jobFunction.findFirst({ where: { id: entityId, ghe: { sector: { establishment: { companyId } } } } });
  }
  return db.workstation.findFirst({ where: { id: entityId, ghe: { sector: { establishment: { companyId } } } } });
}

export async function ensureEstablishment(companyId: string, establishmentId: string) {
  return db.establishment.findFirst({ where: { id: establishmentId, companyId, active: true } });
}

export async function ensureSector(companyId: string, sectorId: string) {
  return db.sector.findFirst({ where: { id: sectorId, active: true, establishment: { companyId, active: true } } });
}

export async function ensureGhe(companyId: string, gheId: string) {
  return db.gHE.findFirst({ where: { id: gheId, active: true, sector: { active: true, establishment: { companyId, active: true } } } });
}
