import argon2 from 'argon2';
import {
  CampaignStatus,
  MembershipRole,
  PrismaClient,
  QuestionType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { getDefaultSections } from '../src/domain/documents/default-sections';

const prisma = new PrismaClient();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function enabled(name: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((process.env[name] ?? '').trim().toLowerCase());
}

async function seedCore(tenantId: string): Promise<void> {
  await prisma.tenantSecurityPolicy.upsert({ where: { tenantId }, update: {}, create: { tenantId } });
  const methodologies = [
    ['NIOSH', 'Equação de Levantamento NIOSH', 'ERGONOMICS', '1.0'],
    ['RULA', 'RULA', 'ERGONOMICS', '1.0'],
    ['REBA', 'REBA', 'ERGONOMICS', '1.0'],
  ] as const;

  for (const [code, name, category, version] of methodologies) {
    await prisma.methodology.upsert({
      where: { tenantId_code_version: { tenantId, code, version } },
      update: { name, category, active: true },
      create: { tenantId, code, name, category, version, active: true },
    });
  }

  const documentTypes = [
    ['AEP', 'Avaliação Ergonômica Preliminar', 'ERGONOMICS'],
    ['AET', 'Análise Ergonômica do Trabalho', 'ERGONOMICS'],
    ['PSY', 'Avaliação Psicossocial', 'PSYCHOSOCIAL'],
    ['PGR', 'Programa de Gerenciamento de Riscos', 'GRO'],
    ['LTCAT', 'LTCAT', 'EXPOSURE'],
    ['INSAL', 'Laudo de Insalubridade', 'EXPOSURE'],
    ['PERIC', 'Laudo de Periculosidade', 'EXPOSURE'],
    ['APR', 'Análise Preliminar de Risco', 'OPERATIONAL'],
    ['OS', 'Ordem de Serviço', 'OPERATIONAL'],
    ['CUSTOM', 'Documento Personalizado', 'CUSTOM'],
  ] as const;

  for (const [code, name, category] of documentTypes) {
    const type = await prisma.documentType.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: { name, category, active: true },
      create: { tenantId, code, name, category, active: true },
    });
    let template = await prisma.documentTemplate.findFirst({
      where: { tenantId, documentTypeId: type.id, name: 'Modelo padrão' },
    });
    template ??= await prisma.documentTemplate.create({
      data: { tenantId, documentTypeId: type.id, name: 'Modelo padrão', description: `Estrutura inicial para ${name}.` },
    });
    await prisma.documentTemplateVersion.upsert({
      where: { templateId_version: { templateId: template.id, version: 1 } },
      update: { publishedAt: new Date() },
      create: {
        templateId: template.id,
        version: 1,
        schema: { sections: getDefaultSections(code) },
        styles: {},
        variables: [],
        regulatoryPackage: {},
        publishedAt: new Date(),
      },
    });
  }
}

