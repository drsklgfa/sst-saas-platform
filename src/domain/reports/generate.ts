import { chromium } from 'playwright-core';
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { buildReportHtml } from './html';
import { escapeHtml, sanitizeReportHtml } from './sanitize';
import { saveFile } from '@/lib/files';
import { safeJson } from '@/lib/json';
import { toPrismaJson } from '@/lib/prisma-json';
import { auditDocumentSnapshot } from '@/domain/documents/audit';
import { hashSnapshot, verifySnapshotHash } from '@/domain/documents/integrity';
import { notifyUsers } from '@/lib/notifications';
import { hasCompanyPermission } from '@/lib/rbac';

interface SnapshotPayload {
  schemaVersion: number;
  capturedAt: string;
  document: Record<string, any>;
  tenant: Record<string, any>;
  company: Record<string, any>;
  templateVersion: unknown;
  sections: Array<{ code: string; title: string; position: number; enabled: boolean; content: Record<string, any> }>;
}

function table(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  if (!rows.length) return '<p>Nenhum registro disponível.</p>';
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? '—'))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function records(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function automaticSection(code: string, snapshot: SnapshotPayload) {
  const company = snapshot.company;
  if (code === 'IDENTIFICATION') {
    const units = records(company.establishments).map((establishment) => establishment.name).join(', ');
    return table(['Campo', 'Informação'], [
      ['Razão social', company.legalName], ['Nome fantasia', company.tradeName], ['CNPJ', company.cnpj],
      ['CNAE principal', company.primaryCnae], ['Grau de risco', company.riskGrade], ['Colaboradores', company.employeeCount], ['Estabelecimentos', units],
    ]);
  }
  if (['RISKS', 'INVENTORY', 'AGENTS'].includes(code)) {
    return table(
      ['Código', 'GHE', 'Categoria', 'Perigo/Fator', 'Fonte', 'Danos possíveis', 'Nível inicial', 'Nível residual'],
      records(company.risks).map((risk) => [risk.code, risk.ghe?.name, risk.category, risk.hazard, risk.source, risk.possibleHarm, risk.initialLevel, risk.residualLevel]),
    );
  }
  if (code === 'ACTION_PLAN') {
    return table(
      ['Código', 'Ação', 'Responsável', 'Prazo', 'Local', 'Método', 'Custo', 'Status', 'Eficácia'],
      records(company.actionPlans).flatMap((plan) => records(plan.items).map((item) => [
        item.code,
        item.action,
        item.responsible,
        item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : null,
        item.location,
        item.method,
        item.estimatedCost,
        item.status,
        item.effectivenessStatus,
      ])),
    );
  }
  if (code === 'PARTICIPATION') {
    return table(
      ['Campanha', 'Status', 'Esperadas', 'Recebidas', 'Adesão'],
      records(company.campaigns).map((campaign) => {
        const count = records(campaign.responseSessions).length;
        const percent = campaign.expectedResponses ? `${Math.round(count / campaign.expectedResponses * 100)}%` : '—';
        return [campaign.name, campaign.status, campaign.expectedResponses, count, percent];
      }),
    );
  }
  if (code === 'BODY_MAP') {
    const counts = new Map<string, { count: number; total: number }>();
    for (const campaign of records(company.campaigns)) {
      for (const response of records(campaign.responseSessions)) {
        for (const pain of records(response.bodyPains)) {
          const current = counts.get(pain.regionCode) ?? { count: 0, total: 0 };
          current.count += 1;
          current.total += Number(pain.intensity ?? 0);
          counts.set(pain.regionCode, current);
        }
      }
    }
    return table(
      ['Região', 'Menções', 'Intensidade média'],
      [...counts.entries()].sort((left, right) => right[1].count - left[1].count).map(([region, value]) => [region.replaceAll('_', ' '), value.count, (value.total / value.count).toFixed(1)]),
    );
  }
  if (['ERGONOMIC_TOOLS', 'MEASUREMENTS'].includes(code)) {
    return table(
      ['Vistoria', 'GHE', 'Método', 'Pontuação', 'Classificação', 'Versão'],
      records(company.inspections).flatMap((inspection) => records(inspection.calculations).map((calculation) => [
        inspection.title,
        inspection.ghe?.name,
        calculation.methodology?.name,
        calculation.score,
        calculation.classification,
        calculation.engineVersion,
      ])),
    );
  }
  return '';
}

async function loadSnapshotSource(documentId: string) {
  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      company: {
        include: {
          tenant: { select: { id: true, name: true, slug: true, settings: true } },
          contacts: { where: { active: true } },
          establishments: { include: { sectors: { include: { ghes: { include: { functions: true, workstations: true } } } } } },
          risks: { where: { status: 'ACTIVE' }, include: { ghe: true } },
          actionPlans: { where: { status: 'ACTIVE' }, include: { items: { include: { evidences: true } } } },
          campaigns: {
            include: {
              responseSessions: {
                where: { status: 'SUBMITTED', includedInConsolidation: true },
                include: { bodyPains: true, answers: true },
              },
            },
          },
          inspections: { include: { ghe: true, items: true, calculations: { include: { methodology: true } }, evidences: true } },
          services: true,
        },
      },
      documentType: true,
      templateVersion: true,
    },
  });
  const version = await db.documentVersion.findUniqueOrThrow({
    where: { documentId_version: { documentId, version: document.currentVersion } },
    include: { sections: { orderBy: { position: 'asc' } }, snapshot: true },
  });
  return { document, version };
}

