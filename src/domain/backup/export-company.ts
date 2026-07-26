import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { safeJson } from '@/lib/utils';
import { sha256 } from '@/lib/crypto';
import { encryptBackup } from './crypto';

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function exportCompanyBackup(companyId: string, password?: string) {
  const company = await db.company.findUniqueOrThrow({
    where: { id: companyId },
    include: {
      contacts: true,
      services: true,
      accesses: { include: { user: { select: { name: true, email: true, active: true } } } },
      establishments: { include: { sectors: { include: { ghes: { include: { functions: true, workstations: true } } } } } },
      campaigns: { include: { targets: true, questionnaires: true, codes: true, responseSessions: { include: { answers: true, bodyPains: true } } } },
      inspections: { include: { items: true, calculations: true, evidences: true } },
      risks: true,
      actionPlans: { include: { items: { include: { evidences: true } } } },
      documents: { include: { documentType: true, templateVersion: true, versions: { include: { sections: true, snapshot: true, auditRuns: true } }, files: true, signatures: true } },
      conversations: { include: { messages: { include: { user: { select: { name: true, email: true } }, attachments: true } }, participants: { include: { user: { select: { name: true, email: true } } } } } },
      comments: { include: { user: { select: { name: true, email: true } }, attachments: true } },
      files: true
    }
  });
  const catalog = await db.tenant.findUniqueOrThrow({
    where: { id: company.tenantId },
    select: {
      name: true,
      slug: true,
      settings: true,
      questionnaires: { include: { versions: { include: { questions: { include: { options: true } } } } } },
      methodologies: true,
      documentTypes: true,
      documentTemplates: { include: { versions: true, documentType: true } }
    }
  });

  const pass = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(pass);
  const checksums: string[] = [];
  const addBuffer = (name: string, data: Buffer) => {
    archive.append(data, { name });
    checksums.push(`${sha256(data)}  ${name}`);
  };
  const addJson = (name: string, value: unknown) => addBuffer(name, Buffer.from(JSON.stringify(safeJson(value), null, 2)));

  const manifest = {
    format: 'SST_PORTABLE_BACKUP',
    version: 8,
    exportedAt: new Date().toISOString(),
    type: 'COMPANY_FULL',
    companyId: company.id,
    companyName: company.legalName,
    recordCounts: {
      establishments: company.establishments.length,
      campaigns: company.campaigns.length,
      responses: company.campaigns.reduce((sum, campaign) => sum + campaign.responseSessions.length, 0),
      inspections: company.inspections.length,
      inspectionEvidences: company.inspections.reduce((sum, inspection) => sum + inspection.evidences.length, 0),
      risks: company.risks.length,
      documents: company.documents.length,
      files: company.files.length,
      services: company.services.length,
      conversations: company.conversations.length,
      messages: company.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0),
      comments: company.comments.length
    }
  };
  addJson('manifest.json', manifest);
  addJson('data/catalog.json', catalog);
  const portableCompany = {
    ...company,
    campaigns: company.campaigns.map((campaign) => ({
      ...campaign,
      anonymousCodeSummary: { total: campaign.codes.length, used: campaign.codes.filter((code) => code.usedAt).length },
      codes: [],
    })),
  };
  addJson('data/company.json', portableCompany);
  addBuffer('instructions.html', Buffer.from('<!doctype html><meta charset="utf-8"><title>Backup Plataforma SST</title><h1>Backup portátil da Plataforma SST</h1><p>Restaure este arquivo somente pelo módulo Backup e Portabilidade. Códigos anônimos de uso único não são exportados em texto nem reaproveitados; após restaurar, gere uma nova lista para campanhas que exigem códigos. Documentos preservam revisões, snapshots, auditorias, assinaturas e hashes de integridade. Conversas, mensagens, anexos e comentários também são preservados, mas notificações pessoais não são migradas.</p>')); 

  for (const file of company.files) {
    const data = await storage.get(file.storageKey);
    addBuffer(`files/${file.id}/content`, data);
  }
  addBuffer('checksums.sha256', Buffer.from(checksums.join('\n') + '\n'));
  await archive.finalize();
  const zip = await streamToBuffer(pass);
  return password ? encryptBackup(zip, password) : zip;
}
