import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { Card, Input, Button } from '@/components/ui';

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.userInvite.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true, company: true } });
  const valid = invite && !invite.usedAt && invite.expiresAt > new Date();
  return <main className="shell flex min-h-screen items-center justify-center p-5"><Card className="w-full max-w-md">
    <h1 className="text-2xl font-bold">Ativação de acesso</h1>
    {!valid ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-rose-700">Este convite é inválido, expirou ou já foi utilizado.</p> : <>
      <p className="mt-2 text-sm text-slate-500">{invite.company?.legalName ?? 'Plataforma SST'} · {invite.user.email}</p>
      <form action={`/api/activate/${token}`} method="post" className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Nova senha<Input name="password" type="password" required minLength={10} className="mt-1" /></label>
        <label className="block text-sm font-medium">Confirmar senha<Input name="confirm" type="password" required minLength={10} className="mt-1" /></label>
        <Button className="w-full">Ativar conta</Button>
      </form>
    </>}
  </Card></main>;
}
