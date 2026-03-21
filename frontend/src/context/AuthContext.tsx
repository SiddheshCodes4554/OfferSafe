import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'student' | 'org_admin' | 'org_member' | null;

interface OrgInfo {
  org_id: string;
  org_name: string;
  role: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole;
  orgInfo: OrgInfo | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Resolve role from metadata + DB ─────────────────── */
  const resolveRole = async (u: User) => {
    const metaRole = u.user_metadata?.role as string | undefined;

    if (metaRole === 'student') {
      setUserRole('student');
      setOrgInfo(null);
      return;
    }

    if (metaRole === 'org_admin' || metaRole === 'org_member') {
      // Look up the org membership
      const { data } = await supabase
        .from('org_members')
        .select('org_id, role, organizations(name)')
        .eq('user_id', u.id)
        .single();

      if (data) {
        setUserRole(data.role === 'admin' ? 'org_admin' : 'org_member');
        const orgName = (data as any).organizations?.name ?? '';
        setOrgInfo({ org_id: data.org_id, org_name: orgName, role: data.role });
      } else {
        setUserRole('org_member');
        setOrgInfo(null);
      }
      return;
    }

    // Unknown role — check if they exist in org_members
    const { data: member } = await supabase
      .from('org_members')
      .select('org_id, role, organizations(name)')
      .eq('user_id', u.id)
      .single();

    if (member) {
      setUserRole(member.role === 'admin' ? 'org_admin' : 'org_member');
      const orgName = (member as any).organizations?.name ?? '';
      setOrgInfo({ org_id: member.org_id, org_name: orgName, role: member.role });
      return;
    }

    // Fallback — check students table
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', u.id)
      .single();

    if (student) {
      setUserRole('student');
      setOrgInfo(null);
      return;
    }

    setUserRole(null);
    setOrgInfo(null);
  };

  /* ── Listen to auth changes ─────────────────────────── */
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      try {
        // Get initial session
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await resolveRole(s.user);
        }
      } catch (err) {
        // Supabase not configured yet — run in offline mode
        console.warn('⚠️ Supabase auth unavailable:', (err as Error).message);
      } finally {
        setLoading(false);
      }

      try {
        // Subscribe to changes
        const { data } = supabase.auth.onAuthStateChange((_event, s) => {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) {
            resolveRole(s.user).finally(() => setLoading(false));
          } else {
            setUserRole(null);
            setOrgInfo(null);
            setLoading(false);
          }
        });
        subscription = data.subscription;
      } catch {
        // Ignore subscription errors
      }
    };

    init();
    return () => subscription?.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auth actions ───────────────────────────────────── */
  const signUp = async (email: string, password: string, meta: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setOrgInfo(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, orgInfo, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
