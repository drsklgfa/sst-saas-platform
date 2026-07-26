import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default async function PortalNotifications() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  const unread = notifications.filter((notification) => !notification.readAt).length;
  return <main className="shell min-h-screen p-6"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/portal" className="text-sm text-brand-700">← Voltar ao portal</Link><h1 className="mt-1 text-3xl font-bold">Notificações</h1><p className="text-slate-500">Atualizações da consultoria e dos seus planos de ação.</p></div>{unread > 0 && <form action="/api/notifications/read-all" method="post"><input type="hidden" name="returnTo" value="/portal/notifications" /><Button>Marcar todas como lidas</Button></form>}</div>
  <Card className="mt-6 p-0"><div className="divide-y">{notifications.map((notification) => <div key={notification.id} className={`p-4 ${notification.readAt ? '' : 'bg-brand-50/50'}`}><div className="flex flex-wrap justify-between gap-3"><div><div className="flex items-center gap-2"><Badge>{notification.type}</Badge>{!notification.readAt && <Badge tone="warning">Nova</Badge>}<span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span></div><p className="mt-2 font-semibold">{notification.title}</p>{notification.body && <p className="mt-1 text-sm text-slate-600">{notification.body}</p>}</div><div className="flex gap-2">{notification.href && <Link href={notification.href} className="rounded-xl border px-3 py-2 text-sm font-semibold">Abrir</Link>}{!notification.readAt && <form action={`/api/notifications/${notification.id}/read`} method="post"><input type="hidden" name="returnTo" value="/portal/notifications" /><Button>Marcar lida</Button></form>}</div></div></div>)}{!notifications.length && <p className="p-5 text-sm text-slate-500">Nenhuma notificação.</p>}</div></Card></div></main>;
}
