import { publicAppUrl } from '@/lib/public-url';
import { db } from '@/lib/db';
import { createSession, landingPageFor, verifyPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const rate = checkRateLimit(`login:${requestAddress(request.headers)}:${email}`, 10, 15 * 60_000);
  if (!rate.allowed) return new Response('Muitas tentativas. Tente novamente mais tarde.', { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } });
  const user = await db.user.findUnique({ where: { email }, include: { memberships: { where: { active: true }, include: { tenant: true } }, companyAccesses: { where: { active: true, company: { status: 'ACTIVE' } }, include: { company: true } } } });
  if (!user?.passwordHash || !user.active || !(await verifyPassword(user.passwordHash, password))) return NextResponse.redirect(publicAppUrl('/login?error=1'), 303);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return NextResponse.redirect(publicAppUrl(landingPageFor(user)), 303);
}
