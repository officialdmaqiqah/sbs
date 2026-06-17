import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { environment } from '../config/environment';

interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (environment.dataProvider === 'local') {
      if (localStorage.getItem('local_logged_out') === 'true') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      // Dummy auth for local mode
      setSession({ access_token: 'dummy' });
      setUser({ id: 'dummy-user-id', email: 'admin@sbs.local' });
      setProfile({ full_name: 'Local Admin', organization_id: 'dummy-org-id', role: 'CEO_ADMIN' });
      setLoading(false);
      return;
    }

    // Supabase auth
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profileData) {
          const { data: userRoleData } = await supabase
            .from('user_roles')
            .select('active, roles ( code )')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (userRoleData && userRoleData.active === false) {
            // Inactive user, block access
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            const roleCode = (userRoleData as any)?.roles?.code || 'GUEST';
            setProfile({ ...profileData, role: roleCode });
          }
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profileData) {
          const { data: userRoleData } = await supabase
            .from('user_roles')
            .select('active, roles ( code )')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (userRoleData && userRoleData.active === false) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            const roleCode = (userRoleData as any)?.roles?.code || 'GUEST';
            setProfile({ ...profileData, role: roleCode });
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (environment.dataProvider === 'supabase') {
      await supabase.auth.signOut();
    } else {
      localStorage.setItem('local_logged_out', 'true');
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
