/**
 * Centralized response handler for all image generation requests
 * This file handles the extraction of image data from n8n webhook responses
 * and should never be modified when changing UI designs
 */

export interface ImageGenerationResponse {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

/**
 * Enhanced and robust image extraction function
 * Handles all possible response formats from n8n webhook
 */
export const extractImageFromResponse = (responseData: any, responseText: string): ImageGenerationResponse => {
  console.log('=== RESPONSE HANDLER: Starting image extraction ===');
  console.log('Response data type:', typeof responseData);
  console.log('Response text length:', responseText?.length || 0);
  console.log('Response data structure:', responseData);

  try {
    let imageBase64: string | null = null;

    // Method 1: Direct access to 'image' property (most common from n8n)
    if (responseData && typeof responseData === 'object' && responseData.image) {
      console.log('✅ Found image in responseData.image');
      imageBase64 = responseData.image;
    }
    // Method 2: Check for nested image data
    else if (responseData && responseData.data && responseData.data.image) {
      console.log('✅ Found image in responseData.data.image');
      imageBase64 = responseData.data.image;
    }
    // Method 3: Check for base64 property
    else if (responseData && responseData.base64) {
      console.log('✅ Found image in responseData.base64');
      imageBase64 = responseData.base64;
    }
    // Method 4: If responseData is a string, try to parse it
    else if (typeof responseData === 'string') {
      console.log('🔄 Response data is string, attempting to parse');
      try {
        const parsed = JSON.parse(responseData);
        if (parsed && parsed.image) {
          console.log('✅ Found image in parsed string');
          imageBase64 = parsed.image;
        } else if (responseData.length > 1000) {
          // Treat as raw base64 if it's a long string
          console.log('🔄 Treating long string as raw base64');
          imageBase64 = responseData;
        }
      } catch (parseError) {
        console.log('❌ Failed to parse string as JSON');
        // If it's a long string, maybe it's raw base64
        if (responseData.length > 1000) {
          console.log('🔄 Treating as raw base64');
          imageBase64 = responseData;
        }
      }
    }
    // Method 5: Parse responseText for JSON with image property
    else if (responseText && responseText.includes('"image"')) {
      console.log('🔄 Parsing response text for image property');
      try {
        const parsed = JSON.parse(responseText);
        if (parsed && parsed.image) {
          console.log('✅ Found image in parsed response text');
          imageBase64 = parsed.image;
        }
      } catch (parseError) {
        console.log('❌ Failed to parse response text as JSON');
        // Try regex extraction as fallback
        const imageMatch = responseText.match(/"image"\s*:\s*"([^"]+)"/);
        if (imageMatch && imageMatch[1]) {
          console.log('✅ Found image using regex extraction');
          imageBase64 = imageMatch[1];
        }
      }
    }
    // Method 6: Look for any base64-like patterns in response text
    else if (responseText && responseText.length > 100) {
      console.log('🔄 Searching for base64 patterns in response text');
      // Look for data URL pattern
      const dataUrlMatch = responseText.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (dataUrlMatch && dataUrlMatch[1]) {
        console.log('✅ Found base64 in data URL');
        imageBase64 = dataUrlMatch[1];
      } else {
        // Look for standalone base64 (at least 1000 chars)
        const base64Match = responseText.match(/([A-Za-z0-9+/]{1000,}={0,2})/);
        if (base64Match && base64Match[1]) {
          console.log('✅ Found standalone base64 pattern');
          imageBase64 = base64Match[1];
        }
      }
    }

    // Clean and validate the base64 string
    if (imageBase64) {
      console.log('🧹 Cleaning base64 string...');
      console.log('Original length:', imageBase64.length);
      
      // Remove data URL prefix if present
      if (imageBase64.startsWith('data:image/')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      
      // Remove any whitespace, newlines, and other unwanted characters
      imageBase64 = imageBase64.replace(/[\s\n\r\t]/g, '');
      
      console.log('Cleaned length:', imageBase64.length);
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(imageBase64)) {
        console.log('❌ Invalid base64 format');
        return {
          success: false,
          error: 'Invalid base64 format received from server'
        };
      }
      
      // Check minimum length
      if (imageBase64.length < 1000) {
        console.log('❌ Base64 string too short:', imageBase64.length);
        return {
          success: false,
          error: 'Received image data is too short to be valid'
        };
      }
      
      // Test decode a small portion
      try {
        atob(imageBase64.substring(0, 100));
        console.log('✅ Base64 validation passed');
      } catch (decodeError) {
        console.log('❌ Base64 decode test failed');
        return {
          success: false,
          error: 'Received data is not valid base64 format'
        };
      }

      console.log('=== RESPONSE HANDLER: Extraction successful ===');
      return {
        success: true,
        imageBase64: imageBase64
      };
    }

    console.log('❌ No image data found in response');
    console.log('Full response for debugging:', {
      responseData,
      responseText: responseText?.substring(0, 500) + '...'
    });

    return {
      success: false,
      error: 'No image data found in response. The image generation service may have failed.'
    };

  } catch (error) {
    console.error('=== RESPONSE HANDLER: Extraction error ===', error);
    return {
      success: false,
      error: `Failed to process response: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Handles the complete image generation request flow
 * This function should be used for all image generation requests
 */
export const handleImageGenerationRequest = async (
  webhookUrl: string,
  payload: any,
  timeoutMs: number = 120000
): Promise<ImageGenerationResponse> => {
  console.log('=== RESPONSE HANDLER: Starting request ===');
  console.log('Webhook URL:', webhookUrl);
  console.log('Payload:', payload);

  // Create abort controller for timeout
  const controller = new AbortController();
  const requestTimeout = setTimeout(() => {
    controller.abort();
    console.error('Request aborted due to timeout');
  }, timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'SEO-Engine-Image-Generator/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(requestTimeout);

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      if (response.status === 404) {
        return {
          success: false,
          error: 'Image generation service not found. Please contact support.'
        };
      } else if (response.status === 500) {
        return {
          success: false,
          error: 'Image generation service is experiencing issues. Please try again later.'
        };
      } else if (response.status === 503) {
        return {
          success: false,
          error: 'Image generation service is temporarily unavailable. Please try again in a few minutes.'
        };
      } else {
        return {
          success: false,
          error: `Service error (${response.status}): ${response.statusText}. ${errorText ? `Details: ${errorText}` : ''}`
        };
      }
    }

    // Get response as text first
    const responseText = await response.text();
    console.log('Raw response length:', responseText.length);

    if (!responseText || responseText.trim() === '') {
      return {
        success: false,
        error: 'Empty response received from image generation service. Please try again.'
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Successfully parsed JSON response');
    } catch (parseError) {
      console.log('Response is not JSON, treating as raw data');
      result = responseText.trim();
    }

    // Use the centralized image extraction function
    return extractImageFromResponse(result, responseText);

  } catch (error) {
    clearTimeout(requestTimeout);
    console.error('Request error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The image generation is taking longer than expected. Please try again in a few minutes.'
        };
      } else if (error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error. Please check your internet connection and try again.'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image. Please try again.'
    };
  }
};