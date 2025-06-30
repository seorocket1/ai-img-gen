import { useState, useEffect } from 'react';
import { supabase, signUp, signIn, signOut, getCurrentUser, User as DBUser } from '../lib/supabase';

interface AuthState {
  user: DBUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: string;
}

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('Supabase environment variables are not configured');
          if (mounted) {
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
              error: 'Database connection not configured. Please set up Supabase environment variables.',
            });
          }
          return;
        }

        // Check for existing session
        const result = await getCurrentUser();
        if (mounted) {
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
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: 'Failed to initialize authentication. Please check your database connection.',
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes only if Supabase is configured
    let subscription: any = null;
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          try {
            if (event === 'SIGNED_IN' && session) {
              const result = await getCurrentUser();
              if (result && mounted) {
                setAuthState({
                  user: result.user,
                  isLoading: false,
                  isAuthenticated: true,
                });
              }
            } else if (event === 'SIGNED_OUT') {
              if (mounted) {
                setAuthState({
                  user: null,
                  isLoading: false,
                  isAuthenticated: false,
                });
              }
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            if (mounted) {
              setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Authentication error occurred.',
              }));
            }
          }
        });
        subscription = data.subscription;
      } catch (error) {
        console.error('Auth listener setup error:', error);
      }
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Database connection not configured. Please set up Supabase.');
      }

      const result = await signUp(userData);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create account',
      }));
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Database connection not configured. Please set up Supabase.');
      }

      const result = await signIn(email, password);
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign in',
      }));
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
      // Even if sign out fails, clear local state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const refreshUser = async () => {
    try {
      const result = await getCurrentUser();
      if (result) {
        setAuthState(prev => ({
          ...prev,
          user: result.user,
        }));
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: undefined,
    }));
  };

  return {
    ...authState,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshUser,
    clearError,
  };
};