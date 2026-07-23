import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "@/api/query-client";
import { supabase } from "@/lib/supabase";

/**
 * Auth state lives in React Context (per the locked-in architecture).
 * supabase-js owns persistence and token refresh; this context just mirrors
 * the session into React so routes and components can react to it.
 */

interface AuthContextValue {
  session: Session | null;
  /** True until the persisted session (if any) has been restored. */
  initialising: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialising(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // A different (or no) user means every cached API response — role,
      // lists, details — belongs to someone else. Drop the lot.
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        queryClient.clear();
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    // Supabase reports bad credentials as "Invalid login credentials".
    const friendly = error.message.toLowerCase().includes("invalid login")
      ? "Incorrect email or password."
      : error.message;
    return { error: friendly };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, initialising, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
