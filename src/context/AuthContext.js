import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

// ── Simple password hashing using Web Crypto API ─────────────
// We use SHA-256 + salt stored in env for client-side comparison
// For production, use bcrypt on a backend server
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = 'VPJ_JAIN_SANGH_SALT_2025';
  const data  = encoder.encode(password + salt);
  const hash  = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export const ROLES = {
  SUPER_ADMIN : 'super_admin',
  VOLUNTEER   : 'volunteer',
  FAMILY_HEAD : 'family_head',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { id, name, email, role, familyId?, vpjId? }
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on app start ──
  useEffect(() => {
    const saved = localStorage.getItem('vpj_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check expiry
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          setUser(parsed.user);
        } else {
          localStorage.removeItem('vpj_session');
        }
      } catch {
        localStorage.removeItem('vpj_session');
      }
    }
    setLoading(false);
  }, []);

  function saveSession(userObj) {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    localStorage.setItem('vpj_session', JSON.stringify({ user: userObj, expiresAt }));
    setUser(userObj);
  }

  // ── SUPER ADMIN LOGIN ──────────────────────────────────────
  const loginAdmin = useCallback(async (email, password) => {
    const hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('admins')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', hash)
      .eq('is_active', true)
      .single();

    if (error || !data) return { success: false, error: 'Invalid email or password' };

    const userObj = { id: data.id, name: data.name, email: data.email, role: ROLES.SUPER_ADMIN };
    saveSession(userObj);
    return { success: true };
  }, []);

  // ── VOLUNTEER LOGIN ────────────────────────────────────────
  const loginVolunteer = useCallback(async (mobile, pin) => {
    const { data, error } = await supabase
      .from('volunteers')
      .select('id, name, mobile, event_access')
      .eq('mobile', mobile.trim())
      .eq('pin', pin.trim())
      .eq('is_active', true)
      .single();

    if (error || !data) return { success: false, error: 'Invalid mobile or PIN' };

    const userObj = {
      id: data.id, name: data.name, mobile: data.mobile,
      role: ROLES.VOLUNTEER, eventAccess: data.event_access || [],
    };
    saveSession(userObj);
    return { success: true };
  }, []);

  // ── FAMILY HEAD LOGIN ──────────────────────────────────────
  const loginFamily = useCallback(async (email, password) => {
    const hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('families')
      .select('id, first_name, middle_name, last_name, login_email, vpj_id, family_number, is_verified')
      .eq('login_email', email.toLowerCase().trim())
      .eq('password_hash', hash)
      .eq('is_active', true)
      .single();

    if (error || !data) return { success: false, error: 'Invalid email or password' };
    if (!data.is_verified) return { success: false, error: 'Your account is pending approval by Admin. Please wait.' };

    const name = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ');
    const userObj = {
      id: data.id, name, email: data.login_email,
      role: ROLES.FAMILY_HEAD, familyId: data.id,
      vpjId: data.vpj_id, familyNumber: data.family_number,
    };
    saveSession(userObj);
    return { success: true };
  }, []);

  // ── FAMILY HEAD SIGNUP ────────────────────────────────────
  const signupFamily = useCallback(async ({ vpjId, mobile, email, password, confirmPassword }) => {
    if (!vpjId || !mobile || !email || !password)
      return { success: false, error: 'All fields are required' };
    if (password !== confirmPassword)
      return { success: false, error: 'Passwords do not match' };
    if (password.length < 6)
      return { success: false, error: 'Password must be at least 6 characters' };

    // Find family by VPJ ID and mobile
    const { data: family, error: fErr } = await supabase
      .from('families')
      .select('id, first_name, last_name, login_email, is_verified')
      .eq('vpj_id', vpjId.toUpperCase().trim())
      .eq('mobile', mobile.trim())
      .eq('is_active', true)
      .single();

    if (fErr || !family)
      return { success: false, error: 'VPJ ID and Mobile do not match our records. Please contact Admin.' };

    if (family.login_email)
      return { success: false, error: 'This family already has an account. Please login or contact Admin.' };

    // Check email not used by another family
    const { data: existing } = await supabase
      .from('families')
      .select('id')
      .eq('login_email', email.toLowerCase().trim());
    if ((existing || []).length > 0)
      return { success: false, error: 'This email is already registered. Please use a different email.' };

    const hash = await hashPassword(password);
    const { error: uErr } = await supabase
      .from('families')
      .update({
        login_email:   email.toLowerCase().trim(),
        password_hash: hash,
        is_verified:   false,  // Admin must approve
      })
      .eq('id', family.id);

    if (uErr) return { success: false, error: uErr.message };

    return {
      success: true,
      message: `Account created for ${family.first_name}! Please wait for Admin approval before you can login.`,
    };
  }, []);

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('vpj_session');
    setUser(null);
  }, []);

  // ── Permission helpers ─────────────────────────────────────
  const isAdmin     = user?.role === ROLES.SUPER_ADMIN;
  const isVolunteer = user?.role === ROLES.VOLUNTEER;
  const isFamilyHead = user?.role === ROLES.FAMILY_HEAD;

  return (
    <AuthContext.Provider value={{
      user, loading,
      loginAdmin, loginVolunteer, loginFamily, signupFamily, logout,
      isAdmin, isVolunteer, isFamilyHead,
      supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
