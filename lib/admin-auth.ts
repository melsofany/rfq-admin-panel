'use client';

const TOKEN_KEY = 'admin_access_token';
const USER_KEY = 'admin_user';
const ADMIN_KEY = 'admin_role';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminRole {
  id: string;
  role: string;
}

function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  const adminStr = localStorage.getItem(ADMIN_KEY);
  if (!accessToken) return null;
  return {
    accessToken,
    user: userStr ? JSON.parse(userStr) : null,
    admin: adminStr ? JSON.parse(adminStr) : null,
  };
}

function storeSession(accessToken: string, user: AdminUser, admin: AdminRole) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

function edgeUrl(action: string) {
  return `${SUPABASE_URL}/functions/v1/admin-auth/${action}`;
}

function edgeHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(edgeUrl('login'), {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (data.error) throw new Error(data.error);

  storeSession(data.session.access_token, data.user, data.admin);
  return data;
}

export async function adminGetSession(): Promise<{ user: AdminUser | null; admin: AdminRole | null }> {
  const stored = getStoredTokens();
  if (!stored) return { user: null, admin: null };

  try {
    const res = await fetch(edgeUrl('session'), {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({ access_token: stored.accessToken }),
    });

    if (!res.ok) {
      clearSession();
      return { user: null, admin: null };
    }

    const data = await res.json();
    if (!data.user) {
      clearSession();
      return { user: null, admin: null };
    }

    return { user: data.user, admin: data.admin };
  } catch {
    clearSession();
    return { user: null, admin: null };
  }
}

export async function adminRefreshToken(): Promise<string | null> {
  return getAccessToken();
}

export async function adminLogout() {
  try {
    await fetch(edgeUrl('logout'), {
      method: 'POST',
      headers: edgeHeaders(),
    });
  } catch {}
  clearSession();
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function getStoredAdmin(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  const adminStr = localStorage.getItem(ADMIN_KEY);
  return adminStr ? JSON.parse(adminStr) : null;
}
