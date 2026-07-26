import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { generateParticipationCode } from '@/domain/campaigns';
import { sha256 } from '@/lib/crypto';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const campaign = await db.campaign.findFirst({ where: { id, company: { tenantId: tenant.id }, anonymousCodesEnabled: true }, include: { company: true } });
  if (!campaign) return new Response('Campanha não encontrada ou sem códigos habilitados', { status: 404 });
  const form = await request.formData();
  const count = Math.max(1, Math.min(5000, Number(form.get('count')) || 1));
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateParticipationCode());
  await db.anonymousCode.createMany({ data: [...codes].map((code) => ({ campaignId: campaign.id, codeHash: sha256(code) })) });
  await audit({ tenantId: tenant.id, companyId: campaign.companyId, userId: user.id, action: 'GENERATE_CODES', entityType: 'Campaign', entityId: campaign.id, metadata: { count } });
  const csv = ['codigo', ...[...codes]].join('\r\n');
  const safeName = (campaign.company.tradeName ?? campaign.company.legalName).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80);
  return new Response(`\uFEFF${csv}`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="codigos-${safeName}.csv"`, 'cache-control': 'no-store' } });
}
