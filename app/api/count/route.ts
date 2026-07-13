import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rfq-admin-secret-key-2026-change-in-production';

function verifyToken(req: NextRequest): any | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  if (!table) return NextResponse.json({ error: 'Table required' }, { status: 400 });

  const allowedTables = [
    'saas_admins', 'subscription_plans', 'subscriptions',
    'organizations', 'organization_members',
    'suppliers', 'supplier_categories', 'items',
    'rfqs', 'rfq_items', 'sent_log', 'offers', 'offer_items',
    'purchase_orders', 'purchase_order_items',
    'audit_log', 'company_settings',
  ];
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  let sql = `SELECT COUNT(*) as count FROM ${table} WHERE 1=1`;
  const params: any[] = [];
  let idx = 1;

  const eqParam = searchParams.get('eq');
  if (eqParam) {
    const eqs = eqParam.split(',');
    for (const e of eqs) {
      const [col, val] = e.split('=');
      if (col && val) {
        sql += ` AND ${col} = $${idx++}`;
        params.push(val);
      }
    }
  }

  try {
    const result = await query(sql, params);
    return NextResponse.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
