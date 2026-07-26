import { db } from './db';
import { toPrismaJson } from './prisma-json';

export async function recordHeartbeat(service: string, instanceId: string, metadata: unknown = {}) {
  return db.serviceHeartbeat.upsert({
    where: { service_instanceId: { service, instanceId } },
    update: { status: 'HEALTHY', lastSeenAt: new Date(), metadata: toPrismaJson(metadata) },
    create: { service, instanceId, status: 'HEALTHY', metadata: toPrismaJson(metadata) },
  });
}

export async function latestServiceHeartbeat(service: string) {
  return db.serviceHeartbeat.findFirst({ where: { service }, orderBy: { lastSeenAt: 'desc' } });
}

export function heartbeatIsFresh(lastSeenAt: Date | null | undefined, maxAgeMs = 120_000) {
  return Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() <= maxAgeMs);
}
