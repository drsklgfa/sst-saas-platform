import { db } from './db';
import { toPrismaJson } from './prisma-json';

export async function enqueueJob(tenantId: string, type: string, payload: unknown) {
  return db.job.create({
    data: {
      tenantId,
      type,
      payload: toPrismaJson(payload),
    },
  });
}
