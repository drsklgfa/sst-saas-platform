import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { optionalDate, optionalText, parseRiskAssessment, requiredText, stringList, boundedInteger } from '@/domain/inspections/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });
  const form = await request.formData();
  const gheId = String(form.get('gheId') ?? '').trim() || null;
  const inspectionId = String(form.get('inspectionId') ?? '').trim() || null;
  if (gheId && !await db.gHE.findFirst({ where: { id: gheId, sector: { establishment: { companyId: id } } } })) return new Response('GHE inválido', { status: 400 });
  if (inspectionId && !await db.inspection.findFirst({ where: { id: inspectionId, companyId: id } })) return new Response('Vistoria inválida', { status: 400 });
  try {
    const assessment = parseRiskAssessment(form);
    const risk = await db.risk.create({ data: {
      companyId: id, gheId, inspectionId,
      code: requiredText(form.get('code'), 'Código', 60).toUpperCase(),
      category: requiredText(form.get('category'), 'Categoria', 100),
      hazard: requiredText(form.get('hazard'), 'Perigo ou fator de risco', 500),
      source: optionalText(form.get('source'), 1000), possibleHarm: optionalText(form.get('possibleHarm'), 1000),
      frequency: optionalText(form.get('frequency'), 200), duration: optionalText(form.get('duration'), 200), methodology: optionalText(form.get('methodology'), 300),
      legalReferences: toPrismaJson(stringList(form.get('legalReferences'), 50)), controlEffectiveness: assessment.controlEffectiveness,
      exposedCount: boundedInteger(form.get('exposedCount'), 'Expostos', 0, 100000, 0),
      severity: assessment.severity, probability: assessment.probability, exposure: assessment.exposure,
      initialScore: assessment.initial.score, initialLevel: assessment.initial.level,
      residualScore: assessment.residual?.score ?? null, residualLevel: assessment.residual?.level ?? null,
      existingControls: toPrismaJson(stringList(form.get('existingControls'), 100)),
      assessmentBasis: toPrismaJson({ observations: optionalText(form.get('assessmentBasis'), 5000), residualInputs: assessment.residual ? { severity: Number(form.get('residualSeverity')), probability: Number(form.get('residualProbability')), exposure: Number(form.get('residualExposure') || 1) } : null }),
      lastReviewedAt: new Date(), reviewDueAt: optionalDate(form.get('reviewDueAt')),
    } });
    await audit({ tenantId: tenant.id, companyId: id, userId: user.id, action: 'CREATE', entityType: 'Risk', entityId: risk.id, after: risk });
    return NextResponse.redirect(publicAppUrl(`/companies/${id}/risks`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Risco inválido';
    return new Response(message.includes('Unique constraint') ? 'Código de risco já utilizado.' : message, { status: 400 });
  }
}
