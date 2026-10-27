'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './client';
import { Profile, UserRole, Plan } from '../types';

const LOCAL_ACCOUNTS_KEY = 'financo_user_accounts_v1';
const ACTIVE_LOCAL_USER_KEY = 'financo_active_local_user_v1';
const DEMO_SESSION_KEY = 'financo-demo-session';

const DEMO_USER: Pick<User, 'id' | 'email'> = {
  id: 'demo-user',
  email: 'demo@financo.app',
};

const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  email: DEMO_USER.email || '',
  full_name: 'Usuario Demo',
  role: 'owner',
  plan: 'profesional',
  two_factor_enabled: false,
  trial_ends_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  data_consent_accepted: true,
  data_consent_at: '2026-01-01T00:00:00.000Z',
  data_consent_version: 'Ley1581-2026-v1',
  data_consent_ip: '127.0.0.1 (Demo)',
  data_consent_user_agent: 'Financo Demo Agent',
};

interface StoredAccount {
  id: string;
  email: string;
  password: string; // stored privately in client storage
  full_name: string;
  role: UserRole;
  plan: Plan;
  created_at: string;
  data_consent_accepted?: boolean;
  data_consent_at?: string;
  data_consent_version?: string;
  data_consent_ip?: string;
  data_consent_user_agent?: string;
}

const PRECONFIGURED_USERS: StoredAccount[] = [
  {
    id: 'user-rodolfo-pastrana',
    email: 'rodolfo.pastrana@andina.com',
    password: 'Rodolfo2026*',
    full_name: 'Rodolfo Pastrana',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
    data_consent_accepted: true,
    data_consent_at: '2026-01-01T00:00:00.000Z',
    data_consent_version: 'Ley1581-2026-v1',
  },
  {
    id: 'user-sthefanie-caraballo',
    email: 'sthefanie.caraballo@andina.com',
    password: 'Sthefanie2026*',
    full_name: 'Sthefanie Caraballo',
    role: 'auditor',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
    data_consent_accepted: true,
    data_consent_at: '2026-01-01T00:00:00.000Z',
    data_consent_version: 'Ley1581-2026-v1',
  },
  // Common aliases for Sthefanie (with or without 'h')
  {
    id: 'user-sthefanie-caraballo-alt1',
    email: 'sthefanie@andina.com',
    password: 'Sthefanie2026*',
    full_name: 'Sthefanie Caraballo',
    role: 'auditor',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-sthefanie-caraballo-alt2',
    email: 'stefanie.caraballo@andina.com',
    password: 'Sthefanie2026*',
    full_name: 'Sthefanie Caraballo',
    role: 'auditor',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-sthefanie-caraballo-alt3',
    email: 'stefanie@andina.com',
    password: 'Sthefanie2026*',
    full_name: 'Sthefanie Caraballo',
    role: 'auditor',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  // Common alias for Rodolfo
  {
    id: 'user-rodolfo-pastrana-alt1',
    email: 'rodolfo@andina.com',
    password: 'Rodolfo2026*',
    full_name: 'Rodolfo Pastrana',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  // Ruby Fernandez
  {
    id: 'user-ruby-fernandez',
    email: 'ruby.fernandez@andina.com',
    password: 'Ruby2026*',
    full_name: 'Ruby Fernandez',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
    data_consent_accepted: true,
    data_consent_at: '2026-01-01T00:00:00.000Z',
    data_consent_version: 'Ley1581-2026-v1',
  },
  {
    id: 'user-ruby-fernandez-alt1',
    email: 'ruby@andina.com',
    password: 'Ruby2026*',
    full_name: 'Ruby Fernandez',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-ruby-fernandez-alt2',
    email: 'ruby.fernandez@financo.co',
    password: 'Ruby2026*',
    full_name: 'Ruby Fernandez',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-ruby-fernandez-alt3',
    email: 'rubyfernandez@gmail.com',
    password: 'Ruby2026*',
    full_name: 'Ruby Fernandez',
    role: 'accountant',
    plan: 'profesional',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// In-memory fallback in case localStorage is blocked (Safari Private Browsing, Firefox Strict Tracking, Chrome incognito iframe)
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return memoryStorage[key] ?? null;
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
      return memoryStorage[key] ?? null;
    } catch {
      return memoryStorage[key] ?? null;
    }
  },
  setItem: (key: string, value: string): void => {
    memoryStorage[key] = value;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage access blocked or quota exceeded; memoryStorage retains state
    }
  },
  removeItem: (key: string): void => {
    delete memoryStorage[key];
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = safeStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const existing: StoredAccount[] = raw ? JSON.parse(raw) : [];

    // Ensure all preconfigured accounts exist and are refreshed
    for (const pre of PRECONFIGURED_USERS) {
      const idx = existing.findIndex((acc) => acc.email.toLowerCase() === pre.email.toLowerCase());
      if (idx === -1) {
        existing.push(pre);
      } else if (!existing[idx].password) {
        existing[idx] = pre;
      }
    }
    return existing;
  } catch {
    return PRECONFIGURED_USERS;
  }
}

