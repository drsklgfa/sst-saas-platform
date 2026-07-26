import { publicAppUrl } from '@/lib/public-url';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { safeReturnTo } from '@/domain/communication/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const form = await request.formData();
  const notification = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!notification) return new Response('Notificação não encontrada', { status: 404 });
  await db.notification.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
  const returnTo = safeReturnTo(form.get('returnTo'), notification.href ?? (user.memberships.length ? '/notifications' : '/portal/notifications'));
  return NextResponse.redirect(publicAppUrl(returnTo), 303);
}
