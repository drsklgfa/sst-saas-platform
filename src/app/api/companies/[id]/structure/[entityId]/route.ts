import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { csvItems, digits, nonNegativeInteger, optionalText, requiredText, upperState } from '@/domain/companies/validation';
import { findStructureEntity, type StructureEntity } from '@/domain/companies/ownership';

const allowed = new Set<StructureEntity>(['establishment', 'sector', 'ghe', 'function', 'workstation']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; entityId: string }> }) {
  const { id: companyId, entityId } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id }, select: { id: true } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  try {
    const form = await request.formData();
    const entityType = String(form.get('entityType') ?? '') as StructureEntity;
    if (!allowed.has(entityType)) return new Response('Tipo de cadastro inválido', { status: 400 });
    const before = await findStructureEntity(companyId, entityType, entityId);
    if (!before) return new Response('Registro não encontrado', { status: 404 });
    const operation = String(form.get('operation') ?? 'update');
    if (!['update', 'archive', 'restore'].includes(operation)) return new Response('Operação inválida', { status: 400 });
    const active = operation === 'archive' ? false : operation === 'restore' ? true : undefined;
    let after: unknown;

    if (entityType === 'establishment') {
      const cnpj = digits(form.get('cnpj'), 14);
      if (operation === 'update' && cnpj && cnpj.length !== 14) return new Response('CNPJ deve conter 14 dígitos', { status: 400 });
      after = await db.establishment.update({ where: { id: entityId }, data: operation === 'update' ? {
        name: requiredText(form.get('name'), 'Nome da unidade'), cnpj,
        addressLine: optionalText(form.get('addressLine'), 250), number: optionalText(form.get('number'), 30),
        district: optionalText(form.get('district'), 120), city: optionalText(form.get('city'), 120), state: upperState(form.get('state')),
        zipCode: digits(form.get('zipCode'), 8), employeeCount: nonNegativeInteger(form.get('employeeCount')),
      } : { active } });
    } else if (entityType === 'sector') {
      after = await db.sector.update({ where: { id: entityId }, data: operation === 'update' ? {
        name: requiredText(form.get('name'), 'Nome do setor'), description: optionalText(form.get('description'), 2000), employeeCount: nonNegativeInteger(form.get('employeeCount')),
      } : { active } });
    } else if (entityType === 'ghe') {
      after = await db.gHE.update({ where: { id: entityId }, data: operation === 'update' ? {
        code: optionalText(form.get('code'), 50), name: requiredText(form.get('name'), 'Nome do GHE'), description: optionalText(form.get('description'), 3000),
        employeeCount: nonNegativeInteger(form.get('employeeCount')), shift: optionalText(form.get('shift'), 120), workday: optionalText(form.get('workday'), 120),
      } : { active } });
    } else if (entityType === 'function') {
      after = await db.jobFunction.update({ where: { id: entityId }, data: operation === 'update' ? {
        name: requiredText(form.get('name'), 'Nome da função'), cbo: optionalText(form.get('cbo'), 20), description: optionalText(form.get('description'), 3000),
        employeeCount: nonNegativeInteger(form.get('employeeCount')), activities: toPrismaJson(csvItems(form.get('activities')), []),
      } : { active } });
    } else {
      after = await db.workstation.update({ where: { id: entityId }, data: operation === 'update' ? {
        name: requiredText(form.get('name'), 'Nome do posto'), description: optionalText(form.get('description'), 3000),
      } : { active } });
    }

    await audit({ tenantId: tenant.id, companyId, userId: user.id, action: operation.toUpperCase(), entityType, entityId, before, after });
    return NextResponse.redirect(publicAppUrl(`/companies/${companyId}/structure?updated=${entityType}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