export async function createDocumentSnapshot(documentId: string, userId?: string) {
  const { document, version } = await loadSnapshotSource(documentId);
  if (version.snapshot) {
    if (['ISSUED_SIGNED', 'ISSUED_UNSIGNED', 'REPLACED', 'CANCELLED', 'ARCHIVED'].includes(version.status)) {
      throw new Error('Esta revisão já foi encerrada. Crie uma nova revisão para gerar outro conteúdo.');
    }
    return version;
  }
  if (!['DRAFT', 'REVIEW'].includes(version.status)) {
    throw new Error('Esta revisão já está congelada. Crie uma nova revisão para alterar o conteúdo.');
  }

  const snapshotData = safeJson({
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    document: {
      id: document.id,
      title: document.title,
      type: document.documentType,
      referenceYear: document.referenceYear,
      verificationCode: document.verificationCode,
      version: version.version,
    },
    tenant: document.company.tenant,
    company: document.company,
    templateVersion: document.templateVersion,
    sections: version.sections.map((section) => ({
      code: section.code,
      title: section.title,
      position: section.position,
      enabled: section.enabled,
      content: section.content,
    })),
  }) as unknown as SnapshotPayload;
  const dataHash = hashSnapshot(snapshotData);
  const audit = auditDocumentSnapshot(snapshotData);
  const warnings = audit.checks.filter((item) => item.severity !== 'PASS').map((item) => `${item.title}: ${item.message}`);

  const snapshot = await db.documentSnapshot.create({ data: { data: toPrismaJson(snapshotData), dataHash } });
  const updated = await db.$transaction(async (transaction) => {
    const frozen = await transaction.documentVersion.update({
      where: { id: version.id },
      data: {
        status: 'PREVIEW',
        snapshotId: snapshot.id,
        warnings: toPrismaJson(warnings),
        lockedAt: new Date(),
      },
    });
    await transaction.documentAuditRun.create({
      data: {
        documentVersionId: version.id,
        status: audit.status,
        results: toPrismaJson(audit.checks),
        warningCount: audit.warningCount,
        errorCount: audit.errorCount,
        createdById: userId,
      },
    });
    await transaction.document.update({ where: { id: document.id }, data: { status: 'PREVIEW' } });
    return frozen;
  });
  return updated;
}

