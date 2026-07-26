import { randomUUID } from 'node:crypto';
import { db } from './db';
import { storage } from './storage';
import { slugify } from './utils';
import { sha256 } from './crypto';
import { toPrismaJson } from './prisma-json';

export async function saveFile(input: {
  tenantId: string;
  companyId?: string;
  originalName: string;
  mimeType: string;
  data: Buffer;
  createdById?: string;
  visibility?: 'PRIVATE' | 'COMPANY' | 'PUBLIC_VERIFICATION';
  metadata?: unknown;
}) {
  const key = `tenants/${input.tenantId}/${input.companyId ? `companies/${input.companyId}/` : ''}${new Date().getUTCFullYear()}/${randomUUID()}-${slugify(input.originalName) || 'file'}`;
  await storage.put(key, input.data, input.mimeType);
  return db.fileObject.create({
    data: {
      tenantId: input.tenantId,
      companyId: input.companyId,
      storageKey: key,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.data.length),
      sha256: sha256(input.data),
      createdById: input.createdById,
      visibility: input.visibility ?? 'PRIVATE',
      metadata: toPrismaJson(input.metadata ?? {}),
    },
  });
}
