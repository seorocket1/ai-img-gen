import { useState, useEffect } from 'react';
import { User as DBUser, isSupabaseConfigured } from '../lib/supabase';

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
    console.log('Initializing Supabase auth hook...');
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase environment variables are not configured');
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Database connection not configured. Please click "Connect to Supabase" in the top right corner.',
      });
      return;
    }

    // Initialize auth if Supabase is configured
    const initializeAuth = async () => {
      try {
        console.log('Supabase is configured, initializing auth...');
        
        // Dynamic import to avoid loading Supabase if not configured
        const { getCurrentUser, supabase } = await import('../lib/supabase');
        
        if (!supabase) {
          throw new Error('Supabase client not available');
        }
        
        // Check for existing session
        const result = await getCurrentUser();
        if (result) {
          console.log('Found existing user session:', result.user.email);
          setAuthState({
            user: result.user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          console.log('No existing user session found');
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session?.user?.email || 'no user');
          
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

        // Return cleanup function
        return () => {
          console.log('Cleaning up auth subscription');
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to initialize authentication. Please check your database connection.',
        });
        return () => {}; // Return empty cleanup function
      }
    };

    const cleanupPromise = initializeAuth();
    
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  const handleSignUp = async (userData: {
    email: string;
    name: string;
    brand_name?: string;
    website_url?: string;
    username: string;
    password: string;
  }): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      throw new Error('Database connection not configured');
    }

    try {
      console.log('Attempting sign up for:', userData.email);
      const { signUp } = await import('../lib/supabase');
      const result = await signUp(userData);
      console.log('Sign up successful:', result.user.email);
      
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      throw new Error('Database connection not configured');
    }

    try {
      console.log('Attempting sign in for:', email);
      const { signIn } = await import('../lib/supabase');
      const result = await signIn(email, password);
      console.log('Sign in successful:', result.user.email);
      
      setAuthState({
        user: result.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Failed to sign in';
      
      // Check for specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link to activate your account before signing in.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setAuthState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      
      return { success: false, error: errorMessage };
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      // Even if not configured, clear local state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      console.log('Signing out...');
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
    if (!isSupabaseConfigured) {
      return;
    }

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