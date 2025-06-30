import { useState, useEffect } from 'react';
import { supabase, signUp, signIn, signOut, getCurrentUser, User as DBUser } from '../lib/supabase';

interface AuthState {
  user: DBUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Check for existing session
    getCurrentUser().then((result) => {
      if (result) {
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const result = await getCurrentUser();
        if (result) {
          setAuthState({
            user: result.user,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async (userData: {
    email: string;
    name: string;
    brand_name?: string;
    website_url?: string;
    user_id: string;
    password: string;
  }): Promise<boolean> => {
    try {
      const result = await signUp(userData);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn(email, password);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshUser = async () => {
    const result = await getCurrentUser();
    if (result) {
      setAuthState(prev => ({
        ...prev,
        user: result.user,
      }));
    }
  };

  return {
    ...authState,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshUser,
  };
};