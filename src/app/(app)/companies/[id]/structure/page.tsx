import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui';

function activitiesText(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').join(', ') : '';
}

function StateBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Arquivado'}</Badge>;
}

export default async function StructurePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const { id } = await params;
  const feedback = await searchParams;
  const { tenant } = await requireTenantPermission('company.write');
  const company = await db.company.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      establishments: {
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        include: {
          sectors: {
            orderBy: [{ active: 'desc' }, { name: 'asc' }],
            include: {
              ghes: {
                orderBy: [{ active: 'desc' }, { name: 'asc' }],
                include: {
                  functions: { orderBy: [{ active: 'desc' }, { name: 'asc' }] },
                  workstations: { orderBy: [{ active: 'desc' }, { name: 'asc' }] },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!company) notFound();
  const sectors = company.establishments.filter((establishment) => establishment.active).flatMap((establishment) => establishment.sectors.map((sector) => ({ ...sector, establishmentName: establishment.name })));
  const ghes = sectors.flatMap((sector) => sector.ghes.map((ghe) => ({ ...ghe, sectorName: sector.name, establishmentName: sector.establishmentName })));

  return <div>
    <div><h1 className="text-3xl font-bold">Estrutura ocupacional</h1><p className="text-slate-500">{company.tradeName ?? company.legalName} · unidades, setores, GHEs, funções e postos de trabalho.</p></div>
    {(feedback.created || feedback.updated) && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Cadastro salvo com sucesso.</p>}

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card><h2 className="font-bold">Nova unidade</h2><form action={`/api/companies/${id}/structure`} method="post" className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="entityType" value="establishment" />
        <label className="text-sm font-medium md:col-span-2">Nome<Input name="name" required className="mt-1" /></label>
        <label className="text-sm font-medium">CNPJ<Input name="cnpj" className="mt-1" /></label><label className="text-sm font-medium">Colaboradores<Input name="employeeCount" type="number" min="0" className="mt-1" /></label>
        <label className="text-sm font-medium md:col-span-2">Endereço<Input name="addressLine" className="mt-1" /></label><label className="text-sm font-medium">Número<Input name="number" className="mt-1" /></label><label className="text-sm font-medium">Bairro<Input name="district" className="mt-1" /></label>
        <label className="text-sm font-medium">Cidade<Input name="city" className="mt-1" /></label><label className="text-sm font-medium">UF<Input name="state" maxLength={2} className="mt-1" /></label><label className="text-sm font-medium">CEP<Input name="zipCode" className="mt-1" /></label>
        <div className="md:col-span-2"><Button>Adicionar unidade</Button></div>
      </form></Card>

      <Card><h2 className="font-bold">Novo setor</h2><form action={`/api/companies/${id}/structure`} method="post" className="mt-4 space-y-3"><input type="hidden" name="entityType" value="sector" />
        <label className="block text-sm font-medium">Unidade<select name="establishmentId" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Selecione</option>{company.establishments.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Nome<Input name="name" required className="mt-1" /></label><label className="block text-sm font-medium">Colaboradores<Input name="employeeCount" type="number" min="0" className="mt-1" /></label><label className="block text-sm font-medium">Descrição<Textarea name="description" className="mt-1" /></label><Button>Adicionar setor</Button>
      </form></Card>

      <Card><h2 className="font-bold">Novo GHE</h2><form action={`/api/companies/${id}/structure`} method="post" className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="entityType" value="ghe" />
        <label className="text-sm font-medium md:col-span-2">Setor<select name="sectorId" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Selecione</option>{sectors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.establishmentName} · {item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Código<Input name="code" className="mt-1" /></label><label className="text-sm font-medium">Nome<Input name="name" required className="mt-1" /></label><label className="text-sm font-medium">Colaboradores<Input name="employeeCount" type="number" min="0" className="mt-1" /></label><label className="text-sm font-medium">Turno<Input name="shift" className="mt-1" /></label><label className="text-sm font-medium">Jornada<Input name="workday" className="mt-1" /></label><label className="text-sm font-medium md:col-span-2">Descrição<Textarea name="description" className="mt-1" /></label><div className="md:col-span-2"><Button>Adicionar GHE</Button></div>
      </form></Card>

      <Card><h2 className="font-bold">Nova função ou posto</h2><div className="mt-4 grid gap-5 md:grid-cols-2">
        <form action={`/api/companies/${id}/structure`} method="post" className="space-y-3"><input type="hidden" name="entityType" value="function" /><h3 className="text-sm font-semibold">Função</h3><label className="block text-sm">GHE<select name="gheId" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Selecione</option>{ghes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.establishmentName} · {item.sectorName} · {item.name}</option>)}</select></label><label className="block text-sm">Nome<Input name="name" required className="mt-1" /></label><label className="block text-sm">CBO<Input name="cbo" className="mt-1" /></label><label className="block text-sm">Quantidade<Input name="employeeCount" type="number" min="0" className="mt-1" /></label><label className="block text-sm">Atividades<Textarea name="activities" placeholder="Separar por vírgula" className="mt-1" /></label><Button>Adicionar função</Button></form>
        <form action={`/api/companies/${id}/structure`} method="post" className="space-y-3"><input type="hidden" name="entityType" value="workstation" /><h3 className="text-sm font-semibold">Posto de trabalho</h3><label className="block text-sm">GHE<select name="gheId" required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Selecione</option>{ghes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.establishmentName} · {item.sectorName} · {item.name}</option>)}</select></label><label className="block text-sm">Nome<Input name="name" required className="mt-1" /></label><label className="block text-sm">Descrição<Textarea name="description" className="mt-1" /></label><Button>Adicionar posto</Button></form>
      </div></Card>
    </div>

    <div className="mt-8 space-y-5"><h2 className="text-2xl font-bold">Estrutura cadastrada</h2>{company.establishments.map((establishment) => <Card key={establishment.id}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold">{establishment.name}</h3><StateBadge active={establishment.active} /></div><p className="text-sm text-slate-500">{[establishment.city, establishment.state].filter(Boolean).join(' / ') || 'Endereço não informado'} · {establishment.employeeCount} colaboradores</p></div><details><summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar unidade</summary><form action={`/api/companies/${id}/structure/${establishment.id}`} method="post" className="mt-3 grid max-w-2xl gap-2 md:grid-cols-2"><input type="hidden" name="entityType" value="establishment" /><input type="hidden" name="operation" value="update" /><Input name="name" defaultValue={establishment.name} required /><Input name="cnpj" defaultValue={establishment.cnpj ?? ''} placeholder="CNPJ" /><Input name="addressLine" defaultValue={establishment.addressLine ?? ''} placeholder="Endereço" /><Input name="number" defaultValue={establishment.number ?? ''} placeholder="Número" /><Input name="district" defaultValue={establishment.district ?? ''} placeholder="Bairro" /><Input name="city" defaultValue={establishment.city ?? ''} placeholder="Cidade" /><Input name="state" defaultValue={establishment.state ?? ''} placeholder="UF" /><Input name="zipCode" defaultValue={establishment.zipCode ?? ''} placeholder="CEP" /><Input name="employeeCount" type="number" min="0" defaultValue={establishment.employeeCount} /><Button>Salvar</Button></form><form action={`/api/companies/${id}/structure/${establishment.id}`} method="post" className="mt-2"><input type="hidden" name="entityType" value="establishment" /><input type="hidden" name="operation" value={establishment.active ? 'archive' : 'restore'} /><button className="text-sm text-rose-700">{establishment.active ? 'Arquivar unidade' : 'Reativar unidade'}</button></form></details></div>
      <div className="mt-4 space-y-4">{establishment.sectors.map((sector) => <div key={sector.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h4 className="font-semibold">Setor: {sector.name}</h4><StateBadge active={sector.active} /></div><details><summary className="cursor-pointer text-sm text-brand-700">Editar</summary><form action={`/api/companies/${id}/structure/${sector.id}`} method="post" className="mt-2 grid gap-2 md:grid-cols-2"><input type="hidden" name="entityType" value="sector" /><input type="hidden" name="operation" value="update" /><Input name="name" defaultValue={sector.name} required /><Input name="employeeCount" type="number" min="0" defaultValue={sector.employeeCount} /><Textarea name="description" defaultValue={sector.description ?? ''} className="md:col-span-2" /><Button>Salvar</Button></form><form action={`/api/companies/${id}/structure/${sector.id}`} method="post" className="mt-2"><input type="hidden" name="entityType" value="sector" /><input type="hidden" name="operation" value={sector.active ? 'archive' : 'restore'} /><button className="text-sm text-rose-700">{sector.active ? 'Arquivar' : 'Reativar'}</button></form></details></div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">{sector.ghes.map((ghe) => <div key={ghe.id} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2"><p className="font-semibold">{ghe.code ? `${ghe.code} · ` : ''}{ghe.name}</p><StateBadge active={ghe.active} /></div><p className="text-xs text-slate-500">{ghe.employeeCount} colaboradores{ghe.shift ? ` · ${ghe.shift}` : ''}{ghe.workday ? ` · ${ghe.workday}` : ''}</p><details className="mt-2"><summary className="cursor-pointer text-sm text-brand-700">Editar GHE</summary><form action={`/api/companies/${id}/structure/${ghe.id}`} method="post" className="mt-2 grid gap-2 md:grid-cols-2"><input type="hidden" name="entityType" value="ghe" /><input type="hidden" name="operation" value="update" /><Input name="code" defaultValue={ghe.code ?? ''} placeholder="Código" /><Input name="name" defaultValue={ghe.name} required /><Input name="employeeCount" type="number" min="0" defaultValue={ghe.employeeCount} /><Input name="shift" defaultValue={ghe.shift ?? ''} placeholder="Turno" /><Input name="workday" defaultValue={ghe.workday ?? ''} placeholder="Jornada" /><Textarea name="description" defaultValue={ghe.description ?? ''} className="md:col-span-2" /><Button>Salvar</Button></form><form action={`/api/companies/${id}/structure/${ghe.id}`} method="post" className="mt-2"><input type="hidden" name="entityType" value="ghe" /><input type="hidden" name="operation" value={ghe.active ? 'archive' : 'restore'} /><button className="text-sm text-rose-700">{ghe.active ? 'Arquivar GHE' : 'Reativar GHE'}</button></form></details>
          <div className="mt-3"><p className="text-xs font-semibold uppercase text-slate-500">Funções</p>{ghe.functions.map((item) => <details key={item.id} className="mt-1 rounded-lg border bg-white px-3 py-2"><summary className="cursor-pointer text-sm">{item.name}{item.cbo ? ` · CBO ${item.cbo}` : ''} · {item.employeeCount} <span className={item.active ? 'text-emerald-700' : 'text-slate-400'}>{item.active ? 'ativa' : 'arquivada'}</span></summary><form action={`/api/companies/${id}/structure/${item.id}`} method="post" className="mt-2 grid gap-2"><input type="hidden" name="entityType" value="function" /><input type="hidden" name="operation" value="update" /><Input name="name" defaultValue={item.name} required /><Input name="cbo" defaultValue={item.cbo ?? ''} /><Input name="employeeCount" type="number" min="0" defaultValue={item.employeeCount} /><Textarea name="description" defaultValue={item.description ?? ''} /><Textarea name="activities" defaultValue={activitiesText(item.activities)} /><Button>Salvar</Button></form><form action={`/api/companies/${id}/structure/${item.id}`} method="post" className="mt-2"><input type="hidden" name="entityType" value="function" /><input type="hidden" name="operation" value={item.active ? 'archive' : 'restore'} /><button className="text-xs text-rose-700">{item.active ? 'Arquivar' : 'Reativar'}</button></form></details>)}{!ghe.functions.length && <p className="text-sm text-slate-400">Nenhuma função.</p>}</div>
          <div className="mt-3"><p className="text-xs font-semibold uppercase text-slate-500">Postos</p>{ghe.workstations.map((item) => <details key={item.id} className="mt-1 rounded-lg border bg-white px-3 py-2"><summary className="cursor-pointer text-sm">{item.name} <span className={item.active ? 'text-emerald-700' : 'text-slate-400'}>{item.active ? 'ativo' : 'arquivado'}</span></summary><form action={`/api/companies/${id}/structure/${item.id}`} method="post" className="mt-2 grid gap-2"><input type="hidden" name="entityType" value="workstation" /><input type="hidden" name="operation" value="update" /><Input name="name" defaultValue={item.name} required /><Textarea name="description" defaultValue={item.description ?? ''} /><Button>Salvar</Button></form><form action={`/api/companies/${id}/structure/${item.id}`} method="post" className="mt-2"><input type="hidden" name="entityType" value="workstation" /><input type="hidden" name="operation" value={item.active ? 'archive' : 'restore'} /><button className="text-xs text-rose-700">{item.active ? 'Arquivar' : 'Reativar'}</button></form></details>)}{!ghe.workstations.length && <p className="text-sm text-slate-400">Nenhum posto.</p>}</div>
        </div>)}</div>{!sector.ghes.length && <p className="mt-3 text-sm text-slate-400">Nenhum GHE neste setor.</p>}</div>)}</div>
    </Card>)}{!company.establishments.length && <Card><p className="text-sm text-slate-500">Cadastre a primeira unidade para iniciar a estrutura ocupacional.</p></Card>}</div>
  </div>;
}
