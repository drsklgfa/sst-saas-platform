import unzipper from 'unzipper';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { saveFile } from '@/lib/files';
import { decryptBackup, isEncryptedBackup } from './crypto';
import { randomToken, sha256 } from '@/lib/crypto';

const asDate = (value: unknown) => value ? new Date(String(value)) : null;
const json = (value: unknown, fallback: Prisma.InputJsonValue = {}): Prisma.InputJsonValue =>
  (value ?? fallback) as Prisma.InputJsonValue;

async function readJson(directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>, path: string) {
  const entry = directory.files.find((file) => file.path === path);
  if (!entry) throw new Error(`${path} ausente`);
  return JSON.parse((await entry.buffer()).toString('utf8'));
}

export async function inspectBackup(input: Buffer, password?: string) {
  const zip = isEncryptedBackup(input) ? decryptBackup(input, password ?? '') : input;
  const directory = await unzipper.Open.buffer(zip);
  const manifest = await readJson(directory, 'manifest.json');
  if (manifest.format !== 'SST_PORTABLE_BACKUP') throw new Error('Backup incompatível');
  const checksumEntry = directory.files.find((file) => file.path === 'checksums.sha256');
  const expected = new Map<string, string>();
  if (checksumEntry) {
    for (const line of (await checksumEntry.buffer()).toString().trim().split('\n')) {
      const [hash, ...rest] = line.split(/\s+/);
      expected.set(rest.join(' '), hash);
    }
  }
  const invalid: string[] = [];
  for (const file of directory.files.filter((entry) => entry.type === 'File' && entry.path !== 'checksums.sha256')) {
    const checksum = expected.get(file.path);
    if (checksum && sha256(await file.buffer()) !== checksum) invalid.push(file.path);
  }
  return { zip, directory, manifest, invalid, valid: invalid.length === 0 };
}

async function importCatalog(tenantId: string, source: any) {
  const questionnaireVersionMap = new Map<string, string>();
  const questionMap = new Map<string, string>();
  const methodologyMap = new Map<string, string>();
  const documentTypeMap = new Map<string, string>();
  const templateVersionMap = new Map<string, string>();

  for (const methodology of source.methodologies ?? []) {
    const target = await db.methodology.upsert({
      where: { tenantId_code_version: { tenantId, code: methodology.code, version: methodology.version } },
      update: { name: methodology.name, category: methodology.category, description: methodology.description, config: json(methodology.config), active: methodology.active },
      create: { tenantId, code: methodology.code, name: methodology.name, version: methodology.version, category: methodology.category, description: methodology.description, config: json(methodology.config), active: methodology.active }
    });
    methodologyMap.set(methodology.id, target.id);
  }

  for (const type of source.documentTypes ?? []) {
    const target = await db.documentType.upsert({
      where: { tenantId_code: { tenantId, code: type.code } },
      update: { name: type.name, category: type.category, description: type.description, active: type.active },
      create: { tenantId, code: type.code, name: type.name, category: type.category, description: type.description, active: type.active }
    });
    documentTypeMap.set(type.id, target.id);
  }

  for (const questionnaire of source.questionnaires ?? []) {
    let targetQuestionnaire = await db.questionnaire.findFirst({ where: { tenantId, name: questionnaire.name, category: questionnaire.category } });
    if (!targetQuestionnaire) targetQuestionnaire = await db.questionnaire.create({ data: { tenantId, name: questionnaire.name, category: questionnaire.category, description: questionnaire.description, active: questionnaire.active } });
    for (const version of questionnaire.versions ?? []) {
      let targetVersion = await db.questionnaireVersion.findUnique({ where: { questionnaireId_version: { questionnaireId: targetQuestionnaire.id, version: version.version } } });
      if (!targetVersion) {
        targetVersion = await db.questionnaireVersion.create({ data: { questionnaireId: targetQuestionnaire.id, version: version.version, title: version.title, instructions: version.instructions, scoringConfig: json(version.scoringConfig), publishedAt: asDate(version.publishedAt) } });
      }
      questionnaireVersionMap.set(version.id, targetVersion.id);
      for (const question of version.questions ?? []) {
        let targetQuestion = await db.question.findFirst({ where: { questionnaireVersionId: targetVersion.id, code: question.code } });
        if (!targetQuestion) {
          targetQuestion = await db.question.create({ data: {
            questionnaireVersionId: targetVersion.id, code: question.code, text: question.text, helpText: question.helpText,
            type: question.type, required: question.required, position: question.position, dimension: question.dimension,
            reverseScore: question.reverseScore, minValue: question.minValue, maxValue: question.maxValue,
            conditions: json(question.conditions, []), metadata: json(question.metadata),
            options: { create: (question.options ?? []).map((option: any) => ({ value: option.value, label: option.label, score: option.score, position: option.position })) }
          } });
        }
        questionMap.set(question.id, targetQuestion.id);
      }
    }
  }

  for (const template of source.documentTemplates ?? []) {
    const targetTypeId = documentTypeMap.get(template.documentTypeId) ?? documentTypeMap.get(template.documentType?.id);
    if (!targetTypeId) continue;
    let targetTemplate = await db.documentTemplate.findFirst({ where: { tenantId, documentTypeId: targetTypeId, name: template.name } });
    if (!targetTemplate) targetTemplate = await db.documentTemplate.create({ data: { tenantId, documentTypeId: targetTypeId, name: template.name, description: template.description, active: template.active } });
    for (const version of template.versions ?? []) {
      const targetVersion = await db.documentTemplateVersion.upsert({
        where: { templateId_version: { templateId: targetTemplate.id, version: version.version } },
        update: { schema: json(version.schema), styles: json(version.styles), variables: json(version.variables, []), regulatoryPackage: json(version.regulatoryPackage), publishedAt: asDate(version.publishedAt) },
        create: { templateId: targetTemplate.id, version: version.version, schema: json(version.schema), styles: json(version.styles), variables: json(version.variables, []), regulatoryPackage: json(version.regulatoryPackage), publishedAt: asDate(version.publishedAt) }
      });
      templateVersionMap.set(version.id, targetVersion.id);
    }
  }
  return { questionnaireVersionMap, questionMap, methodologyMap, documentTypeMap, templateVersionMap };
}

