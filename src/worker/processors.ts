import { generateDocumentFiles } from '@/domain/reports/generate';
import { exportCompanyBackup } from '@/domain/backup/export-company';
import { exportPlatformBackup } from '@/domain/backup/export-platform';
import { saveFile } from '@/lib/files';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { inspectBackup } from '@/domain/backup/import-company';
import { runRetentionForTenant } from '@/domain/retention';
import { toPrismaJson } from '@/lib/prisma-json';
import { sha256 } from '@/lib/crypto';

export async function processJob(job: { type: string; payload: any; tenantId: string }) {
  switch (job.type) {
    case 'DOCUMENT_GENERATE':
      return generateDocumentFiles(job.payload.documentId, job.payload.version, job.payload.userId, { official: Boolean(job.payload.official), releaseAfterGenerate: Boolean(job.payload.releaseAfterGenerate), justification: job.payload.justification });
    case 'BACKUP_COMPANY': {
      const data = await exportCompanyBackup(job.payload.companyId, job.payload.password);
      const company = await db.company.findUniqueOrThrow({ where: { id: job.payload.companyId } });
      const file = await saveFile({ tenantId: job.tenantId, companyId: company.id, originalName: `backup-${company.legalName}-${new Date().toISOString().slice(0, 10)}.${job.payload.password ? 'sstbackup' : 'zip'}`, mimeType: 'application/octet-stream', data, createdById: job.payload.userId });
      await db.backupExport.update({ where: { id: job.payload.backupId }, data: { status: 'SUCCEEDED', fileObjectId: file.id, completedAt: new Date(), manifest: { companyId: company.id, companyName: company.legalName } } });
      return { fileId: file.id };
    }
    case 'BACKUP_PLATFORM': {
      const data = await exportPlatformBackup(job.tenantId, job.payload.password);
      const tenant = await db.tenant.findUniqueOrThrow({ where: { id: job.tenantId } });
      const file = await saveFile({ tenantId: job.tenantId, originalName: `backup-plataforma-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.${job.payload.password ? 'sstbackup' : 'zip'}`, mimeType: 'application/octet-stream', data, createdById: job.payload.userId });
      await db.backupExport.update({ where: { id: job.payload.backupId }, data: { status: 'SUCCEEDED', fileObjectId: file.id, completedAt: new Date(), manifest: { tenant: tenant.slug } } });
      return { fileId: file.id };
    }
    case 'BACKUP_INTEGRITY': {
      const test = await db.recoveryTest.update({ where: { id: job.payload.testId }, data: { status: 'RUNNING', startedAt: new Date(), error: null } });
      const backup = await db.backupExport.findFirst({
        where: { id: test.backupExportId, tenantId: job.tenantId },
      });
      if (!backup?.fileObjectId) throw new Error('Backup concluído e arquivo são obrigatórios para o teste de integridade');
      const file = await db.fileObject.findFirst({ where: { id: backup.fileObjectId, tenantId: job.tenantId } });
      if (!file) throw new Error('Arquivo do backup não encontrado');
      try {
        const data = await storage.get(file.storageKey);
        const inspected = await inspectBackup(data, job.payload.password);
        const checks = {
          format: inspected.manifest.format,
          version: inspected.manifest.version,
          type: inspected.manifest.type,
          invalidFiles: inspected.invalid,
          valid: inspected.valid,
          fileSha256Matches: file.sha256 === sha256(data),
          testedAt: new Date().toISOString(),
        };
        await db.recoveryTest.update({
          where: { id: test.id },
          data: { status: inspected.valid && checks.fileSha256Matches ? 'PASSED' : 'FAILED', checks: toPrismaJson(checks), completedAt: new Date(), error: inspected.valid ? null : `Arquivos inválidos: ${inspected.invalid.join(', ')}` },
        });
        return checks;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await db.recoveryTest.update({ where: { id: test.id }, data: { status: 'FAILED', error: message, completedAt: new Date() } });
        throw error;
      }
    }
    case 'RETENTION_RUN':
      return runRetentionForTenant(job.tenantId, job.payload.userId);
    default:
      throw new Error(`Tipo de job não suportado: ${job.type}`);
  }
}
