/**
 * Image Response Handler
 * Handles all webhook responses for image generation (single and bulk, blog and infographic)
 */

import { HistoryImage } from '../types/history';
import { User, isSupabaseConfigured } from '../lib/supabase';

// Credit costs
const CREDIT_COSTS = {
  blog: 5,
  infographic: 10,
};

interface ImageGenerationData {
  user_id?: string;
  image_type: 'blog' | 'infographic';
  title?: string;
  content?: string;
  style?: string;
  colour?: string;
  credits_used: number;
  image_data: string;
}

interface ProcessImageOptions {
  user?: User | null;
  onImageGenerated?: (image: HistoryImage) => void;
  onRefreshUser?: () => void;
  isBulkProcessing?: boolean;
}

/**
 * Enhanced image extraction function that handles all webhook response formats
 */
export const extractImageFromResponse = (responseData: any, responseText: string): string | null => {
  console.log('🔍 EXTRACTING IMAGE DATA');
  console.log('Response data type:', typeof responseData);
  console.log('Response text length:', responseText.length);
  console.log('Response data keys:', responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'Not an object');

  let imageBase64 = null;

  // Method 1: Direct property access (most common case for n8n webhook)
  if (responseData && typeof responseData === 'object') {
    // Check for 'image' property first (most likely from n8n)
    if (responseData.image && typeof responseData.image === 'string') {
      console.log('✅ Found image in responseData.image');
      imageBase64 = responseData.image;
    }
    // Check other common property names
    else if (responseData.data && typeof responseData.data === 'string') {
      console.log('✅ Found image in responseData.data');
      imageBase64 = responseData.data;
    }
    else if (responseData.base64 && typeof responseData.base64 === 'string') {
      console.log('✅ Found image in responseData.base64');
      imageBase64 = responseData.base64;
    }
    // Check for nested structures
    else if (responseData.data && responseData.data.image) {
      console.log('✅ Found image in responseData.data.image');
      imageBase64 = responseData.data.image;
    }
  }

  // Method 2: If response is a string, treat it as base64
  if (!imageBase64 && typeof responseData === 'string' && responseData.length > 100) {
    console.log('✅ Treating entire response as base64 string');
    imageBase64 = responseData;
  }

  // Method 3: Parse response text for base64 patterns
  if (!imageBase64 && responseText && responseText.length > 100) {
    console.log('🔍 Searching response text for base64 patterns');
    
    // Look for data URL pattern
    const dataUrlMatch = responseText.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (dataUrlMatch && dataUrlMatch[1]) {
      console.log('✅ Found base64 in data URL');
      imageBase64 = dataUrlMatch[1];
    }
    // Look for JSON with image property
    else {
      const imageMatch = responseText.match(/"image"\s*:\s*"([A-Za-z0-9+/=]+)"/);
      if (imageMatch && imageMatch[1]) {
        console.log('✅ Found base64 in JSON image property');
        imageBase64 = imageMatch[1];
      }
      // Look for standalone base64 (at least 1000 chars)
      else {
        const base64Match = responseText.match(/([A-Za-z0-9+/]{1000,}={0,2})/);
        if (base64Match && base64Match[1]) {
          console.log('✅ Found standalone base64 pattern');
          imageBase64 = base64Match[1];
        }
      }
    }
  }

  // Clean the base64 string
  if (imageBase64) {
    console.log('🧹 Cleaning base64 string...');
    console.log('Original length:', imageBase64.length);
    
    // Remove data URL prefix if present
    if (imageBase64.startsWith('data:image/')) {
      imageBase64 = imageBase64.split(',')[1];
      console.log('Removed data URL prefix');
    }
    
    // Remove any whitespace, newlines, and other unwanted characters
    const originalLength = imageBase64.length;
    imageBase64 = imageBase64.replace(/[\s\n\r\t]/g, '');
    console.log('Removed whitespace, length change:', originalLength, '->', imageBase64.length);
    
    console.log('✅ Final cleaned base64 length:', imageBase64.length);
    console.log('First 50 chars:', imageBase64.substring(0, 50));
    console.log('Last 20 chars:', imageBase64.substring(imageBase64.length - 20));
  }

  console.log('🎯 Image extraction result:', {
    found: !!imageBase64,
    length: imageBase64 ? imageBase64.length : 0,
    isValidLength: imageBase64 ? imageBase64.length > 1000 : false
  });

  return imageBase64;
};

/**
 * Validates base64 image data
 */
export const validateImageData = (imageBase64: string): boolean => {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    console.error('❌ Invalid image data: not a string');
    return false;
  }

  if (imageBase64.length < 1000) {
    console.error('❌ Invalid image data: too short (', imageBase64.length, 'chars)');
    return false;
  }

  // Check if it's valid base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(imageBase64)) {
    console.error('❌ Invalid base64 format detected');
    return false;
  }

  // Test if it's valid base64
  try {
    atob(imageBase64.substring(0, 100)); // Test decode a small portion
    console.log('✅ Base64 validation passed');
    return true;
  } catch (base64Error) {
    console.error('❌ Base64 validation failed:', base64Error);
    return false;
  }
};

/**
 * Deducts credits from user account
 */
