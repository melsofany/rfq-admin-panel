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

  const select = searchParams.get('select') || '*';
  const orderCol = searchParams.get('order');
  const orderDir = searchParams.get('dir') || 'asc';
  const limit = searchParams.get('limit');

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

  let sql = `SELECT ${select} FROM ${table} WHERE 1=1`;
  const params: any[] = [];
  let paramIdx = 1;

  const eqParam = searchParams.get('eq');
  if (eqParam) {
    const eqs = eqParam.split(',');
    for (const e of eqs) {
      const [col, val] = e.split('=');
      if (col && val) {
        sql += ` AND ${col} = $${paramIdx++}`;
        params.push(val);
      }
    }
  }

  if (orderCol) {
    sql += ` ORDER BY ${orderCol} ${orderDir === 'desc' ? 'DESC' : 'ASC'}`;
  }

  if (limit) {
    sql += ` LIMIT ${parseInt(limit, 10) || 100}`;
  }

  try {
    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table, data } = await req.json();
  if (!table || !data) return NextResponse.json({ error: 'Table and data required' }, { status: 400 });

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

  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const colList = cols.join(', ');

  try {
    const result = await query(
      `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) RETURNING *`,
      vals
    );
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { table, data, eq } = await req.json();
  if (!table || !data || !eq) return NextResponse.json({ error: 'Table, data, and eq required' }, { status: 400 });

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

  const setCols = Object.keys(data);
  const setVals = Object.values(data);
  const setClause = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');

  const eqCols = Object.keys(eq);
  const eqVals = Object.values(eq);
  const whereClause = eqCols.map((c, i) => `${c} = $${setVals.length + i + 1}`).join(' AND ');

  try {
    const result = await query(
      `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
      [...setVals, ...eqVals]
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
  const eqParam = searchParams.get('eq');

  if (!table || !eqParam) return NextResponse.json({ error: 'Table and eq required' }, { status: 400 });

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

  const eqs = eqParam.split(',');
  const whereParts: string[] = [];
  const params: any[] = [];
  let idx = 1;
  for (const e of eqs) {
    const [col, val] = e.split('=');
    if (col && val) {
      whereParts.push(`${col} = $${idx++}`);
      params.push(val);
    }
  }

  try {
    await query(`DELETE FROM ${table} WHERE ${whereParts.join(' AND ')}`, params);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
