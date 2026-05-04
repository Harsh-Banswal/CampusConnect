import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessionProfile(activeUser) {
      if (!activeUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Fetch the role and name from our custom public.profiles table
      const { data } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      if (data) {
        setUser({ ...activeUser, ...data });
      } else {
        setUser(activeUser);
      }
      setLoading(false);
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionProfile(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionProfile(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
