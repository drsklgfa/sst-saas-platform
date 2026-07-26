import { Card } from '@/components/ui';
import { CampaignForm } from '@/components/campaign-form';
import { db } from '@/lib/db';
import { requireTenantPermission } from '@/lib/auth';
import { notFound } from 'next/navigation';

export default async function NewCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await requireTenantPermission('campaign.manage');
  const company = await db.company.findFirst({
    where: { id, tenantId: tenant.id, status: 'ACTIVE' },
    include: { establishments: { where: { active: true }, include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true } } } } } } },
  });
  if (!company) notFound();
  const ghes = company.establishments.flatMap((establishment) => establishment.sectors.flatMap((sector) => sector.ghes.map((ghe) => ({ id: ghe.id, label: `${establishment.name} / ${sector.name} / ${ghe.code ? `${ghe.code} — ` : ''}${ghe.name}`, expectedResponses: ghe.employeeCount }))));
  const versions = await db.questionnaireVersion.findMany({
    where: { questionnaire: { tenantId: tenant.id, active: true }, publishedAt: { not: null } },
    include: { questionnaire: true },
    orderBy: [{ questionnaire: { name: 'asc' } }, { version: 'desc' }],
  });
  const latestByQuestionnaire = new Map<string, typeof versions[number]>();
  for (const version of versions) if (!latestByQuestionnaire.has(version.questionnaireId)) latestByQuestionnaire.set(version.questionnaireId, version);
  const questionnaires = [...latestByQuestionnaire.values()].map((version) => ({ id: version.id, label: `${version.questionnaire.name} — versão ${version.version}: ${version.title}` }));
  return <div className="max-w-4xl"><h1 className="text-3xl font-bold">Nova campanha</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p><Card className="mt-6"><CampaignForm companyId={company.id} defaultExpectedResponses={company.employeeCount} ghes={ghes} questionnaires={questionnaires} /></Card></div>;
}
