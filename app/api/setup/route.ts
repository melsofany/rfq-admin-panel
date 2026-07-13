import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { setup_key } = await req.json();
    if (setup_key !== 'init-db-2026') {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    const errors: string[] = [];

    const statements = [
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        price numeric(10,2) NOT NULL DEFAULT 0,
        max_suppliers int NOT NULL DEFAULT 50,
        max_rfqs int NOT NULL DEFAULT 100,
        max_users int NOT NULL DEFAULT 5,
        features jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid,
        plan_id uuid REFERENCES subscription_plans(id),
        status text NOT NULL DEFAULT 'active',
        billing_cycle text DEFAULT 'monthly',
        current_period_end timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS saas_admins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'super_admin',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        name_ar text,
        slug text NOT NULL UNIQUE,
        phone text,
        address text,
        country text DEFAULT 'Egypt',
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS organization_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'purchasing',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name text NOT NULL,
        name_ar text,
        email text,
        phone text,
        address text,
        category text,
        contact_person text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS supplier_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name text NOT NULL,
        part_no text,
        description text,
        uom text DEFAULT 'piece',
        reference_price numeric(15,4),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS rfqs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        rfq_no text NOT NULL,
        title text,
        status text NOT NULL DEFAULT 'draft',
        close_date timestamptz,
        notes text,
        created_by uuid REFERENCES organization_members(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS rfq_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
        item_id text,
        line_item text,
        part_no text,
        description text NOT NULL,
        uom text,
        qty numeric(15,4),
        reference_price numeric(15,4),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS sent_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
        supplier_id uuid NOT NULL REFERENCES suppliers(id),
        sent_by uuid REFERENCES organization_members(id),
        token text NOT NULL UNIQUE,
        close_date text,
        link_opened boolean NOT NULL DEFAULT false,
        open_count int NOT NULL DEFAULT 0,
        first_opened_at timestamptz,
        last_opened_at timestamptz,
        offer_submitted boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS offers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
        supplier_id uuid NOT NULL REFERENCES suppliers(id),
        sent_log_id uuid REFERENCES sent_log(id),
        submitted_by uuid REFERENCES organization_members(id),
        total_price numeric(15,4),
        general_notes text,
        status text NOT NULL DEFAULT 'submitted',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS offer_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        rfq_item_id uuid NOT NULL REFERENCES rfq_items(id),
        price numeric(15,4) NOT NULL,
        tax_included boolean NOT NULL DEFAULT false,
        delivery_time text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        po_no text NOT NULL,
        rfq_id uuid REFERENCES rfqs(id),
        offer_id uuid REFERENCES offers(id),
        supplier_id uuid REFERENCES suppliers(id),
        status text NOT NULL DEFAULT 'draft',
        total_amount numeric(15,4),
        notes text,
        created_by uuid REFERENCES organization_members(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        rfq_item_id uuid REFERENCES rfq_items(id),
        description text NOT NULL,
        qty numeric(15,4) NOT NULL DEFAULT 1,
        uom text,
        unit_price numeric(15,4) NOT NULL DEFAULT 0,
        total_price numeric(15,4) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid,
        action text NOT NULL,
        entity_type text,
        entity_id uuid,
        details jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS company_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        logo_url text,
        primary_color text DEFAULT '#2563eb',
        currency text DEFAULT 'USD',
        tax_rate numeric(5,2) DEFAULT 0,
        email_notifications boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,

      `CREATE TABLE IF NOT EXISTS org_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        full_name text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    ];

    for (const stmt of statements) {
      try {
        await query(stmt);
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          errors.push(err.message);
        }
      }
    }

    // Insert default subscription plans
    try {
      await query(`
        INSERT INTO subscription_plans (name, slug, price, max_suppliers, max_rfqs, max_users, features)
        VALUES
          ('Free', 'free', 0, 10, 20, 2, '["Basic RFQ management","Up to 10 suppliers","2 team members"]'),
          ('Pro', 'pro', 49, 100, 500, 10, '["Unlimited RFQs","Up to 100 suppliers","10 team members","Analytics","Custom branding"]'),
          ('Enterprise', 'enterprise', 199, 999999, 999999, 999999, '["Everything in Pro","Unlimited suppliers","Unlimited users","Priority support","API access","Custom integrations"]')
        ON CONFLICT (slug) DO NOTHING
      `);
    } catch (err: any) {
      errors.push(`Plans: ${err.message}`);
    }

    // Insert default admin user
    try {
      const passwordHash = await bcrypt.hash('Admin2026!', 10);
      await query(`
        INSERT INTO saas_admins (email, password_hash, role)
        VALUES ('admin@rfqmanager.com', $1, 'super_admin')
        ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_active = true
      `, [passwordHash]);
    } catch (err: any) {
      errors.push(`Admin: ${err.message}`);
    }

    return NextResponse.json({
      success: true,
      errors: errors.length > 0 ? errors : undefined,
      message: 'Database initialized successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
