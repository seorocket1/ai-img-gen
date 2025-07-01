/**
 * Image Response Handler
 * Handles all webhook responses for image generation (single and bulk, blog and infographic)
 * Specifically designed to handle n8n webhook responses
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
 * Enhanced image extraction function specifically for n8n webhook responses
 * The n8n webhook returns: { "image": "base64string" }
 */
export const extractImageFromResponse = (responseData: any, responseText: string): string | null => {
  console.log('🔍 N8N WEBHOOK: Extracting image data');
  console.log('Response data type:', typeof responseData);
  console.log('Response text length:', responseText.length);
  console.log('Response data keys:', responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'Not an object');
  
  let imageBase64 = null;

  // Method 1: Direct access to 'image' property (n8n webhook format)
  // This is the PRIMARY method for n8n webhook responses
  if (responseData && typeof responseData === 'object') {
    console.log('🔍 N8N: Checking for image property in response object');
    
    if (responseData.image && typeof responseData.image === 'string') {
      console.log('✅ N8N: Found "image" property in response object');
      console.log('Image data length:', responseData.image.length);
      console.log('Image data type:', typeof responseData.image);
      console.log('First 50 chars:', responseData.image.substring(0, 50));
      
      if (responseData.image.length > 100) {
        imageBase64 = responseData.image;
        console.log('✅ N8N: Using image from responseData.image');
      } else {
        console.log('❌ N8N: Image property exists but is too short:', responseData.image.length);
      }
    } else {
      console.log('❌ N8N: No valid "image" property found in response object');
      console.log('Available properties:', Object.keys(responseData));
    }
  }

  // Method 2: Parse response text as JSON and extract image (fallback)
  if (!imageBase64 && responseText) {
    console.log('🔍 N8N: Attempting to parse response text as JSON (fallback)');
    try {
      const parsed = JSON.parse(responseText);
      console.log('✅ N8N: Successfully parsed response text as JSON');
      console.log('Parsed object keys:', Object.keys(parsed));
      
      if (parsed.image && typeof parsed.image === 'string' && parsed.image.length > 100) {
        imageBase64 = parsed.image;
        console.log('✅ N8N: Using image from parsed JSON');
      } else {
        console.log('❌ N8N: No valid image property in parsed JSON');
        if (parsed.image) {
          console.log('Image property exists but invalid:', typeof parsed.image, parsed.image.length);
        }
      }
    } catch (parseError) {
      console.log('⚠️ N8N: Could not parse response text as JSON:', parseError.message);
    }
  }

  // Method 3: Extract using regex pattern (last resort)
  if (!imageBase64 && responseText) {
    console.log('🔍 N8N: Using regex to extract image data (last resort)');
    const imageMatch = responseText.match(/"image"\s*:\s*"([^"]+)"/);
    if (imageMatch && imageMatch[1] && imageMatch[1].length > 100) {
      imageBase64 = imageMatch[1];
      console.log('✅ N8N: Using image from regex extraction');
    } else {
      console.log('❌ N8N: No image found via regex');
    }
  }

  // Clean and validate the base64 string
  if (imageBase64) {
    console.log('🧹 N8N: Cleaning base64 string...');
    console.log('Original length:', imageBase64.length);
    
    // Remove data URL prefix if present
    if (imageBase64.startsWith('data:image/')) {
      const parts = imageBase64.split(',');
      if (parts.length > 1) {
        imageBase64 = parts[1];
        console.log('Removed data URL prefix');
      }
    }
    
    // Remove any whitespace and newlines
    const originalLength = imageBase64.length;
    imageBase64 = imageBase64.replace(/[\s\n\r\t]/g, '');
    
    if (originalLength !== imageBase64.length) {
      console.log('Removed whitespace, length change:', originalLength, '->', imageBase64.length);
    }
    
    console.log('✅ N8N: Final cleaned base64 length:', imageBase64.length);
    console.log('First 50 chars:', imageBase64.substring(0, 50));
    console.log('Last 20 chars:', imageBase64.substring(imageBase64.length - 20));
    
    // Validate minimum length
    if (imageBase64.length < 1000) {
      console.error('❌ N8N: Base64 string too short after cleaning:', imageBase64.length);
      return null;
    }
    
    // Test base64 validity
    try {
      atob(imageBase64.substring(0, 100));
      console.log('✅ N8N: Base64 format validation passed');
    } catch (testError) {
      console.error('❌ N8N: Base64 format validation failed:', testError);
      return null;
    }
  } else {
    console.error('❌ N8N: CRITICAL - No image data found in any format');
    console.error('Response structure for debugging:');
    console.error('- responseData type:', typeof responseData);
    console.error('- responseData keys:', responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'N/A');
    console.error('- responseText length:', responseText ? responseText.length : 0);
    console.error('- responseText sample:', responseText ? responseText.substring(0, 200) : 'N/A');
    
    if (responseData && typeof responseData === 'object') {
      console.error('- Full responseData:', JSON.stringify(responseData, null, 2));
    }
  }

  console.log('🎯 N8N: Final extraction result:', {
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
    return false;
  }

  // Test if it's valid base64 by trying to decode
  try {
    atob(imageBase64.substring(0, 100));
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
    content: imageType === 'blog' ? (formData.intro || formData.content) : formData.content,
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
 * Main function to process image generation response from n8n webhook
 * This function is used by ALL image generation types (blog, infographic, bulk)
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
    console.log('🚀 N8N WEBHOOK: Processing image response');
    console.log('Image type:', imageType);
    console.log('Form data keys:', Object.keys(formData || {}));
    console.log('Options:', { 
      hasUser: !!user, 
      hasOnImageGenerated: !!onImageGenerated, 
      isBulkProcessing,
      userId: user?.id 
    });

    // Step 1: Extract image data from n8n webhook response
    console.log('📤 N8N WEBHOOK: Step 1 - Extracting image data from n8n response');
    const imageBase64 = extractImageFromResponse(responseData, responseText);
    
    if (!imageBase64) {
      console.error('❌ N8N WEBHOOK: CRITICAL - No image data found in n8n response');
      console.error('This means the n8n webhook response does not contain valid image data');
      throw new Error('No image data found in n8n webhook response. The image generation may have failed.');
    }

    // Step 2: Validate the extracted image data
    console.log('🔍 N8N WEBHOOK: Step 2 - Validating extracted image data');
    if (!validateImageData(imageBase64)) {
      console.error('❌ N8N WEBHOOK: CRITICAL - Image data validation failed');
      throw new Error('Invalid image data received from n8n webhook. Please try again.');
    }

    console.log('✅ N8N WEBHOOK: Image data extracted and validated successfully');
    console.log('Final image data length:', imageBase64.length);

    // Step 3: Create history image object
    console.log('📝 N8N WEBHOOK: Step 3 - Creating history image object');
    const historyImage = createHistoryImage(imageBase64, imageType, formData);

    // Step 4: Process credits and database operations for authenticated users
    if (user && isSupabaseConfigured) {
      try {
        console.log('💳 N8N WEBHOOK: Step 4 - Processing credits and database operations');
        
        // Deduct credits
        await deductUserCredits(user.id, CREDIT_COSTS[imageType]);
        
        // Refresh user data
        if (onRefreshUser) {
          console.log('🔄 N8N WEBHOOK: Refreshing user data...');
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

        console.log('✅ N8N WEBHOOK: Credits and database operations completed');
      } catch (error) {
        console.error('⚠️ N8N WEBHOOK: Error in credit/database operations:', error);
        // Continue with image generation even if these operations fail
      }
    } else {
      console.log('ℹ️ N8N WEBHOOK: Skipping credits/database operations (no user or Supabase not configured)');
    }

    // Step 5: Add to history (CRITICAL for UI update)
    if (onImageGenerated) {
      console.log('📝 N8N WEBHOOK: Step 5 - Adding image to history for UI update');
      onImageGenerated(historyImage);
      console.log('✅ N8N WEBHOOK: Image added to history successfully - UI should update now');
    } else {
      console.log('⚠️ N8N WEBHOOK: No onImageGenerated callback provided - UI may not update');
    }

    console.log('🎉 N8N WEBHOOK: PROCESSING COMPLETED SUCCESSFULLY!');
    console.log('The image should now be visible in the UI');
    
    return { success: true, image: historyImage };

  } catch (error) {
    console.error('❌ N8N WEBHOOK: CRITICAL ERROR during processing:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'Failed to process n8n webhook response';
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