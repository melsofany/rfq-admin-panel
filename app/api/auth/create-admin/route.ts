import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.slice(7);
  let decoded: any;
  try {
    decoded = jwt.verify(token, getSecret()) as any;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (decoded.type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO saas_admins (email, password_hash, role) VALUES ($1, $2, $3)',
      [email.toLowerCase(), passwordHash, 'admin']
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('duplicate')) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
