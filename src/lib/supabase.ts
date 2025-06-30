import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  user_id: string;
  credits: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImageGeneration {
  id: string;
  user_id: string;
  image_type: 'blog' | 'infographic';
  title?: string;
  content?: string;
  style?: string;
  colour?: string;
  credits_used: number;
  image_data: string;
  created_at: string;
}

// Auth functions
export const signUp = async (userData: {
  email: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  user_id: string;
  password: string;
}) => {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) throw authError;

    if (authData.user) {
      // Create user profile with custom user_id
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          brand_name: userData.brand_name,
          website_url: userData.website_url,
          user_id: userData.user_id,
          password_hash: 'handled_by_supabase_auth', // Placeholder since Supabase handles this
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return { user: profileData, authUser: authData.user };
    }

    throw new Error('Failed to create user');
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;

    if (authData.user) {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      return { user: profileData, authUser: authData.user };
    }

    throw new Error('Failed to sign in');
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    // Handle stale JWT tokens
    if (authError) {
      if (authError.message?.includes('User from sub claim in JWT does not exist') || 
          authError.status === 403) {
        // Clear the invalid session
        await supabase.auth.signOut();
      }
      throw authError;
    }
    
    if (!authUser) return null;

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError) throw profileError;

    return { user: profileData, authUser };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Credit functions
export const deductCredits = async (userId: string, amount: number) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ credits: supabase.sql`credits - ${amount}` })
      .eq('id', userId)
      .select('credits')
      .single();

    if (error) throw error;
    return data.credits;
  } catch (error) {
    console.error('Deduct credits error:', error);
    throw error;
  }
};

export const addCredits = async (userId: string, amount: number) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ credits: supabase.sql`credits + ${amount}` })
      .eq('id', userId)
      .select('credits')
      .single();

    if (error) throw error;
    return data.credits;
  } catch (error) {
    console.error('Add credits error:', error);
    throw error;
  }
};

// Image generation functions
export const saveImageGeneration = async (imageData: {
  user_id: string;
  image_type: 'blog' | 'infographic';
  title?: string;
  content?: string;
  style?: string;
  colour?: string;
  credits_used: number;
  image_data: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('image_generations')
      .insert(imageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Save image generation error:', error);
    throw error;
  }
};

export const getUserImageGenerations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('image_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get user image generations error:', error);
    throw error;
  }
};

// Admin functions
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

export const updateUserCredits = async (userId: string, credits: number) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ credits })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update user credits error:', error);
    throw error;
  }
};

export const getAllImageGenerations = async () => {
  try {
    const { data, error } = await supabase
      .from('image_generations')
      .select(`
        *,
        users (
          name,
          email,
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get all image generations error:', error);
    throw error;
  }
};