import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { db } from '@/lib/db';
import { safeJson } from '@/lib/utils';
import { sha256 } from '@/lib/crypto';
import { encryptBackup } from './crypto';
import { exportCompanyBackup } from './export-company';

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function exportPlatformBackup(tenantId: string, password?: string) {
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: {
      id: true, name: true, slug: true, settings: true, createdAt: true,
      memberships: { include: { user: { select: { name: true, email: true, active: true } } } },
      companies: { select: { id: true, legalName: true, status: true } },
      securityPolicy: true,
      securityIncidents: { include: { owner: { select: { name: true, email: true } } } },
      integrations: { select: { provider: true, enabled: true, settings: true, createdAt: true, updatedAt: true } },
      auditLogs: { orderBy: { createdAt: 'asc' } }
    }
  });
  const pass = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(pass);
  const checksums: string[] = [];
  const add = (name: string, data: Buffer) => { archive.append(data, { name }); checksums.push(`${sha256(data)}  ${name}`); };
  const manifest = {
    format: 'SST_PORTABLE_BACKUP', version: 8, type: 'PLATFORM_FULL', exportedAt: new Date().toISOString(),
    tenantName: tenant.name, tenantSlug: tenant.slug, companies: tenant.companies.length
  };
  add('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
  add('data/tenant.json', Buffer.from(JSON.stringify(safeJson(tenant), null, 2)));
  for (const company of tenant.companies) {
    const companyBackup = await exportCompanyBackup(company.id);
    add(`companies/${company.id}.zip`, companyBackup);
  }
  add('checksums.sha256', Buffer.from(checksums.join('\n') + '\n'));
  await archive.finalize();
  const zip = await streamToBuffer(pass);
  return password ? encryptBackup(zip, password) : zip;
}
