import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export interface User {
  id: string
  email: string
  name: string
  username: string
  brand_name?: string
  website_url?: string
  credits: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  username: string
  brand_name?: string
  website_url?: string
  credits: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface ImageGeneration {
  id: string
  user_id: string
  image_type: string
  title?: string
  content?: string
  style?: string
  colour?: string
  credits_used: number
  image_data: string
  created_at: string
}

export const signUp = async (email: string, password: string, userData: {
  name: string
  username: string
  brand_name?: string
  website_url?: string
}) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // First, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No user returned from signup')

    // Create the user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        name: userData.name,
        username: userData.username,
        brand_name: userData.brand_name || null,
        website_url: userData.website_url || null,
        credits: 100,
        is_admin: false
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    return { user: authData.user, session: authData.session }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No user returned from signin')

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      throw new Error(`Failed to fetch user profile: ${profileError.message}`)
    }

    // If no profile exists, create one
    if (!profile) {
      console.log('No profile found, creating one for user:', authData.user.id)
      
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.email!.split('@')[0], // Use email prefix as default name
          username: authData.user.email!.split('@')[0], // Use email prefix as default username
          credits: 100,
          is_admin: false
        })

      if (createError) {
        console.error('Profile creation error:', createError)
        
        // If it's a duplicate key error, the profile might have been created by another process
        if (createError.code === '23505') {
          console.log('Profile already exists, fetching it...')
          const { data: existingProfile, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          if (fetchError) {
            throw new Error(`Failed to fetch existing profile: ${fetchError.message}`)
          }

          return { user: authData.user, session: authData.session, profile: existingProfile }
        }
        
        throw new Error(`Failed to create user profile: ${createError.message}`)
      }

      // Fetch the newly created profile
      const { data: newProfile, error: newProfileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (newProfileError) {
        throw new Error(`Failed to fetch new profile: ${newProfileError.message}`)
      }

      return { user: authData.user, session: authData.session, profile: newProfile }
    }

    return { user: authData.user, session: authData.session, profile }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export const signOut = async () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async (): Promise<{ user: any; profile: UserProfile | null } | null> => {
  if (!supabase) {
    console.log('Supabase client not initialized')
    return null
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('No authenticated user found:', userError.message)
      return null
    }
    
    if (!user) {
      console.log('No user session found')
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      
      // Try to create a missing profile
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: user.email!.split('@')[0],
          username: user.email!.split('@')[0],
          credits: 100,
          is_admin: false
        })

      if (createError && createError.code !== '23505') {
        throw new Error(`Failed to create missing profile: ${createError.message}`)
      }

      // Fetch the profile again
      const { data: newProfile, error: newProfileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (newProfileError) {
        throw new Error(`Failed to fetch profile after creation: ${newProfileError.message}`)
      }

      return { user, profile: newProfile }
    }

    return { user, profile }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateUserCredits = async (userId: string, credits: number) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('users')
    .update({ credits })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserCredits = async (userId: string): Promise<number> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data.credits || 0
}

export const deductCredits = async (userId: string, amount: number) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  // Get current credits first
  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single()

  if (fetchError) throw fetchError

  const newCredits = Math.max(0, currentUser.credits - amount)

  const { data, error } = await supabase
    .from('users')
    .update({ credits: newCredits })
    .eq('id', userId)
    .select('credits')
    .single()

  if (error) throw error
  return data.credits
}

export const getAllUsers = async (): Promise<User[]> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getAllImageGenerations = async (): Promise<ImageGeneration[]> => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  const { data, error } = await supabase
    .from('image_generations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getUserImageGenerations = async (userId: string): Promise<ImageGeneration[]> => {
  if (!supabase) {
    console.log('Supabase client not initialized, returning empty array')
    return []
  }

  try {
    console.log('Fetching image generations for user:', userId)
    
    const { data, error } = await supabase
      .from('image_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user image generations:', error)
      throw error
    }

    console.log('Successfully fetched image generations:', data?.length || 0, 'items')
    return data || []
  } catch (error) {
    console.error('getUserImageGenerations error:', error)
    throw error
  }
}

export const saveImageGeneration = async (imageData: {
  user_id: string
  image_type: 'blog' | 'infographic'
  title?: string
  content?: string
  style?: string
  colour?: string
  credits_used: number
  image_data: string
}) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }

  try {
    console.log('Saving image generation to database:', {
      user_id: imageData.user_id,
      image_type: imageData.image_type,
      title: imageData.title,
      credits_used: imageData.credits_used,
      has_image_data: !!imageData.image_data
    })

    const { data, error } = await supabase
      .from('image_generations')
      .insert({
        user_id: imageData.user_id,
        image_type: imageData.image_type,
        title: imageData.title || null,
        content: imageData.content || null,
        style: imageData.style || null,
        colour: imageData.colour || null,
        credits_used: imageData.credits_used,
        image_data: imageData.image_data
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving image generation:', error)
      throw error
    }

    console.log('Successfully saved image generation:', data.id)
    return data
  } catch (error) {
    console.error('saveImageGeneration error:', error)
    throw error
  }
}