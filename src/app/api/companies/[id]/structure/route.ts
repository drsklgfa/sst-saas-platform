import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { csvItems, digits, nonNegativeInteger, optionalText, requiredText, upperState } from '@/domain/companies/validation';
import { ensureEstablishment, ensureGhe, ensureSector, type StructureEntity } from '@/domain/companies/ownership';

const allowed = new Set<StructureEntity>(['establishment', 'sector', 'ghe', 'function', 'workstation']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await params;
  const authorization = await authorizeTenantApi('company.write');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id }, select: { id: true } });
  if (!company) return new Response('Empresa não encontrada', { status: 404 });

  try {
    const form = await request.formData();
    const entityType = String(form.get('entityType') ?? '') as StructureEntity;
    if (!allowed.has(entityType)) return new Response('Tipo de cadastro inválido', { status: 400 });
    let created: { id: string };

    if (entityType === 'establishment') {
      const cnpj = digits(form.get('cnpj'), 14);
      if (cnpj && cnpj.length !== 14) return new Response('CNPJ deve conter 14 dígitos', { status: 400 });
      created = await db.establishment.create({ data: {
        companyId,
        name: requiredText(form.get('name'), 'Nome da unidade'),
        cnpj,
        addressLine: optionalText(form.get('addressLine'), 250),
        number: optionalText(form.get('number'), 30),
        district: optionalText(form.get('district'), 120),
        city: optionalText(form.get('city'), 120),
        state: upperState(form.get('state')),
        zipCode: digits(form.get('zipCode'), 8),
        employeeCount: nonNegativeInteger(form.get('employeeCount')),
      } });
    } else if (entityType === 'sector') {
      const establishmentId = requiredText(form.get('establishmentId'), 'Unidade');
      if (!await ensureEstablishment(companyId, establishmentId)) return new Response('Unidade inválida', { status: 400 });
      created = await db.sector.create({ data: {
        establishmentId,
        name: requiredText(form.get('name'), 'Nome do setor'),
        description: optionalText(form.get('description'), 2000),
        employeeCount: nonNegativeInteger(form.get('employeeCount')),
      } });
    } else if (entityType === 'ghe') {
      const sectorId = requiredText(form.get('sectorId'), 'Setor');
      if (!await ensureSector(companyId, sectorId)) return new Response('Setor inválido', { status: 400 });
      created = await db.gHE.create({ data: {
        sectorId,
        code: optionalText(form.get('code'), 50),
        name: requiredText(form.get('name'), 'Nome do GHE'),
        description: optionalText(form.get('description'), 3000),
        employeeCount: nonNegativeInteger(form.get('employeeCount')),
        shift: optionalText(form.get('shift'), 120),
        workday: optionalText(form.get('workday'), 120),
      } });
    } else if (entityType === 'function') {
      const gheId = requiredText(form.get('gheId'), 'GHE');
      if (!await ensureGhe(companyId, gheId)) return new Response('GHE inválido', { status: 400 });
      created = await db.jobFunction.create({ data: {
        gheId,
        name: requiredText(form.get('name'), 'Nome da função'),
        cbo: optionalText(form.get('cbo'), 20),
        description: optionalText(form.get('description'), 3000),
        employeeCount: nonNegativeInteger(form.get('employeeCount')),
        activities: toPrismaJson(csvItems(form.get('activities')), []),
      } });
    } else {
      const gheId = requiredText(form.get('gheId'), 'GHE');
      if (!await ensureGhe(companyId, gheId)) return new Response('GHE inválido', { status: 400 });
      created = await db.workstation.create({ data: {
        gheId,
        name: requiredText(form.get('name'), 'Nome do posto'),
        description: optionalText(form.get('description'), 3000),
      } });
    }

    await audit({ tenantId: tenant.id, companyId, userId: user.id, action: 'CREATE', entityType, entityId: created.id, after: created });
    return NextResponse.redirect(publicAppUrl(`/companies/${companyId}/structure?created=${entityType}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Dados inválidos', { status: 400 });
  }
}
