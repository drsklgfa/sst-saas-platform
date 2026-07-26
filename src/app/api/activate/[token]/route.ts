import { publicAppUrl } from '@/lib/public-url';
import argon2 from 'argon2';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { createSession, landingPageFor } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rate = checkRateLimit(`activate:${requestAddress(request.headers)}:${token.slice(0, 12)}`, 8, 15 * 60_000);
  if (!rate.allowed) return new Response('Muitas tentativas.', { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } });
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password.length < 10 || password !== confirm) return new Response('Senhas inválidas ou diferentes', { status: 400 });
  const invite = await db.userInvite.findUnique({ where: { tokenHash: sha256(token) } });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return new Response('Convite inválido', { status: 410 });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.$transaction([
    db.user.update({ where: { id: invite.userId }, data: { passwordHash, active: true } }),
    db.userInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: invite.userId } })
  ]);
  await createSession(invite.userId);
  const activatedUser = await db.user.findUniqueOrThrow({ where: { id: invite.userId }, include: { memberships: { where: { active: true }, include: { tenant: true } }, companyAccesses: { where: { active: true, company: { status: 'ACTIVE' } }, include: { company: true } } } });
  return NextResponse.redirect(publicAppUrl(landingPageFor(activatedUser)), 303);
}
