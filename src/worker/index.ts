import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { processJob } from './processors';
import { randomUUID } from 'node:crypto';
import { toPrismaJson } from '@/lib/prisma-json';
import { syncCampaignSchedules } from '@/domain/campaign-scheduler';
import { syncOverdueActions } from '@/domain/action-scheduler';
import { runScheduledRetention } from '@/domain/retention';
import { recordHeartbeat } from '@/lib/heartbeat';

const workerId = randomUUID();
let stopped = false;
let lastScheduleSync = 0;
let lastHeartbeat = 0;
let lastRetentionSync = 0;
process.on('SIGTERM', () => { stopped = true; });
process.on('SIGINT', () => { stopped = true; });

async function claim() {
  return db.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<any[]>`
      SELECT * FROM "Job"
      WHERE status = 'QUEUED' AND "runAt" <= NOW()
      ORDER BY "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    const job = jobs[0];
    if (!job) return null;
    return tx.job.update({
      where: { id: job.id },
      data: { status: 'RUNNING', lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } }
    });
  });
}

const sensitiveJobTypes = new Set(['BACKUP_COMPANY', 'BACKUP_PLATFORM', 'BACKUP_INTEGRITY']);
const scrubbedPayload = (type: string) => sensitiveJobTypes.has(type) ? { payload: toPrismaJson({ redacted: true, type }) } : {};

async function sleep(ms: number) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function loop() {
  while (!stopped) {
    try {
      if (Date.now() - lastHeartbeat >= 30_000) {
        await recordHeartbeat('worker', workerId, { pid: process.pid });
        lastHeartbeat = Date.now();
      }
      if (Date.now() - lastScheduleSync >= 60_000) {
        await syncCampaignSchedules();
        await syncOverdueActions();
        lastScheduleSync = Date.now();
      }
      if (Date.now() - lastRetentionSync >= 60 * 60_000) {
        await runScheduledRetention();
        lastRetentionSync = Date.now();
      }
      const job = await claim();
      if (!job) { await sleep(env.WORKER_POLL_MS); continue; }
      try {
        const result = await processJob({ type: job.type, payload: job.payload, tenantId: job.tenantId });
        await db.job.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', result: toPrismaJson(result), ...scrubbedPayload(job.type), lockedAt: null, lockedBy: null } });
      } catch (error) {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        await db.job.update({
          where: { id: job.id },
          data: {
            status: job.attempts >= job.maxAttempts ? 'FAILED' : 'QUEUED', error: message,
            ...(job.attempts >= job.maxAttempts ? scrubbedPayload(job.type) : {}),
            lockedAt: null, lockedBy: null, runAt: new Date(Date.now() + Math.min(60000, job.attempts * 5000))
          }
        });
      }
    } catch (error) {
      console.error('Worker aguardando banco/esquema:', error instanceof Error ? error.message : error);
      await sleep(5000);
    }
  }
}

loop().finally(() => db.$disconnect());
