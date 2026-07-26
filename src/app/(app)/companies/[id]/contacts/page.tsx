import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card, Input } from '@/components/ui';
import { whatsappUrl } from '@/lib/phone';

export default async function ContactsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const { id } = await params;
  const feedback = await searchParams;
  const { tenant } = await requireTenantPermission('company.write');
  const company = await db.company.findFirst({ where: { id, tenantId: tenant.id }, include: { contacts: { orderBy: [{ active: 'desc' }, { isPrimary: 'desc' }, { name: 'asc' }] } } });
  if (!company) notFound();
  return <div className="max-w-6xl"><h1 className="text-3xl font-bold">Contatos da empresa</h1><p className="text-slate-500">{company.tradeName ?? company.legalName}</p>
    {(feedback.created || feedback.updated) && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Contato salvo com sucesso.</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card><h2 className="font-bold">Novo contato</h2><form action={`/api/companies/${company.id}/contacts`} method="post" className="mt-4 space-y-4"><input type="hidden" name="operation" value="create" />
        <label className="block text-sm font-medium">Nome<Input name="name" required className="mt-1" /></label>
        <label className="block text-sm font-medium">Cargo<Input name="role" className="mt-1" /></label>
        <label className="block text-sm font-medium">E-mail<Input name="email" type="email" className="mt-1" /></label>
        <label className="block text-sm font-medium">Celular<Input name="phone" placeholder="(16) 99999-9999" className="mt-1" /></label>
        <label className="block text-sm font-medium">Canal preferido<select name="preferredChannel" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Não informado</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option><option value="PHONE">Telefone</option><option value="PORTAL">Portal</option></select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasWhatsapp" value="true" /> Possui WhatsApp</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" value="true" /> Contato principal</label>
        <Button className="w-full">Salvar contato</Button>
      </form></Card>
      <Card><h2 className="font-bold">Contatos cadastrados</h2><div className="mt-3 divide-y">{company.contacts.map((contact) => <div key={contact.id} className={!contact.active ? 'py-4 opacity-60' : 'py-4'}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-medium">{contact.name}</p>{contact.isPrimary && <Badge tone="success">Principal</Badge>}{!contact.active && <Badge>Arquivado</Badge>}</div><p className="text-sm text-slate-500">{contact.role ?? 'Sem cargo'}{contact.email ? ` · ${contact.email}` : ''}{contact.phoneDisplay ? ` · ${contact.phoneDisplay}` : ''}{contact.preferredChannel ? ` · ${contact.preferredChannel}` : ''}</p></div><div className="flex gap-2">{contact.active && contact.hasWhatsapp && contact.phoneE164 && <a className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" href={whatsappUrl(contact.phoneE164, `Olá, ${contact.name}. Estou entrando em contato pela Plataforma SST sobre a empresa ${company.tradeName ?? company.legalName}.`)} target="_blank" rel="noreferrer">WhatsApp</a>}</div></div>
          <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar contato</summary><form action={`/api/companies/${company.id}/contacts`} method="post" className="mt-3 grid gap-2 md:grid-cols-2"><input type="hidden" name="operation" value="update" /><input type="hidden" name="contactId" value={contact.id} /><Input name="name" defaultValue={contact.name} required /><Input name="role" defaultValue={contact.role ?? ''} placeholder="Cargo" /><Input name="email" type="email" defaultValue={contact.email ?? ''} placeholder="E-mail" /><Input name="phone" defaultValue={contact.phoneDisplay ?? ''} placeholder="Telefone" /><select name="preferredChannel" defaultValue={contact.preferredChannel ?? ''} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Não informado</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option><option value="PHONE">Telefone</option><option value="PORTAL">Portal</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasWhatsapp" value="true" defaultChecked={contact.hasWhatsapp} /> WhatsApp</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" value="true" defaultChecked={contact.isPrimary} /> Principal</label><Button>Salvar alterações</Button></form><form action={`/api/companies/${company.id}/contacts`} method="post" className="mt-2"><input type="hidden" name="contactId" value={contact.id} /><input type="hidden" name="operation" value={contact.active ? 'archive' : 'restore'} /><button className="text-sm text-rose-700">{contact.active ? 'Arquivar contato' : 'Reativar contato'}</button></form></details>
        </div>)}{!company.contacts.length && <p className="py-4 text-sm text-slate-500">Nenhum contato cadastrado.</p>}</div></Card>
    </div>
  </div>;
}
