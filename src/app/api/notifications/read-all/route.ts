import { publicAppUrl } from '@/lib/public-url';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { safeReturnTo } from '@/domain/communication/validation';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Não autenticado', { status: 401 });
  const form = await request.formData();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  const returnTo = safeReturnTo(form.get('returnTo'), user.memberships.length ? '/notifications' : '/portal/notifications');
  return NextResponse.redirect(publicAppUrl(returnTo), 303);
}