async function seedOptionalDemo(tenantId: string): Promise<void> {
  if (!enabled('SEED_DEMO_DATA')) return;

  const company = await prisma.company.upsert({
    where: { tenantId_cnpj: { tenantId, cnpj: '12345678000190' } },
    update: {},
    create: {
      tenantId,
      legalName: 'Indústria Exemplo Ltda.',
      tradeName: 'Indústria Exemplo',
      cnpj: '12345678000190',
      riskGrade: 3,
      employeeCount: 48,
    },
  });

  let establishment = await prisma.establishment.findFirst({
    where: { companyId: company.id, name: 'Unidade Principal' },
  });
  establishment ??= await prisma.establishment.create({
    data: {
      companyId: company.id,
      name: 'Unidade Principal',
      city: 'Franca',
      state: 'SP',
      employeeCount: 48,
    },
  });

  let sector = await prisma.sector.findFirst({
    where: { establishmentId: establishment.id, name: 'Produção' },
  });
  sector ??= await prisma.sector.create({
    data: { establishmentId: establishment.id, name: 'Produção', employeeCount: 30 },
  });

  let ghe = await prisma.gHE.findFirst({
    where: { sectorId: sector.id, name: 'Operadores de Produção' },
  });
  ghe ??= await prisma.gHE.create({
    data: {
      sectorId: sector.id,
      code: 'GHE-01',
      name: 'Operadores de Produção',
      employeeCount: 30,
      shift: 'Diurno',
      workday: '8h',
    },
  });

  const questionnaire = await prisma.questionnaire.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: { active: true },
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      tenantId,
      name: 'Percepção Ergonômica e Psicossocial',
      category: 'ERGONOMICS_PSYCHOSOCIAL',
    },
  });

  let questionnaireVersion = await prisma.questionnaireVersion.findUnique({
    where: { questionnaireId_version: { questionnaireId: questionnaire.id, version: 1 } },
  });

  if (!questionnaireVersion) {
    questionnaireVersion = await prisma.questionnaireVersion.create({
      data: {
        questionnaireId: questionnaire.id,
        version: 1,
        title: 'Avaliação Participativa',
        instructions: 'Responda com sinceridade. Não coletamos nome, CPF, matrícula ou e-mail.',
        publishedAt: new Date(),
        questions: {
          create: [
            {
              code: 'posture',
              text: 'Com que frequência sua postura causa desconforto?',
              type: QuestionType.LIKERT,
              position: 1,
              dimension: 'ERGONOMICS',
              minValue: 1,
              maxValue: 5,
              options: {
                create: [1, 2, 3, 4, 5].map((number) => ({
                  value: String(number),
                  label: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'][number - 1],
                  score: number,
                  position: number,
                })),
              },
            },
            {
              code: 'pace',
              text: 'O ritmo de trabalho é excessivo?',
              type: QuestionType.LIKERT,
              position: 2,
              dimension: 'WORK_PACE',
              minValue: 1,
              maxValue: 5,
              options: {
                create: [1, 2, 3, 4, 5].map((number) => ({
                  value: String(number),
                  label: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'][number - 1],
                  score: number,
                  position: number,
                })),
              },
            },
            {
              code: 'support',
              text: 'Você recebe apoio da liderança quando precisa?',
              type: QuestionType.LIKERT,
              position: 3,
              dimension: 'LEADERSHIP_SUPPORT',
              reverseScore: true,
              minValue: 1,
              maxValue: 5,
              options: {
                create: [1, 2, 3, 4, 5].map((number) => ({
                  value: String(number),
                  label: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'][number - 1],
                  score: number,
                  position: number,
                })),
              },
            },
            {
              code: 'body_map',
              text: 'Marque regiões com desconforto e a intensidade.',
              type: QuestionType.BODY_MAP,
              position: 4,
              dimension: 'BODY_PAIN',
              required: false,
            },
          ],
        },
      },
    });
  }

  const existingCampaign = await prisma.campaign.findFirst({
    where: { companyId: company.id, name: 'Campanha demonstrativa' },
  });

  if (!existingCampaign) {
    const campaign = await prisma.campaign.create({
      data: {
        companyId: company.id,
        name: 'Campanha demonstrativa',
        publicToken: randomUUID().replaceAll('-', ''),
        status: CampaignStatus.ACTIVE,
        expectedResponses: 30,
        minimumGroupSize: 5,
      },
    });
    await prisma.campaignTarget.create({
      data: {
        campaignId: campaign.id,
        gheId: ghe.id,
        expectedResponses: 30,
        token: randomUUID().replaceAll('-', ''),
      },
    });
    await prisma.campaignQuestionnaire.create({
      data: {
        campaignId: campaign.id,
        questionnaireVersionId: questionnaireVersion.id,
        position: 1,
      },
    });
  }
}

async function main(): Promise<void> {
  const tenantName = required('SEED_TENANT_NAME');
  const tenantSlug = required('SEED_TENANT_SLUG');
  const adminName = required('SEED_ADMIN_NAME');
  const adminEmail = required('SEED_ADMIN_EMAIL').toLowerCase();
  const adminPassword = required('SEED_ADMIN_PASSWORD');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) {
    throw new Error('SEED_TENANT_SLUG inválido. Use letras minúsculas, números e hífens.');
  }
  if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD deve ter ao menos 12 caracteres.');
  }

  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: {
      name: tenantName,
      slug: tenantSlug,
      settings: { minPsychosocialGroup: 5 },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, active: true },
    create: { name: adminName, email: adminEmail, passwordHash, active: true },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: MembershipRole.OWNER, active: true },
    create: { tenantId: tenant.id, userId: user.id, role: MembershipRole.OWNER },
  });

  await seedCore(tenant.id);
  await seedOptionalDemo(tenant.id);

  console.log(`Seed concluído para ${tenant.name}. Administrador: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
