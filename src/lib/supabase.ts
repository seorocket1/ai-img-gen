import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a flag to check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Only create client if configured
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  username: string;
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

// Helper function to ensure Supabase is configured
const ensureSupabaseConfigured = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please set up your database connection.');
  }
  return supabase;
};

// Auth functions
export const signUp = async (userData: {
  email: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  username: string;
  password: string;
}) => {
  const client = ensureSupabaseConfigured();
  
  try {
    console.log('Starting sign up process for:', userData.email);
    
    // First create the auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (authError) {
      console.error('Auth sign up error:', authError);
      if (authError.message.includes('already registered')) {
        throw new Error('Email already registered. Please use a different email or sign in.');
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    console.log('Auth user created successfully:', authData.user.id);

    // Create user profile in our users table
    const profileData = {
      id: authData.user.id,
      email: userData.email,
      name: userData.name,
      brand_name: userData.brand_name || null,
      website_url: userData.website_url || null,
      username: userData.username,
    };

    console.log('Creating user profile:', profileData);

    const { data: insertedProfile, error: profileError } = await client
      .from('users')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up auth user if profile creation fails
      try {
        await client.auth.signOut();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      if (profileError.code === '23505') {
        // Unique constraint violation
        if (profileError.message.includes('username')) {
          throw new Error('Username already taken. Please choose a different username.');
        } else if (profileError.message.includes('email')) {
          throw new Error('Email already registered. Please use a different email or sign in.');
        }
      }
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    console.log('User profile created successfully:', insertedProfile);
    return { user: insertedProfile, authUser: authData.user };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  const client = ensureSupabaseConfigured();
  
  try {
    console.log('Attempting sign in for:', email);
    
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth sign in error:', authError);
      if (authError.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (authError.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link to activate your account before signing in.');
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to sign in');
    }

    console.log('Auth sign in successful, fetching profile for:', authData.user.id);

    // Get user profile
    const { data: profileData, error: profileError } = await client
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profileData) {
      console.error('No profile found for user:', authData.user.id);
      
      // Check if this is an existing auth user without a profile
      // This can happen if the user was created before the profile system was set up
      console.log('Creating missing profile for existing user');
      
      // Try to create a profile for this existing user
      try {
        const newProfileData = {
          id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.user_metadata?.name || authData.user.email!.split('@')[0],
          username: authData.user.email!.split('@')[0].replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4),
        };

        const { data: createdProfile, error: createError } = await client
          .from('users')
          .insert(newProfileData)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create missing profile:', createError);
          await client.auth.signOut();
          throw new Error('User profile not found and could not be created. Please contact support.');
        }

        console.log('Created missing profile:', createdProfile);
        return { user: createdProfile, authUser: authData.user };
      } catch (createProfileError) {
        console.error('Error creating missing profile:', createProfileError);
        await client.auth.signOut();
        throw new Error('User profile not found. Please contact support or try creating a new account.');
      }
    }

    console.log('Sign in successful with profile:', profileData.email);
    return { user: profileData, authUser: authData.user };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const client = ensureSupabaseConfigured();
  
  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  if (!isSupabaseConfigured || !supabase) {
    console.info('Supabase not configured, no user session available');
    return null;
  }

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      // Handle expected "Auth session missing!" error gracefully
      if (authError.message === 'Auth session missing!') {
        console.info('No active Supabase session found');
        return null;
      }
      console.error('Auth error:', authError);
      return null;
    }
    
    if (!authUser) {
      console.info('No authenticated user found');
      return null;
    }

    console.log('Found authenticated user, fetching profile:', authUser.id);

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    if (!profileData) {
      console.warn('No profile found for authenticated user:', authUser.id);
      
      // Try to create a profile for this existing user
      try {
        console.log('Attempting to create missing profile for existing auth user');
        
        const newProfileData = {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
          username: authUser.email!.split('@')[0].replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4),
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('users')
          .insert(newProfileData)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create missing profile:', createError);
          await supabase.auth.signOut();
          return null;
        }

        console.log('Successfully created missing profile:', createdProfile);
        return { user: createdProfile, authUser };
      } catch (createProfileError) {
        console.error('Error creating missing profile:', createProfileError);
        await supabase.auth.signOut();
        return null;
      }
    }

    console.log('Successfully retrieved user profile:', profileData.email);
    return { user: profileData, authUser };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Credit functions
export const deductCredits = async (userId: string, amount: number) => {
  const client = ensureSupabaseConfigured();
  
  try {
    // First get current credits to calculate new value
    const { data: currentUser, error: fetchError } = await client
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newCredits = currentUser.credits - amount;
    
    // Update with the calculated value
    const { data, error } = await client
      .from('users')
      .update({ credits: newCredits })
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
  const client = ensureSupabaseConfigured();
  
  try {
    // First get current credits to calculate new value
    const { data: currentUser, error: fetchError } = await client
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newCredits = currentUser.credits + amount;
    
    // Update with the calculated value
    const { data, error } = await client
      .from('users')
      .update({ credits: newCredits })
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
  const client = ensureSupabaseConfigured();
  
  try {
    const { data, error } = await client
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
  const client = ensureSupabaseConfigured();
  
  try {
    const { data, error } = await client
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

// Admin functions (using service role)
export const getAllUsers = async () => {
  const client = ensureSupabaseConfigured();
  
  try {
    const { data, error } = await client
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
  const client = ensureSupabaseConfigured();
  
  try {
    const { data, error } = await client
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
  const client = ensureSupabaseConfigured();
  
  try {
    const { data, error } = await client
      .from('image_generations')
      .select(`
        *,
        users (
          name,
          email,
          username
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