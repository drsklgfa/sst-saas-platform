import { publicAppUrl } from '@/lib/public-url';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { calculateNiosh } from '@/domain/engines/niosh';
import { calculateRula } from '@/domain/engines/rula';
import { calculateReba } from '@/domain/engines/reba';
import { toPrismaJson } from '@/lib/prisma-json';
import { NextResponse } from 'next/server';

function number(form: FormData, name: string, min = 0, max = 100000): number {
  const value = Number(form.get(name));
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} inválido.`);
  return value;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const inspection = await db.inspection.findFirst({ where: { id, company: { tenantId: tenant.id } } });
  if (!inspection) return new Response('Vistoria não encontrada', { status: 404 });
  if (inspection.status === 'REVIEWED') return new Response('Vistoria revisada é imutável.', { status: 409 });

  const form = await request.formData();
  const method = String(form.get('method'));
  try {
    let inputs: Record<string, number>;
    let output: Record<string, unknown>;
    let score: number | null = null;
    let classification = '';
    if (method === 'NIOSH') {
      inputs = {
        loadKg: number(form, 'loadKg', 0.01, 1000), horizontalCm: number(form, 'horizontalCm', 1, 1000),
        originHeightCm: number(form, 'originHeightCm', 0, 500), verticalTravelCm: number(form, 'verticalTravelCm', 1, 1000),
        asymmetryDeg: number(form, 'asymmetryDeg', 0, 180), frequencyMultiplier: number(form, 'frequencyMultiplier', 0, 1),
        couplingMultiplier: number(form, 'couplingMultiplier', 0, 1), durationMultiplier: number(form, 'durationMultiplier', 0, 1),
      };
      const result = calculateNiosh(inputs as Parameters<typeof calculateNiosh>[0]);
      output = result; score = result.liftingIndex; classification = result.classification;
    } else if (method === 'RULA') {
      inputs = {
        upperArm: number(form, 'upperArm', 1, 6), lowerArm: number(form, 'lowerArm', 1, 4), wrist: number(form, 'wrist', 1, 4),
        wristTwist: number(form, 'wristTwist', 1, 2), neck: number(form, 'neck', 1, 6), trunk: number(form, 'trunk', 1, 6),
        legs: number(form, 'legs', 1, 2), muscleUse: number(form, 'muscleUse', 0, 1), forceLoad: number(form, 'forceLoad', 0, 3),
      };
      const result = calculateRula(inputs as Parameters<typeof calculateRula>[0]);
      output = result; score = result.score; classification = result.action;
    } else if (method === 'REBA') {
      inputs = {
        trunk: number(form, 'trunk', 1, 5), neck: number(form, 'neck', 1, 3), legs: number(form, 'legs', 1, 4),
        upperArm: number(form, 'upperArm', 1, 6), lowerArm: number(form, 'lowerArm', 1, 2), wrist: number(form, 'wrist', 1, 3),
        load: number(form, 'load', 0, 3), coupling: number(form, 'coupling', 0, 3), activity: number(form, 'activity', 0, 3),
      };
      const result = calculateReba(inputs as Parameters<typeof calculateReba>[0]);
      output = result; score = result.score; classification = result.level;
    } else {
      return new Response('Método inválido', { status: 400 });
    }
    const methodology = await db.methodology.findFirst({ where: { tenantId: tenant.id, code: method, active: true }, orderBy: { createdAt: 'desc' } });
    if (!methodology) return new Response('Metodologia não configurada', { status: 409 });
    const calculation = await db.calculation.create({ data: { inspectionId: inspection.id, methodologyId: methodology.id, inputs: toPrismaJson(inputs), outputs: toPrismaJson(output), score, classification, engineVersion: '1.1.0', performedById: user.id } });
    await audit({ tenantId: tenant.id, companyId: inspection.companyId, userId: user.id, action: 'CALCULATE', entityType: 'Calculation', entityId: calculation.id, after: { method, inputs, output, score, classification } });
    return NextResponse.redirect(publicAppUrl(`/inspections/${inspection.id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Entradas inválidas', { status: 400 });
  }
}
