import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { heartbeatIsFresh, latestServiceHeartbeat } from '@/lib/heartbeat';

export async function getTenantSystemStatus(tenantId: string) {
  const now = new Date();
  const [worker, latestBackup, failedJobs, queuedJobs, runningJobs, incidents, expiredSessions, fileSample] = await Promise.all([
    latestServiceHeartbeat('worker'),
    db.backupExport.findFirst({ where: { tenantId, status: 'SUCCEEDED' }, orderBy: { completedAt: 'desc' } }),
    db.job.count({ where: { tenantId, status: 'FAILED' } }),
    db.job.count({ where: { tenantId, status: 'QUEUED' } }),
    db.job.count({ where: { tenantId, status: 'RUNNING' } }),
    db.securityIncident.count({ where: { tenantId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    db.session.count({ where: { expiresAt: { lt: now }, user: { memberships: { some: { tenantId } } } } }),
    db.fileObject.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { storageKey: true } }),
  ]);

  let storageStatus: 'OK' | 'EMPTY' | 'ERROR' = fileSample ? 'OK' : 'EMPTY';
  if (fileSample) {
    try {
      storageStatus = (await storage.exists(fileSample.storageKey)) ? 'OK' : 'ERROR';
    } catch {
      storageStatus = 'ERROR';
    }
  }

  return {
    database: 'OK' as const,
    worker: worker
      ? { status: heartbeatIsFresh(worker.lastSeenAt) ? 'OK' as const : 'STALE' as const, lastSeenAt: worker.lastSeenAt, instanceId: worker.instanceId }
      : { status: 'UNKNOWN' as const, lastSeenAt: null, instanceId: null },
    storage: storageStatus,
    jobs: { failed: failedJobs, queued: queuedJobs, running: runningJobs },
    incidentsOpen: incidents,
    expiredSessions,
    latestBackup,
  };
}