export const deductUserCredits = async (userId: string, amount: number): Promise<number | null> => {
  if (!isSupabaseConfigured) {
    console.log('⚠️ Supabase not configured, skipping credit deduction');
    return null;
  }

  try {
    console.log('💳 Deducting credits:', { userId, amount });
    const { deductCredits } = await import('../lib/supabase');
    const newCredits = await deductCredits(userId, amount);
    console.log('✅ Credits deducted successfully. New balance:', newCredits);
    return newCredits;
  } catch (creditError) {
    console.error('❌ Error deducting credits:', creditError);
    throw creditError;
  }
};

/**
 * Saves image generation to database
 */
export const saveImageToDatabase = async (imageData: ImageGenerationData): Promise<any> => {
  if (!isSupabaseConfigured) {
    console.log('⚠️ Supabase not configured, skipping database save');
    return null;
  }

  try {
    console.log('💾 Saving image generation to database');
    const { saveImageGeneration } = await import('../lib/supabase');
    const result = await saveImageGeneration(imageData);
    console.log('✅ Image generation saved to database successfully');
    return result;
  } catch (dbError) {
    console.error('❌ Error saving to database:', dbError);
    throw dbError;
  }
};

/**
 * Creates a history image object
 */
export const createHistoryImage = (
  imageBase64: string,
  imageType: 'blog' | 'infographic',
  formData: any,
  id?: string
): HistoryImage => {
  const historyImage: HistoryImage = {
    id: id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: imageType,
    base64: imageBase64,
    title: imageType === 'blog' ? formData.title : (formData.title || 'Infographic'),
    content: imageType === 'blog' ? formData.intro || formData.content : formData.content,
    timestamp: Date.now(),
    style: formData.style || undefined,
    colour: formData.colour || undefined,
  };

  console.log('📝 Created history image:', {
    id: historyImage.id,
    type: historyImage.type,
    title: historyImage.title,
    hasBase64: !!historyImage.base64,
    base64Length: historyImage.base64.length,
    timestamp: historyImage.timestamp
  });

  return historyImage;
};

/**
 * Main function to process image generation response
 */
export const processImageResponse = async (
  responseData: any,
  responseText: string,
  imageType: 'blog' | 'infographic',
  formData: any,
  options: ProcessImageOptions = {}
): Promise<{ success: boolean; image?: HistoryImage; error?: string }> => {
  const { user, onImageGenerated, onRefreshUser, isBulkProcessing = false } = options;

  try {
    console.log('🚀 Processing image response...');
    console.log('Image type:', imageType);
    console.log('Form data:', formData);
    console.log('Options:', { hasUser: !!user, hasOnImageGenerated: !!onImageGenerated, isBulkProcessing });

    // Extract image data
    const imageBase64 = extractImageFromResponse(responseData, responseText);
    
    if (!imageBase64) {
      console.error('❌ No image data found in response');
      console.error('Response data:', responseData);
      console.error('Response text sample:', responseText.substring(0, 500));
      throw new Error('No image data found in response. The image generation service may have failed.');
    }

    // Validate image data
    if (!validateImageData(imageBase64)) {
      console.error('❌ Image data validation failed');
      throw new Error('Invalid image data received. Please try again.');
    }

    console.log('✅ Image data extracted and validated successfully');

    // Create history image
    const historyImage = createHistoryImage(imageBase64, imageType, formData);

    // Process credits and database operations for authenticated users
    if (user && isSupabaseConfigured) {
      try {
        console.log('💳 Processing credits and database operations...');
        
        // Deduct credits
        await deductUserCredits(user.id, CREDIT_COSTS[imageType]);
        
        // Refresh user data
        if (onRefreshUser) {
          console.log('🔄 Refreshing user data...');
          onRefreshUser();
        }

        // Save to database
        await saveImageToDatabase({
          user_id: user.id,
          image_type: imageType,
          title: historyImage.title,
          content: historyImage.content,
          style: historyImage.style,
          colour: historyImage.colour,
          credits_used: CREDIT_COSTS[imageType],
          image_data: imageBase64,
        });

        console.log('✅ Credits and database operations completed');
      } catch (error) {
        console.error('⚠️ Error in credit/database operations:', error);
        // Continue with image generation even if these operations fail
        console.log('⚠️ Continuing with image generation despite credit/database errors');
      }
    } else {
      console.log('ℹ️ Skipping credits/database operations (no user or Supabase not configured)');
    }

    // Add to history
    if (onImageGenerated) {
      console.log('📝 Adding image to history...');
      onImageGenerated(historyImage);
      console.log('✅ Image added to history successfully');
    } else {
      console.log('⚠️ No onImageGenerated callback provided');
    }

    console.log('🎉 Image response processed successfully!');
    return { success: true, image: historyImage };

  } catch (error) {
    console.error('❌ Error processing image response:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'Failed to process image response';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Checks if user has sufficient credits
 */
export const checkUserCredits = (user: User | null, imageType: 'blog' | 'infographic'): boolean => {
  if (!user || !isSupabaseConfigured) {
    return true; // Allow usage for non-authenticated users or when DB not configured
  }
  
  const requiredCredits = CREDIT_COSTS[imageType];
  return user.credits >= requiredCredits;
};

/**
 * Gets credit cost for image type
 */
export const getCreditCost = (imageType: 'blog' | 'infographic'): number => {
  return CREDIT_COSTS[imageType];
};

export { CREDIT_COSTS };