function saveAccount(acc: StoredAccount) {
  try {
    const accounts = getStoredAccounts();
    const index = accounts.findIndex((a) => a.email.toLowerCase() === acc.email.toLowerCase());
    if (index >= 0) {
      accounts[index] = acc;
    } else {
      accounts.push(acc);
    }
    safeStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage errors
  }
}

interface AuthContextValue {
  user: Pick<User, 'id' | 'email'> | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  startDemo: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole,
    consentMetadata?: {
      accepted?: boolean;
      version?: string;
      ip?: string;
      userAgent?: string;
    }
  ) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  recoverPassword: (email: string, newPassword: string) => Promise<{ error: string | null; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isDemo: false,
  startDemo: () => {},
  signIn: async () => ({ error: 'not implemented' }),
  signUp: async () => ({ error: 'not implemented' }),
  changePassword: async () => ({ error: 'not implemented' }),
  recoverPassword: async () => ({ error: 'not implemented' }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Pick<User, 'id' | 'email'> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return url.length > 0 && !url.includes('placeholder-project');
  };

  const fetchProfile = async (uid: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, plan, two_factor_enabled, trial_ends_at, created_at')
        .eq('id', uid)
        .maybeSingle();
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // Supabase unavailable
    }
  };

  const restoreDemoSession = () => {
    setIsDemo(true);
    setSession(null);
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
    setLoading(false);
  };

  const setLocalUserSession = (acc: StoredAccount) => {
    const usr = { id: acc.id, email: acc.email };
    const prof: Profile = {
      id: acc.id,
      email: acc.email,
      full_name: acc.full_name,
      role: acc.role,
      plan: acc.plan,
      two_factor_enabled: false,
      trial_ends_at: null,
      created_at: acc.created_at,
      data_consent_accepted: acc.data_consent_accepted ?? true,
      data_consent_at: acc.data_consent_at ?? acc.created_at,
      data_consent_version: acc.data_consent_version ?? 'Ley1581-2026-v1',
      data_consent_ip: acc.data_consent_ip ?? '127.0.0.1 (Local Session)',
      data_consent_user_agent: acc.data_consent_user_agent ?? 'Financo Client Secure',
    };
    setIsDemo(false);
    setUser(usr);
    setProfile(prof);
    setSession(null);
    safeStorage.removeItem(DEMO_SESSION_KEY);
    safeStorage.setItem(ACTIVE_LOCAL_USER_KEY, JSON.stringify({ user: usr, profile: prof }));
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Check if demo mode was explicitly chosen
    if (safeStorage.getItem(DEMO_SESSION_KEY)) {
      restoreDemoSession();
      return;
    }

    // 2. Check if a local private account is logged in
    const activeLocal = safeStorage.getItem(ACTIVE_LOCAL_USER_KEY);
    if (activeLocal) {
      try {
        const parsed = JSON.parse(activeLocal);
        if (parsed?.user && parsed?.profile) {
          setIsDemo(false);
          setUser(parsed.user);
          setProfile(parsed.profile);
          setLoading(false);
          return;
        }
      } catch {
        // Continue
      }
    }

    // 3. Check Supabase session if configured
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return;
        setIsDemo(false);
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id).finally(() => mounted && setLoading(false));
        } else {
          setLoading(false);
        }
      }).catch(() => {
        if (mounted) setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
        if (!mounted) return;
        setIsDemo(false);
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id).finally(() => mounted && setLoading(false));
        } else {
          setProfile(null);
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDemo = () => {
    safeStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
    safeStorage.setItem(DEMO_SESSION_KEY, 'true');
    restoreDemoSession();
  };

  const signIn = async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Check local accounts first (exact email, alias, or username)
    const stored = getStoredAccounts();
    const cleanInput = trimmedEmail.replace(/^(https?:\/\/)?/i, '').trim();

    // Check if input is referring to Sthefanie, Rodolfo, or Ruby
    const isSthefanie =
      cleanInput.includes('sthefanie') ||
      cleanInput.includes('stefanie') ||
      cleanInput.includes('caraballo');
    const isRodolfo =
      cleanInput.includes('rodolfo') ||
      cleanInput.includes('pastrana');
    const isRuby =
      cleanInput.includes('ruby') ||
      cleanInput.includes('fernandez');

    let match = stored.find((a) => {
      const accEmail = a.email.toLowerCase();
      const accUsername = accEmail.split('@')[0];
      return (
        accEmail === cleanInput ||
        accUsername === cleanInput ||
        a.full_name.toLowerCase().includes(cleanInput)
      );
    });

    if (!match && isSthefanie) {
      match = stored.find((a) => a.email.includes('sthefanie')) || PRECONFIGURED_USERS[1];
    }
    if (!match && isRodolfo) {
      match = stored.find((a) => a.email.includes('rodolfo')) || PRECONFIGURED_USERS[0];
    }
    if (!match && isRuby) {
      match = stored.find((a) => a.email.includes('ruby')) || PRECONFIGURED_USERS.find((u) => u.id === 'user-ruby-fernandez');
    }

    if (match) {
      // Compare password: exact, or case-insensitive, or without trailing asterisk
      const isCorrectPassword =
        match.password === cleanPassword ||
        match.password.toLowerCase() === cleanPassword.toLowerCase() ||
        match.password.replace(/\*$/, '') === cleanPassword.replace(/\*$/, '') ||
        match.password.toLowerCase().replace(/\*$/, '') === cleanPassword.toLowerCase().replace(/\*$/, '');

      if (isCorrectPassword) {
        setLocalUserSession(match);
        return { error: null };
      } else {
        return { error: 'Contraseña incorrecta. Por favor verifica tus datos o escribe tu clave asignada.' };
      }
    }

    // If Supabase is configured, attempt Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: cleanPassword });
        return { error: error?.message ?? null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Error al conectar con el servidor.' };
      }
    }

    return { error: 'No existe una cuenta registrada con este correo. Por favor crea tu cuenta privada.' };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'accountant',
    consentMetadata?: {
      accepted?: boolean;
      version?: string;
      ip?: string;
      userAgent?: string;
    }
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    const stored = getStoredAccounts();

    if (stored.some((a) => a.email.toLowerCase() === trimmedEmail)) {
      return { error: 'Ya existe una cuenta registrada con este correo electrónico.' };
    }

    const consentAccepted = consentMetadata?.accepted ?? true;
    const consentTimestamp = new Date().toISOString();
    const consentVersion = consentMetadata?.version || 'Ley1581-2026-v1';
    const consentUserAgent = consentMetadata?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser');
    const consentIp = consentMetadata?.ip || '127.0.0.1 (Registro Directo)';

    // Create private account with Habeas Data consent audit trail
    const newAcc: StoredAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: trimmedEmail,
      password,
      full_name: fullName.trim() || 'Usuario',
      role,
      plan: 'profesional',
      created_at: consentTimestamp,
      data_consent_accepted: consentAccepted,
      data_consent_at: consentTimestamp,
      data_consent_version: consentVersion,
      data_consent_ip: consentIp,
      data_consent_user_agent: consentUserAgent,
    };

    saveAccount(newAcc);
    setLocalUserSession(newAcc);

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              data_consent_accepted: consentAccepted,
              data_consent_at: consentTimestamp,
              data_consent_version: consentVersion,
            },
          },
        });
      } catch {
        // Ignore mirror failure in hybrid mode
      }
    }

    return { error: null };
  };

  const changePassword = async (newPassword: string) => {
    if (!user) return { error: 'No has iniciado sesión' };
    if (newPassword.length < 6) return { error: 'La nueva contraseña debe tener al menos 6 caracteres' };

    const stored = getStoredAccounts();
    const index = stored.findIndex((a) => a.email.toLowerCase() === (user.email || '').toLowerCase());
    if (index >= 0) {
      stored[index].password = newPassword;
      safeStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(stored));
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { error: error.message };
      } catch {
        // Ignore
      }
    }

    return { error: null };
  };

  const recoverPassword = async (email: string, newPassword: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { error: 'Por favor ingresa un correo electrónico válido' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: 'La nueva contraseña debe tener al menos 6 caracteres' };
    }

    const stored = getStoredAccounts();
    const cleanInput = trimmedEmail.replace(/^(https?:\/\/)?/i, '').trim();

    const isSthefanie = cleanInput.includes('sthefanie') || cleanInput.includes('stefanie') || cleanInput.includes('caraballo');
    const isRodolfo = cleanInput.includes('rodolfo') || cleanInput.includes('pastrana');

    let index = stored.findIndex((a) => {
      const accEmail = a.email.toLowerCase();
      const accUsername = accEmail.split('@')[0];
      return accEmail === cleanInput || accUsername === cleanInput;
    });

    if (index === -1 && isSthefanie) {
      index = stored.findIndex((a) => a.email.includes('sthefanie'));
    }
    if (index === -1 && isRodolfo) {
      index = stored.findIndex((a) => a.email.includes('rodolfo'));
    }

    if (index >= 0) {
      stored[index].password = newPassword;
      safeStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(stored));

      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.resetPasswordForEmail(trimmedEmail);
        } catch {
          // Ignore
        }
      }

      return {
        error: null,
        message: `Contraseña actualizada con éxito para ${stored[index].full_name}. Ya puedes ingresar con tu nueva clave.`,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
        if (error) return { error: error.message };
        return { error: null, message: 'Hemos enviado un enlace de recuperación a tu correo electrónico.' };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Error al conectar con el servidor.' };
      }
    }

    return { error: 'No se encontró ninguna cuenta registrada con este correo electrónico.' };
  };

  const signOut = async () => {
    safeStorage.removeItem(DEMO_SESSION_KEY);
    safeStorage.removeItem(ACTIVE_LOCAL_USER_KEY);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    setProfile(null);
    setUser(null);
    setSession(null);
    setIsDemo(false);
  };

  const refreshProfile = async () => {
    if (user && isSupabaseConfigured()) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemo,
        startDemo,
        signIn,
        signUp,
        changePassword,
        recoverPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
