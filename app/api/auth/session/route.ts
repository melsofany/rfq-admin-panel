import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rfq-admin-secret-key-2026-change-in-production';

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();
    if (!access_token) {
      return NextResponse.json({ user: null, admin: null }, { status: 200 });
    }

    const decoded = jwt.verify(access_token, JWT_SECRET) as any;
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
