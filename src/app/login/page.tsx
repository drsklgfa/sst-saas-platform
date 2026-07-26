import { Button, Card, Input } from '@/components/ui';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="shell flex min-h-screen items-center justify-center p-5">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Acesso à plataforma</h1>
        <p className="mt-1 text-sm text-slate-500">Use sua conta de consultoria ou empresa.</p>
        {query.error && (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            E-mail ou senha inválidos.
          </p>
        )}
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            E-mail
            <Input name="email" type="email" autoComplete="email" required className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1"
            />
          </label>
          <Button className="w-full">Entrar</Button>
        </form>
      </Card>
    </main>
  );
}
