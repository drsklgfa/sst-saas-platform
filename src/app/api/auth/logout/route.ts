import { destroySession } from '@/lib/auth';
import { publicAppUrl } from '@/lib/public-url';
import { NextResponse } from 'next/server';

export async function POST() {
  await destroySession();
  return NextResponse.redirect(publicAppUrl('/login'), 303);
}