export async function generateDocumentFiles(
  documentId: string,
  versionNumber: number,
  userId?: string,
  options: { official?: boolean; releaseAfterGenerate?: boolean; justification?: string } = {},
) {
  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      company: { select: { id: true, tenantId: true } },
      versions: {
        where: { version: versionNumber },
        include: { snapshot: true, signatures: { where: { signedAt: { not: null } }, orderBy: { createdAt: 'asc' } } },
      },
    },
  });
  const version = document.versions[0];
  if (!version?.snapshot) throw new Error('A revisão precisa ser congelada antes da geração.');
  const snapshot = version.snapshot.data as unknown as SnapshotPayload;
  if (!verifySnapshotHash(snapshot, version.snapshot.dataHash)) throw new Error('Falha de integridade: o snapshot foi alterado.');

  const audit = auditDocumentSnapshot(snapshot, { signatureCount: version.signatures.length });
  await db.documentAuditRun.create({
    data: {
      documentVersionId: version.id,
      status: audit.status,
      results: toPrismaJson(audit.checks),
      warningCount: audit.warningCount,
      errorCount: audit.errorCount,
      createdById: userId,
    },
  });

  const sections = records(snapshot.sections)
    .filter((section) => section.enabled !== false)
    .sort((left, right) => Number(left.position ?? 0) - Number(right.position ?? 0))
    .map((section) => ({
      title: String(section.title ?? 'Seção'),
      html: `${sanitizeReportHtml(String(section.content?.html ?? ''))}${automaticSection(String(section.code ?? ''), snapshot)}`,
    }));
  const warningMessages = audit.checks.filter((item) => item.severity !== 'PASS').map((item) => `${item.title}: ${item.message}`);
  const verificationUrl = `${env.APP_URL.replace(/\/$/, '')}/verify/${snapshot.document.verificationCode}`;
  const official = Boolean(options.official);
  const html = buildReportHtml({
    title: String(snapshot.document.title),
    company: String(snapshot.company.legalName),
    cnpj: snapshot.company.cnpj,
    tenantName: snapshot.tenant.name,
    version: versionNumber,
    sections,
    warnings: warningMessages,
    signatures: version.signatures,
    snapshotHash: version.snapshot.dataHash,
    verificationUrl,
    official,
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = Buffer.from(await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
    }));

    const plainSections = sections.flatMap((section) => [
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
      new Paragraph(section.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
    ]);
    const docx = new DocxDocument({
      sections: [{
        children: [
          new Paragraph({ text: String(snapshot.document.title), heading: HeadingLevel.TITLE }),
          new Paragraph(String(snapshot.company.legalName)),
          new Paragraph(`Revisão ${versionNumber} · Cópia editável, sem valor de documento oficial`),
          ...plainSections,
        ],
      }],
    });
    const docxBuffer = Buffer.from(await Packer.toBuffer(docx));

    const workbook = new ExcelJS.Workbook();
    const actionSheet = workbook.addWorksheet('Plano de Ação');
    actionSheet.columns = [
      { header: 'Código', key: 'code', width: 15 }, { header: 'Ação', key: 'action', width: 55 },
      { header: 'Responsável', key: 'responsible', width: 25 }, { header: 'Prazo', key: 'due', width: 15 },
      { header: 'Status', key: 'status', width: 22 }, { header: 'Eficácia', key: 'effectiveness', width: 22 },
    ];
    for (const plan of records(snapshot.company.actionPlans)) {
      for (const item of records(plan.items)) {
        actionSheet.addRow({
          code: item.code,
          action: item.action,
          responsible: item.responsible,
          due: item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : '',
          status: item.status,
          effectiveness: item.effectivenessStatus,
        });
      }
    }
    const riskSheet = workbook.addWorksheet('Inventário de Riscos');
    riskSheet.columns = [
      { header: 'Código', key: 'code', width: 15 }, { header: 'GHE', key: 'ghe', width: 25 },
      { header: 'Categoria', key: 'category', width: 20 }, { header: 'Perigo/Fator', key: 'hazard', width: 40 },
      { header: 'Nível inicial', key: 'initial', width: 18 }, { header: 'Nível residual', key: 'residual', width: 18 },
    ];
    for (const risk of records(snapshot.company.risks)) {
      riskSheet.addRow({ code: risk.code, ghe: risk.ghe?.name, category: risk.category, hazard: risk.hazard, initial: risk.initialLevel, residual: risk.residualLevel });
    }
    const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());

    const signatureCount = version.signatures.length;
    const commonMetadata = {
      documentId,
      documentVersionId: version.id,
      versionNumber,
      snapshotHash: version.snapshot.dataHash,
      signatureCount,
      official,
      generatedAt: new Date().toISOString(),
    };
    const baseName = String(snapshot.document.title).replace(/[\\/:*?"<>|]/g, '-');
    const artifacts = [
      {
        format: official ? 'PDF' : 'PDF_PREVIEW',
        name: `${baseName}-r${versionNumber}${official ? '-oficial' : '-previa'}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
        isOfficial: official,
      },
      {
        format: 'DOCX_EDITABLE',
        name: `${baseName}-r${versionNumber}-editavel.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        data: docxBuffer,
        isOfficial: false,
      },
      {
        format: 'XLSX_DATA',
        name: `${baseName}-r${versionNumber}-dados.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: xlsx,
        isOfficial: false,
      },
    ];

    const savedFiles: Array<{ file: Awaited<ReturnType<typeof saveFile>>; documentFileId: string; format: string }> = [];
    for (const artifact of artifacts) {
      // O artefato fica privado e não oficial até a transação final de liberação.
      // Assim, a última revisão liberada permanece disponível caso a geração falhe.
      const file = await saveFile({
        tenantId: document.company.tenantId,
        companyId: document.company.id,
        originalName: artifact.name,
        mimeType: artifact.mimeType,
        data: artifact.data,
        createdById: userId,
        visibility: 'PRIVATE',
        metadata: { ...commonMetadata, artifactType: artifact.format },
      });
      const documentFile = await db.documentFile.create({
        data: {
          documentId,
          documentVersionId: version.id,
          versionNumber,
          fileObjectId: file.id,
          format: artifact.format,
          official: false,
          snapshotHash: version.snapshot.dataHash,
          signatureCount,
          metadata: toPrismaJson(commonMetadata),
        },
      });
      savedFiles.push({ file, documentFileId: documentFile.id, format: artifact.format });
    }

    const now = new Date();
    if (official && options.releaseAfterGenerate) {
      const officialPdf = savedFiles.find((artifact) => artifact.format === 'PDF');
      if (!officialPdf) throw new Error('O PDF oficial não foi produzido.');
      const status = signatureCount > 0 ? 'ISSUED_SIGNED' : 'ISSUED_UNSIGNED';
      await db.$transaction(async (transaction) => {
        const current = await transaction.document.findUnique({
          where: { id: documentId },
          select: { currentVersion: true, status: true },
        });
        if (!current || current.currentVersion !== versionNumber || current.status !== 'WAITING_DOCUMENTS') {
          throw new Error('A revisão atual mudou durante a geração. O arquivo não foi liberado.');
        }
        await transaction.documentFile.updateMany({
          where: { documentId, official: true },
          data: { official: false },
        });
        await transaction.documentFile.update({
          where: { id: officialPdf.documentFileId },
          data: { official: true },
        });
        await transaction.fileObject.update({
          where: { id: officialPdf.file.id },
          data: { visibility: 'COMPANY' },
        });
        await transaction.document.update({
          where: { id: documentId },
          data: { status, releasedToCompany: true, releasedVersion: versionNumber, releasedAt: now },
        });
        await transaction.documentVersion.update({
          where: { id: version.id },
          data: { status, generatedAt: now, issuedAt: now, releasedAt: now, justification: options.justification || version.justification },
        });
      });
      const accesses = await db.companyAccess.findMany({ where: { companyId: document.company.id, active: true, user: { active: true } }, select: { userId: true, role: true, permissions: true } });
      await notifyUsers(accesses.filter((access) => hasCompanyPermission(access.role, 'document.read', access.permissions)).map((access) => access.userId), { type: 'REPORT', title: `Documento liberado: ${document.title}`, body: `Revisão ${versionNumber}`, href: `/portal/company/${document.company.id}`, companyId: document.company.id, metadata: { documentId, version: versionNumber } });
    } else {
      await db.documentVersion.update({ where: { id: version.id }, data: { generatedAt: now } });
    }
    return savedFiles.map((artifact) => artifact.file);
  } finally {
    await browser.close();
  }
}
