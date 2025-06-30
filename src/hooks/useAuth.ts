import { useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth';

const STORAGE_KEY = 'seo_engine_auth';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Check for existing session
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth) {
      try {
        const user = JSON.parse(savedAuth);
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } else {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call - replace with actual authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any email/password combination
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        isAnonymous: false,
        createdAt: new Date(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const signInAnonymously = async (): Promise<boolean> => {
    try {
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        isAnonymous: true,
        createdAt: new Date(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return true;
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      return false;
    }
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return {
    ...authState,
    signInWithEmail,
    signInAnonymously,
    signOut,
  };
};