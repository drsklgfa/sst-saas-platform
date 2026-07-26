import QRCode from 'qrcode';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('campaign.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant } = authorization;
  const targetId = new URL(request.url).searchParams.get('targetId');
  const campaign = await db.campaign.findFirst({ where: { id, company: { tenantId: tenant.id } }, include: { company: true, targets: true } });
  if (!campaign) return new Response('Campanha não encontrada', { status: 404 });
  const target = targetId ? campaign.targets.find((candidate) => candidate.id === targetId) : null;
  if (targetId && !target) return new Response('Segmento não encontrado', { status: 404 });
  const token = target?.token ?? campaign.publicToken;
  const data = await QRCode.toBuffer(`${env.APP_URL}/p/${token}`, { type: 'png', width: 900, margin: 2, errorCorrectionLevel: 'H' });
  const companyName = (campaign.company.tradeName ?? campaign.company.legalName).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80);
  return new Response(data, { headers: { 'content-type': 'image/png', 'content-disposition': `attachment; filename="qr-${companyName}${target ? `-${target.id.slice(0, 8)}` : ''}.png"`, 'cache-control': 'no-store' } });
}
