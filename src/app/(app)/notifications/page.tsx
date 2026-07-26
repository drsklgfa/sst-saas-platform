import Link from 'next/link';
import { requireTenant } from '@/lib/auth';
import { db } from '@/lib/db';
import { Badge, Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/utils';

const tone = (type: string): 'neutral' | 'success' | 'warning' | 'danger' => type === 'EVIDENCE' || type === 'ACTION' ? 'warning' : type === 'REPORT' ? 'success' : type === 'JOB' || type === 'SYSTEM' ? 'danger' : 'neutral';

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ unread?: string }> }) {
  const { user } = await requireTenant();
  const query = await searchParams;
  const notifications = await db.notification.findMany({
    where: { userId: user.id, ...(query.unread === '1' ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = notifications.filter((notification) => !notification.readAt).length;
  return <div><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Notificações</h1><p className="text-slate-500">Alertas operacionais, documentos, evidências e mensagens.</p></div><div className="flex gap-2"><Link href={query.unread === '1' ? '/notifications' : '/notifications?unread=1'} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold">{query.unread === '1' ? 'Ver todas' : 'Somente não lidas'}</Link>{unread > 0 && <form action="/api/notifications/read-all" method="post"><input type="hidden" name="returnTo" value="/notifications" /><Button>Marcar todas como lidas</Button></form>}</div></div>
    <Card className="mt-6 p-0"><div className="divide-y">{notifications.map((notification) => <div key={notification.id} className={`p-4 ${notification.readAt ? 'bg-white' : 'bg-brand-50/50'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={tone(notification.type)}>{notification.type}</Badge>{!notification.readAt && <Badge tone="warning">Nova</Badge>}<span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span></div><p className="mt-2 font-semibold">{notification.title}</p>{notification.body && <p className="mt-1 text-sm text-slate-600">{notification.body}</p>}</div><div className="flex gap-2">{notification.href && <Link href={notification.href} className="rounded-xl border px-3 py-2 text-sm font-semibold">Abrir</Link>}{!notification.readAt && <form action={`/api/notifications/${notification.id}/read`} method="post"><input type="hidden" name="returnTo" value="/notifications" /><Button>Marcar lida</Button></form>}</div></div></div>)}{!notifications.length && <p className="p-5 text-sm text-slate-500">Nenhuma notificação encontrada.</p>}</div></Card></div>;
}
