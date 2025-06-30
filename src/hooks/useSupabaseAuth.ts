import { useState, useEffect } from 'react';
import { User as DBUser } from '../lib/supabase';

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
    // Check if Supabase environment variables are configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('Checking Supabase configuration:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl ? 'configured' : 'missing',
      key: supabaseAnonKey ? 'configured' : 'missing'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables are not configured');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Database connection not configured. Please set up Supabase environment variables.',
      });
      return;
    }

    // If Supabase is configured, try to initialize
    const initializeAuth = async () => {
      try {
        // Dynamic import to avoid loading Supabase if not configured
        const { getCurrentUser, supabase } = await import('../lib/supabase');
        
        // Check for existing session
        const result = await getCurrentUser();
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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
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
          } catch (error) {
            console.error('Auth state change error:', error);
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Authentication error occurred.',
            }));
          }
        });

        // Cleanup function
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to initialize authentication. Please check your database connection.',
        });
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(fn => fn && fn());
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
      const { signUp } = await import('../lib/supabase');
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
      const { signIn } = await import('../lib/supabase');
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
      const { signOut } = await import('../lib/supabase');
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
      const { getCurrentUser } = await import('../lib/supabase');
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