export async function importCompanyAsNew(tenantId: string, input: Buffer, password?: string) {
  const inspected = await inspectBackup(input, password);
  if (!inspected.valid) throw new Error(`Arquivos corrompidos: ${inspected.invalid.join(', ')}`);
  if (inspected.manifest.type !== 'COMPANY_FULL') throw new Error('O arquivo não é um backup de empresa');
  const source = await readJson(inspected.directory, 'data/company.json');
  const catalog = await readJson(inspected.directory, 'data/catalog.json');
  const maps = await importCatalog(tenantId, catalog);
  const gheMap = new Map<string, string>();
  const inspectionMap = new Map<string, string>();
  const riskMap = new Map<string, string>();
  const actionItemMap = new Map<string, string>();
  const actionEvidenceMap = new Map<string, string>();
  const documentMap = new Map<string, string>();
  const documentVersionMap = new Map<string, string>();
  const documentVersionNumberMap = new Map<string, string>();
  const fileMap = new Map<string, string>();
  const userMap = new Map<string, string>();
  const createdStorageKeys: string[] = [];
  let companyId: string | null = null;

  try {
    const company = await db.company.create({ data: {
      tenantId, legalName: `${source.legalName} (Restaurada)`, tradeName: source.tradeName, cnpj: null,
      primaryCnae: source.primaryCnae, riskGrade: source.riskGrade, employeeCount: source.employeeCount,
      managerName: source.managerName, status: 'INACTIVE', settings: json(source.settings)
    } });
    companyId = company.id;

    for (const contact of source.contacts ?? []) await db.companyContact.create({ data: { companyId: company.id, name: contact.name, role: contact.role, email: contact.email, phoneDisplay: contact.phoneDisplay, phoneE164: contact.phoneE164, hasWhatsapp: contact.hasWhatsapp, preferredChannel: contact.preferredChannel, isPrimary: contact.isPrimary, active: contact.active ?? true } });
    for (const access of source.accesses ?? []) {
      const sourceUser = access.user;
      if (!sourceUser?.email) continue;
      const targetUser = await db.user.upsert({ where: { email: sourceUser.email }, update: { name: sourceUser.name, active: true }, create: { email: sourceUser.email, name: sourceUser.name, active: true } });
      userMap.set(sourceUser.email, targetUser.id);
      await db.companyAccess.upsert({ where: { companyId_userId: { companyId: company.id, userId: targetUser.id } }, update: { role: access.role, permissions: json(access.permissions, []), active: access.active }, create: { companyId: company.id, userId: targetUser.id, role: access.role, permissions: json(access.permissions, []), active: access.active } });
    }

    for (const establishment of source.establishments ?? []) {
      const targetEstablishment = await db.establishment.create({ data: { companyId: company.id, name: establishment.name, cnpj: establishment.cnpj, addressLine: establishment.addressLine, number: establishment.number, district: establishment.district, city: establishment.city, state: establishment.state, zipCode: establishment.zipCode, employeeCount: establishment.employeeCount, active: establishment.active ?? true } });
      for (const sector of establishment.sectors ?? []) {
        const targetSector = await db.sector.create({ data: { establishmentId: targetEstablishment.id, name: sector.name, description: sector.description, employeeCount: sector.employeeCount, active: sector.active ?? true } });
        for (const ghe of sector.ghes ?? []) {
          const targetGhe = await db.gHE.create({ data: { sectorId: targetSector.id, code: ghe.code, name: ghe.name, description: ghe.description, employeeCount: ghe.employeeCount, shift: ghe.shift, workday: ghe.workday, metadata: json(ghe.metadata), active: ghe.active ?? true } });
          gheMap.set(ghe.id, targetGhe.id);
          for (const jobFunction of ghe.functions ?? []) await db.jobFunction.create({ data: { gheId: targetGhe.id, name: jobFunction.name, cbo: jobFunction.cbo, description: jobFunction.description, employeeCount: jobFunction.employeeCount, activities: json(jobFunction.activities, []), active: jobFunction.active ?? true } });
          for (const workstation of ghe.workstations ?? []) await db.workstation.create({ data: { gheId: targetGhe.id, name: workstation.name, description: workstation.description, metadata: json(workstation.metadata), active: workstation.active ?? true } });
        }
      }
    }

    for (const service of source.services ?? []) {
      await db.serviceContract.create({ data: {
        companyId: company.id,
        code: service.code,
        name: service.name,
        category: service.category,
        description: service.description,
        status: service.status,
        contractedValue: service.contractedValue,
        contractedAt: asDate(service.contractedAt),
        startsAt: asDate(service.startsAt),
        dueAt: asDate(service.dueAt),
        deliveredAt: asDate(service.deliveredAt),
        renewalAt: asDate(service.renewalAt),
        renewalNoticeDays: service.renewalNoticeDays ?? 30,
        responsibleName: service.responsibleName,
        purchaseOrder: service.purchaseOrder,
        notes: service.notes,
        active: service.active ?? true,
      } });
    }

    for (const campaign of source.campaigns ?? []) {
      const restoredSettings = { ...(campaign.settings && typeof campaign.settings === 'object' && !Array.isArray(campaign.settings) ? campaign.settings : {}), ...(campaign.anonymousCodesEnabled ? { codesRequireRegeneration: true, restoredCodeSummary: campaign.anonymousCodeSummary ?? { total: 0, used: 0 } } : {}) };
      const targetCampaign = await db.campaign.create({ data: { companyId: company.id, name: campaign.name, publicToken: randomToken(24), status: campaign.status, startsAt: asDate(campaign.startsAt), endsAt: asDate(campaign.endsAt), expectedResponses: campaign.expectedResponses, minimumGroupSize: campaign.minimumGroupSize, detailedGroupSize: campaign.detailedGroupSize, anonymousCodesEnabled: campaign.anonymousCodesEnabled, settings: json(restoredSettings) } });
      for (const target of campaign.targets ?? []) { const gheId = gheMap.get(target.gheId); if (gheId) await db.campaignTarget.create({ data: { campaignId: targetCampaign.id, gheId, expectedResponses: target.expectedResponses, token: randomToken(24) } }); }
      for (const link of campaign.questionnaires ?? []) { const qv = maps.questionnaireVersionMap.get(link.questionnaireVersionId); if (qv) await db.campaignQuestionnaire.create({ data: { campaignId: targetCampaign.id, questionnaireVersionId: qv, position: link.position } }); }
      for (const response of campaign.responseSessions ?? []) {
        const targetResponse = await db.responseSession.create({ data: { campaignId: targetCampaign.id, gheId: response.gheId ? gheMap.get(response.gheId) : null, status: response.status, anonymousFingerprint: response.anonymousFingerprint, startedAt: new Date(response.startedAt), submittedAt: asDate(response.submittedAt), durationSeconds: response.durationSeconds, qualityFlags: json(response.qualityFlags, []), moderation: json(response.moderation), includedInConsolidation: response.includedInConsolidation } });
        for (const answer of response.answers ?? []) { const questionId = maps.questionMap.get(answer.questionId); if (questionId) await db.answer.create({ data: { responseSessionId: targetResponse.id, questionId, value: answer.value, numericValue: answer.numericValue } }); }
        for (const pain of response.bodyPains ?? []) await db.bodyPain.create({ data: { responseSessionId: targetResponse.id, regionCode: pain.regionCode, side: pain.side, intensity: pain.intensity, frequency: pain.frequency, notes: pain.notes } });
      }
    }

    for (const inspection of source.inspections ?? []) {
      const targetInspection = await db.inspection.create({ data: { companyId: company.id, gheId: inspection.gheId ? gheMap.get(inspection.gheId) : null, title: inspection.title, status: inspection.status, performedAt: asDate(inspection.performedAt), notes: inspection.notes, metadata: json(inspection.metadata) } });
      for (const item of inspection.items ?? []) await db.inspectionItem.create({ data: { inspectionId: targetInspection.id, category: item.category, code: item.code, label: item.label, value: item.value, position: item.position } });
      inspectionMap.set(inspection.id, targetInspection.id);
      for (const calculation of inspection.calculations ?? []) { const methodologyId = maps.methodologyMap.get(calculation.methodologyId); if (methodologyId) await db.calculation.create({ data: { inspectionId: targetInspection.id, methodologyId, inputs: calculation.inputs, outputs: calculation.outputs, score: calculation.score, classification: calculation.classification, engineVersion: calculation.engineVersion } }); }
    }

    for (const risk of source.risks ?? []) {
      const targetRisk = await db.risk.create({ data: { companyId: company.id, gheId: risk.gheId ? gheMap.get(risk.gheId) : null, inspectionId: risk.inspectionId ? inspectionMap.get(risk.inspectionId) : null, code: risk.code, category: risk.category, hazard: risk.hazard, source: risk.source, possibleHarm: risk.possibleHarm, frequency: risk.frequency, duration: risk.duration, methodology: risk.methodology, legalReferences: json(risk.legalReferences, []), controlEffectiveness: risk.controlEffectiveness, exposedCount: risk.exposedCount, severity: risk.severity, probability: risk.probability, exposure: risk.exposure, initialScore: risk.initialScore, initialLevel: risk.initialLevel, residualScore: risk.residualScore, residualLevel: risk.residualLevel, existingControls: json(risk.existingControls, []), assessmentBasis: json(risk.assessmentBasis), status: risk.status, lastReviewedAt: asDate(risk.lastReviewedAt), reviewDueAt: asDate(risk.reviewDueAt) } });
      riskMap.set(risk.id, targetRisk.id);
    }

    for (const plan of source.actionPlans ?? []) {
      const targetPlan = await db.actionPlan.create({ data: { companyId: company.id, name: plan.name, year: plan.year, status: plan.status, lastReviewedAt: asDate(plan.lastReviewedAt), reviewDueAt: asDate(plan.reviewDueAt) } });
      for (const item of plan.items ?? []) {
        const targetItem = await db.actionItem.create({ data: { actionPlanId: targetPlan.id, riskId: item.riskId ? riskMap.get(item.riskId) : null, code: item.code, action: item.action, responsible: item.responsible, verifier: item.verifier, dueDate: asDate(item.dueDate), location: item.location, reason: item.reason, method: item.method, estimatedCost: item.estimatedCost, actualCost: item.actualCost, priority: item.priority, status: item.status, progress: item.progress, completedAt: asDate(item.completedAt), verifiedAt: asDate(item.verifiedAt), effectivenessStatus: item.effectivenessStatus, effectivenessNotes: item.effectivenessNotes, residualScore: item.residualScore, residualLevel: item.residualLevel, delayReason: item.delayReason, nextReviewAt: asDate(item.nextReviewAt) } });
        actionItemMap.set(item.id, targetItem.id);
      }
    }

    for (const document of source.documents ?? []) {
      const documentTypeId = maps.documentTypeMap.get(document.documentTypeId) ?? maps.documentTypeMap.get(document.documentType?.id);
      if (!documentTypeId) continue;
      const targetDocument = await db.document.create({ data: {
        companyId: company.id,
        documentTypeId,
        templateVersionId: document.templateVersionId ? maps.templateVersionMap.get(document.templateVersionId) : null,
        title: document.title,
        referenceYear: document.referenceYear,
        status: document.status,
        currentVersion: document.currentVersion,
        releasedVersion: document.releasedVersion ?? (document.releasedToCompany ? document.currentVersion : null),
        verificationCode: randomToken(12),
        releasedToCompany: document.releasedToCompany,
        releasedAt: asDate(document.releasedAt),
      } });
      documentMap.set(document.id, targetDocument.id);
      for (const version of document.versions ?? []) {
        let snapshotId: string | undefined;
        if (version.snapshot) {
          const snapshot = await db.documentSnapshot.create({ data: { data: json(version.snapshot.data), dataHash: version.snapshot.dataHash } });
          snapshotId = snapshot.id;
        }
        const targetVersion = await db.documentVersion.create({ data: {
          documentId: targetDocument.id,
          version: version.version,
          status: version.status,
          content: json(version.content),
          warnings: json(version.warnings, []),
          justification: version.justification,
          snapshotId,
          generatedAt: asDate(version.generatedAt),
          lockedAt: asDate(version.lockedAt),
          issuedAt: asDate(version.issuedAt),
          releasedAt: asDate(version.releasedAt),
          sections: { create: (version.sections ?? []).map((section: any) => ({ code: section.code, title: section.title, position: section.position, enabled: section.enabled, content: json(section.content) })) },
        } });
        documentVersionMap.set(version.id, targetVersion.id);
        documentVersionNumberMap.set(`${document.id}:${version.version}`, targetVersion.id);
        for (const run of version.auditRuns ?? []) await db.documentAuditRun.create({ data: { documentVersionId: targetVersion.id, status: run.status, results: json(run.results, []), warningCount: run.warningCount ?? 0, errorCount: run.errorCount ?? 0, createdAt: asDate(run.createdAt) ?? new Date() } });
      }
      for (const signature of document.signatures ?? []) {
        const targetVersionId = documentVersionMap.get(signature.documentVersionId) ?? documentVersionNumberMap.get(`${document.id}:${signature.versionNumber ?? document.currentVersion}`);
        if (!targetVersionId) continue;
        await db.signature.create({ data: {
          documentId: targetDocument.id,
          documentVersionId: targetVersionId,
          versionNumber: signature.versionNumber ?? document.currentVersion,
          method: signature.method,
          signerName: signature.signerName,
          signerRegistration: signature.signerRegistration,
          signatureRole: signature.signatureRole ?? 'RESPONSIBLE_TECH',
          signedAt: asDate(signature.signedAt),
          ipHash: signature.ipHash,
          documentHash: signature.documentHash,
          metadata: json(signature.metadata),
        } });
      }
    }

    for (const file of source.files ?? []) {
      const entry = inspected.directory.files.find((candidate) => candidate.path === `files/${file.id}/content`);
      if (!entry) continue;
      const saved = await saveFile({ tenantId, companyId: company.id, originalName: file.originalName, mimeType: file.mimeType, data: await entry.buffer(), visibility: file.visibility, createdById: undefined });
      fileMap.set(file.id, saved.id); createdStorageKeys.push(saved.storageKey);
    }

    for (const inspection of source.inspections ?? []) for (const evidence of inspection.evidences ?? []) {
      const inspectionId = inspectionMap.get(inspection.id); const fileId = fileMap.get(evidence.fileId);
      if (inspectionId && fileId) await db.inspectionEvidence.create({ data: { inspectionId, fileId, kind: evidence.kind, caption: evidence.caption, position: evidence.position ?? 0 } });
    }

    for (const plan of source.actionPlans ?? []) for (const item of plan.items ?? []) for (const evidence of item.evidences ?? []) {
      const actionItemId = actionItemMap.get(item.id); if (!actionItemId) continue;
      const targetEvidence = await db.actionEvidence.create({ data: { actionItemId, fileId: evidence.fileId ? fileMap.get(evidence.fileId) : null, description: evidence.description, status: evidence.status, reviewedAt: asDate(evidence.reviewedAt), reviewNotes: evidence.reviewNotes } });
      actionEvidenceMap.set(evidence.id, targetEvidence.id);
    }
    for (const document of source.documents ?? []) for (const file of document.files ?? []) {
      const documentId = documentMap.get(document.id);
      const fileObjectId = fileMap.get(file.fileObjectId);
      const versionNumber = file.versionNumber ?? file.documentVersion ?? document.currentVersion;
      const documentVersionId = documentVersionMap.get(file.documentVersionId) ?? documentVersionNumberMap.get(`${document.id}:${versionNumber}`);
      if (!documentId || !fileObjectId || !documentVersionId) continue;
      const targetVersion = await db.documentVersion.findUnique({ where: { id: documentVersionId }, include: { snapshot: true } });
      if (!targetVersion?.snapshot) continue;
      await db.documentFile.create({ data: {
        documentId,
        documentVersionId,
        versionNumber,
        fileObjectId,
        format: file.format,
        official: file.official,
        snapshotHash: file.snapshotHash ?? targetVersion.snapshot.dataHash,
        signatureCount: file.signatureCount ?? 0,
        metadata: json(file.metadata),
      } });
    }

    for (const conversation of source.conversations ?? []) {
      const participants: Array<{ userId: string; lastReadAt: Date | null; muted: boolean }> = [];
      for (const participant of conversation.participants ?? []) {
        const email = participant.user?.email; if (!email) continue;
        const existing = await db.user.findUnique({ where: { email } });
        if (existing) { userMap.set(email, existing.id); participants.push({ userId: existing.id, lastReadAt: asDate(participant.lastReadAt), muted: Boolean(participant.muted) }); }
      }
      const uniqueParticipants = [...new Map(participants.map((participant) => [participant.userId, participant])).values()];
      const targetConversation = await db.conversation.create({ data: { tenantId, companyId: company.id, subject: conversation.subject, category: conversation.category, status: conversation.status, priority: conversation.priority, relatedType: conversation.relatedType, relatedId: conversation.relatedId, resolvedAt: asDate(conversation.resolvedAt), archivedAt: asDate(conversation.archivedAt), lastMessageAt: new Date(conversation.lastMessageAt), participants: { create: uniqueParticipants } } });
      for (const message of conversation.messages ?? []) {
        const userId = message.user?.email ? userMap.get(message.user.email) : undefined;
        const targetMessage = await db.message.create({ data: { conversationId: targetConversation.id, userId, channel: message.channel, body: message.body, internal: message.internal, metadata: json(message.metadata), createdAt: asDate(message.createdAt) ?? new Date() } });
        for (const attachment of message.attachments ?? []) { const fileId = fileMap.get(attachment.fileId); if (fileId) await db.messageAttachment.create({ data: { messageId: targetMessage.id, fileId } }); }
      }
    }

    for (const comment of source.comments ?? []) {
      const targetEntityId = comment.entityType === 'ACTION' ? actionItemMap.get(comment.entityId) : comment.entityType === 'ACTION_EVIDENCE' ? actionEvidenceMap.get(comment.entityId) : comment.entityType === 'DOCUMENT' ? documentMap.get(comment.entityId) : comment.entityType === 'RISK' ? riskMap.get(comment.entityId) : undefined;
      if (!targetEntityId) continue;
      const userId = comment.user?.email ? userMap.get(comment.user.email) : undefined;
      const targetComment = await db.entityComment.create({ data: { tenantId, companyId: company.id, userId, entityType: comment.entityType, entityId: targetEntityId, body: comment.body, internal: comment.internal, createdAt: asDate(comment.createdAt) ?? new Date() } });
      for (const attachment of comment.attachments ?? []) { const fileId = fileMap.get(attachment.fileId); if (fileId) await db.commentAttachment.create({ data: { commentId: targetComment.id, fileId } }); }
    }

    await db.company.update({ where: { id: company.id }, data: { status: 'ACTIVE' } });
    return company;
  } catch (error) {
    if (companyId) await db.company.delete({ where: { id: companyId } }).catch(() => undefined);
    for (const key of createdStorageKeys) await storage.delete(key).catch(() => undefined);
    throw error;
  }
}
