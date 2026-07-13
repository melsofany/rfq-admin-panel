import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();
    if (!access_token) {
      return NextResponse.json({ user: null, admin: null }, { status: 200 });
    }

    const decoded = jwt.verify(access_token, getSecret()) as any;
    if (!decoded || decoded.type !== 'admin') {
      return NextResponse.json({ user: null, admin: null }, { status: 200 });
    }

    return NextResponse.json({
      user: { id: decoded.sub, email: decoded.email },
      admin: { id: decoded.sub, role: decoded.role },
    });
  } catch {
    return NextResponse.json({ user: null, admin: null }, { status: 200 });
  }
}
