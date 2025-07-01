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
  console.log('🔍 EXTRACTING IMAGE DATA FROM N8N WEBHOOK');
  console.log('Response data type:', typeof responseData);
  console.log('Response text length:', responseText.length);
  
  if (responseData && typeof responseData === 'object') {
    console.log('Response data keys:', Object.keys(responseData));
  }

  let imageBase64 = null;

  // Method 1: Direct property access for n8n webhook format
  if (responseData && typeof responseData === 'object') {
    // Check for 'image' property first (n8n webhook format)
    if (responseData.image && typeof responseData.image === 'string') {
      console.log('✅ Found image in responseData.image (n8n format)');
      console.log('Image data length:', responseData.image.length);
      console.log('Image data preview:', responseData.image.substring(0, 100) + '...');
      imageBase64 = responseData.image;
    }
    // Check other possible property names
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
    else {
      console.log('❌ No image property found in response object');
      console.log('Available properties:', Object.keys(responseData));
    }
  }

  // Method 2: If response is a string, treat it as base64
  if (!imageBase64 && typeof responseData === 'string' && responseData.length > 100) {
    console.log('✅ Treating entire response as base64 string');
    imageBase64 = responseData;
  }

  // Method 3: Parse response text for base64 patterns (fallback)
  if (!imageBase64 && responseText && responseText.length > 100) {
    console.log('🔍 Searching response text for base64 patterns');
    
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);
      if (parsed && parsed.image && typeof parsed.image === 'string') {
        console.log('✅ Found image in parsed JSON from response text');
        imageBase64 = parsed.image;
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse response text as JSON, trying regex patterns');
      
      // Look for JSON with image property using regex
      const imageMatch = responseText.match(/"image"\s*:\s*"([^"]+)"/);
      if (imageMatch && imageMatch[1]) {
        console.log('✅ Found base64 in JSON image property via regex');
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

  // Clean and validate the base64 string
  if (imageBase64) {
    console.log('🧹 Cleaning base64 string...');
    console.log('Original length:', imageBase64.length);
    
    // Remove data URL prefix if present
    if (imageBase64.startsWith('data:image/')) {
      const parts = imageBase64.split(',');
      if (parts.length > 1) {
        imageBase64 = parts[1];
        console.log('Removed data URL prefix, new length:', imageBase64.length);
      }
    }
    
    // Remove any whitespace, newlines, and other unwanted characters
    const originalLength = imageBase64.length;
    imageBase64 = imageBase64.replace(/[\s\n\r\t]/g, '');
    
    if (originalLength !== imageBase64.length) {
      console.log('Removed whitespace, length change:', originalLength, '->', imageBase64.length);
    }
    
    console.log('✅ Final cleaned base64 length:', imageBase64.length);
    console.log('First 50 chars:', imageBase64.substring(0, 50));
    console.log('Last 20 chars:', imageBase64.substring(imageBase64.length - 20));
    
    // Additional validation
    if (imageBase64.length < 1000) {
      console.error('❌ Base64 string too short after cleaning:', imageBase64.length);
      return null;
    }
    
    // Test if it's valid base64
    try {
      atob(imageBase64.substring(0, 100));
      console.log('✅ Base64 format validation passed');
    } catch (testError) {
      console.error('❌ Base64 format validation failed:', testError);
      return null;
    }
  } else {
    console.error('❌ No image data found in any format');
    console.error('Response data structure:', JSON.stringify(responseData, null, 2));
    console.error('Response text sample:', responseText.substring(0, 500));
  }

  console.log('🎯 Final extraction result:', {
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
  console.log('🔍 Validating image data...');
  
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
    console.error('First 100 chars:', imageBase64.substring(0, 100));
    return false;
  }

  // Test if it's valid base64 by trying to decode
  try {
    const testDecode = atob(imageBase64.substring(0, 100));
    console.log('✅ Base64 validation passed, decoded test length:', testDecode.length);
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
    console.log('🚀 PROCESSING IMAGE RESPONSE FROM N8N WEBHOOK');
    console.log('Image type:', imageType);
    console.log('Form data keys:', Object.keys(formData));
    console.log('Options:', { 
      hasUser: !!user, 
      hasOnImageGenerated: !!onImageGenerated, 
      isBulkProcessing,
      userId: user?.id 
    });

    // Extract image data from n8n webhook response
    const imageBase64 = extractImageFromResponse(responseData, responseText);
    
    if (!imageBase64) {
      console.error('❌ CRITICAL: No image data found in n8n webhook response');
      console.error('Response data:', responseData);
      console.error('Response text sample:', responseText.substring(0, 1000));
      throw new Error('No image data found in webhook response. The image generation service may have failed.');
    }

    // Validate the extracted image data
    if (!validateImageData(imageBase64)) {
      console.error('❌ CRITICAL: Image data validation failed');
      throw new Error('Invalid image data received from webhook. Please try again.');
    }

    console.log('✅ Image data extracted and validated successfully from n8n webhook');

    // Create history image object
    const historyImage = createHistoryImage(imageBase64, imageType, formData);

    // Process credits and database operations for authenticated users
    if (user && isSupabaseConfigured) {
      try {
        console.log('💳 Processing credits and database operations for user:', user.id);
        
        // Deduct credits first
        await deductUserCredits(user.id, CREDIT_COSTS[imageType]);
        
        // Refresh user data to show updated credits
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

        console.log('✅ Credits deducted and image saved to database');
      } catch (error) {
        console.error('⚠️ Error in credit/database operations:', error);
        // Continue with image generation even if these operations fail
        console.log('⚠️ Continuing with image generation despite credit/database errors');
      }
    } else {
      console.log('ℹ️ Skipping credits/database operations (no user or Supabase not configured)');
    }

    // Add to history (this is crucial for the UI to update)
    if (onImageGenerated) {
      console.log('📝 Adding image to history via callback...');
      onImageGenerated(historyImage);
      console.log('✅ Image added to history successfully');
    } else {
      console.log('⚠️ No onImageGenerated callback provided - image will not appear in history');
    }

    console.log('🎉 N8N WEBHOOK IMAGE RESPONSE PROCESSED SUCCESSFULLY!');
    return { success: true, image: historyImage };

  } catch (error) {
    console.error('❌ CRITICAL ERROR processing n8n webhook image response:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'Failed to process image response from webhook';
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