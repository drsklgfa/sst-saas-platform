import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function VerifyDocumentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const document = await db.document.findUnique({
    where: { verificationCode: code },
    include: { company: { select: { legalName: true, tradeName: true, cnpj: true } }, documentType: true },
  });
  if (!document?.releasedToCompany || !document.releasedVersion) notFound();
  const version = await db.documentVersion.findUnique({
    where: { documentId_version: { documentId: document.id, version: document.releasedVersion } },
    include: {
      snapshot: true,
      signatures: { where: { signedAt: { not: null } }, orderBy: { signedAt: 'asc' } },
      auditRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      files: { where: { official: true }, include: { fileObject: { select: { sha256: true, originalName: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!version?.snapshot) notFound();
  const official = version.files[0];
  const audit = version.auditRuns[0];

  return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl"><div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><p className="text-sm font-semibold text-brand-700">Verificação pública de integridade</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Documento válido no sistema</h1><p className="mt-2 text-slate-500">Esta página confirma metadados e integridade. O conteúdo técnico e os dados protegidos não são públicos.</p>
    <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Documento</dt><dd className="font-semibold">{document.title}</dd></div><div><dt className="text-slate-500">Tipo</dt><dd className="font-semibold">{document.documentType.name}</dd></div><div><dt className="text-slate-500">Empresa</dt><dd className="font-semibold">{document.company.tradeName ?? document.company.legalName}</dd></div><div><dt className="text-slate-500">CNPJ</dt><dd className="font-semibold">{document.company.cnpj ?? 'Não informado'}</dd></div><div><dt className="text-slate-500">Revisão liberada</dt><dd className="font-semibold">{version.version}</dd></div><div><dt className="text-slate-500">Situação</dt><dd className="font-semibold">{version.status}</dd></div><div><dt className="text-slate-500">Emissão</dt><dd className="font-semibold">{version.issuedAt ? new Date(version.issuedAt).toLocaleString('pt-BR') : 'Não informada'}</dd></div><div><dt className="text-slate-500">Auditoria</dt><dd className="font-semibold">{audit?.status ?? 'Não registrada'}</dd></div></dl>
    <div className="mt-7 rounded-2xl bg-slate-100 p-4 text-xs text-slate-600"><strong>Hash do snapshot</strong><p className="mt-1 break-all font-mono">{version.snapshot.dataHash}</p>{official && <><strong className="mt-3 block">Hash do arquivo oficial</strong><p className="mt-1 break-all font-mono">{official.fileObject.sha256}</p><p className="mt-1">{official.fileObject.originalName}</p></>}</div>
    <div className="mt-7"><h2 className="font-bold">Responsáveis registrados</h2>{version.signatures.length ? <div className="mt-3 space-y-2">{version.signatures.map((signature) => <div key={signature.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{signature.signerName}</strong><br /><span className="text-slate-500">{signature.signerRegistration ?? 'Registro não informado'} · {signature.signatureRole} · {signature.method}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Documento emitido sem assinatura registrada.</p>}</div>
  </div></div></main>;
}
