import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Trash2, Download, AlertCircle, CheckCircle, Clock, Wand2, Eye, ZoomIn } from 'lucide-react';
import { sanitizeFormData } from '../utils/textSanitizer';
import { HistoryImage } from '../types/history';
import { User } from '../lib/supabase';
import JSZip from 'jszip';

interface BulkProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageType: 'blog' | 'infographic';
  onProcessingStateChange: (isProcessing: boolean) => void;
  onProgressUpdate: (progress: { completed: number; total: number }) => void;
  onImageGenerated: (image: HistoryImage) => void;
  onBulkCompleted: (completedCount: number, totalCount: number) => void;
  user: User | null;
  onRefreshUser: () => void;
}

interface BulkItem {
  id: string;
  title?: string;
  content: string;
  style?: string;
  colour?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageData?: string;
  error?: string;
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

// Credit costs
const CREDIT_COSTS = {
  blog: 5,
  infographic: 10,
};

// Global state to persist modal data across open/close
let globalBulkState: {
  [key: string]: {
    items: BulkItem[];
    isProcessing: boolean;
    currentProcessingIndex: number;
    globalStyle: string;
    globalColour: string;
  }
} = {};

export const BulkProcessingModal: React.FC<BulkProcessingModalProps> = ({
  isOpen,
  onClose,
  imageType,
  onProcessingStateChange,
  onProgressUpdate,
  onImageGenerated,
  onBulkCompleted,
  user,
  onRefreshUser,
}) => {
  const stateKey = `bulk_${imageType}`;
  
  // Initialize state from global state or defaults
  const [bulkItems, setBulkItems] = useState<BulkItem[]>(() => 
    globalBulkState[stateKey]?.items || []
  );
  const [globalStyle, setGlobalStyle] = useState(() => 
    globalBulkState[stateKey]?.globalStyle || ''
  );
  const [globalColour, setGlobalColour] = useState(() => 
    globalBulkState[stateKey]?.globalColour || ''
  );
  const [isProcessing, setIsProcessing] = useState(() => 
    globalBulkState[stateKey]?.isProcessing || false
  );
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(() => 
    globalBulkState[stateKey]?.currentProcessingIndex || -1
  );
  const [previewImage, setPreviewImage] = useState<{ base64: string; title: string } | null>(null);

  // Save state to global state whenever it changes
  useEffect(() => {
    globalBulkState[stateKey] = {
      items: bulkItems,
      isProcessing,
      currentProcessingIndex,
      globalStyle,
      globalColour,
    };
  }, [bulkItems, isProcessing, currentProcessingIndex, globalStyle, globalColour, stateKey]);

  useEffect(() => {
    // Update parent component about processing state
    onProcessingStateChange(isProcessing);
    
    if (isProcessing && bulkItems.length > 0) {
      const completed = bulkItems.filter(item => item.status === 'completed').length;
      onProgressUpdate({ completed, total: bulkItems.length });
    }
  }, [isProcessing, bulkItems, onProcessingStateChange, onProgressUpdate]);

  const addNewItem = () => {
    const newItem: BulkItem = {
      id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: imageType === 'blog' ? '' : undefined,
      content: '',
      style: globalStyle || undefined,
      colour: globalColour || undefined,
      status: 'pending',
    };
    setBulkItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof BulkItem, value: string) => {
    setBulkItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAllItems = () => {
    setBulkItems([]);
    setIsProcessing(false);
    setCurrentProcessingIndex(-1);
  };

  // Enhanced image extraction function (same as single image generation)
  const extractImageData = (responseData: any, responseText: string): string | null => {
    console.log('BULK: ========================================');
    console.log('BULK: STARTING IMAGE EXTRACTION');
    console.log('BULK: ========================================');
    console.log('BULK: Response data type:', typeof responseData);
    console.log('BULK: Response data:', responseData);
    console.log('BULK: Response text length:', responseText.length);
    console.log('BULK: Response text (first 500 chars):', responseText.substring(0, 500));
    console.log('BULK: Response text (last 200 chars):', responseText.substring(Math.max(0, responseText.length - 200)));

    let imageBase64 = null;

    // Method 1: Direct access to 'image' property in parsed object
    if (responseData && typeof responseData === 'object' && responseData.image) {
      console.log('BULK: ✅ Method 1: Found image property in response object');
      console.log('BULK: Image property type:', typeof responseData.image);
      console.log('BULK: Image property length:', responseData.image.length);
      console.log('BULK: Image property (first 100 chars):', responseData.image.substring(0, 100));
      imageBase64 = responseData.image;
    }
    // Method 2: If responseData is a string, try to parse it as JSON
    else if (typeof responseData === 'string') {
      console.log('BULK: 🔄 Method 2: Response data is string, attempting JSON parse');
      try {
        const parsed = JSON.parse(responseData);
        console.log('BULK: Successfully parsed string as JSON');
        console.log('BULK: Parsed object keys:', Object.keys(parsed));
        if (parsed && parsed.image) {
          console.log('BULK: ✅ Found image in parsed string');
          console.log('BULK: Image length:', parsed.image.length);
          imageBase64 = parsed.image;
        } else {
          console.log('BULK: ❌ No image property in parsed object');
        }
      } catch (parseError) {
        console.log('BULK: ❌ Failed to parse string as JSON:', parseError);
        // If it's a long string, maybe it's raw base64
        if (responseData.length > 1000) {
          console.log('BULK: 🔄 Treating long string as potential raw base64');
          imageBase64 = responseData;
        }
      }
    }
    // Method 3: Parse responseText directly
    else if (responseText && responseText.includes('"image"')) {
      console.log('BULK: 🔄 Method 3: Parsing response text for image property');
      try {
        const parsed = JSON.parse(responseText);
        console.log('BULK: Successfully parsed response text as JSON');
        console.log('BULK: Parsed object keys:', Object.keys(parsed));
        if (parsed && parsed.image) {
          console.log('BULK: ✅ Found image in parsed response text');
          console.log('BULK: Image length:', parsed.image.length);
          imageBase64 = parsed.image;
        }
      } catch (parseError) {
        console.log('BULK: ❌ Failed to parse response text as JSON, trying regex');
        // Try regex extraction as fallback
        const match = responseText.match(/"image"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          console.log('BULK: ✅ Found image using regex extraction');
          console.log('BULK: Regex match length:', match[1].length);
          imageBase64 = match[1];
        } else {
          console.log('BULK: ❌ Regex extraction failed');
        }
      }
    }
    // Method 4: Look for any base64-like patterns in the response
    else {
      console.log('BULK: 🔄 Method 4: Looking for base64 patterns in response');
      // Look for long base64-like strings
      const base64Pattern = /[A-Za-z0-9+/]{1000,}={0,2}/g;
      const matches = responseText.match(base64Pattern);
      if (matches && matches.length > 0) {
        console.log('BULK: ✅ Found base64 pattern, using first match');
        console.log('BULK: Pattern match length:', matches[0].length);
        imageBase64 = matches[0];
      } else {
        console.log('BULK: ❌ No base64 patterns found');
      }
    }

    // Clean and validate the base64 string
    if (imageBase64) {
      console.log('BULK: 🧹 Cleaning base64 string...');
      console.log('BULK: Original length:', imageBase64.length);
      
      // Remove data URL prefix if present
      if (imageBase64.startsWith('data:image/')) {
        console.log('BULK: Removing data URL prefix');
        imageBase64 = imageBase64.split(',')[1];
      }
      
      // Remove any whitespace, newlines, and other unwanted characters
      const originalLength = imageBase64.length;
      imageBase64 = imageBase64.replace(/[\s\n\r\t]/g, '');
      console.log('BULK: Removed whitespace, length change:', originalLength, '->', imageBase64.length);
      
      console.log('BULK: Final cleaned length:', imageBase64.length);
      console.log('BULK: First 50 chars:', imageBase64.substring(0, 50));
      console.log('BULK: Last 20 chars:', imageBase64.substring(imageBase64.length - 20));
      
      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(imageBase64)) {
        console.log('BULK: ❌ Invalid base64 format detected');
        console.log('BULK: Invalid characters found in base64 string');
        return null;
      }
      
      // Check minimum length
      if (imageBase64.length < 1000) {
        console.log('BULK: ❌ Base64 string too short:', imageBase64.length);
        return null;
      }
      
      // Test decode a small portion
      try {
        atob(imageBase64.substring(0, 100));
        console.log('BULK: ✅ Base64 decode test passed');
      } catch (decodeError) {
        console.log('BULK: ❌ Base64 decode test failed:', decodeError);
        return null;
      }
    }

    console.log('BULK: ========================================');
    console.log('BULK: EXTRACTION RESULT:', {
      found: !!imageBase64,
      length: imageBase64 ? imageBase64.length : 0,
      isValidLength: imageBase64 ? imageBase64.length > 1000 : false
    });
    console.log('BULK: ========================================');

    return imageBase64;
  };

  const processItem = async (item: BulkItem, index: number): Promise<boolean> => {
    console.log(`BULK: ==========================================`);
    console.log(`BULK: PROCESSING ITEM ${index + 1}/${bulkItems.length}`);
    console.log(`BULK: ==========================================`);
    console.log('BULK: Item details:', { 
      id: item.id, 
      title: item.title, 
      content: item.content.substring(0, 100) + '...',
      style: item.style,
      colour: item.colour
    });

    try {
      // Update item status to processing
      setBulkItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'processing' } : i
      ));
      setCurrentProcessingIndex(index);

      // Sanitize the data
      const sanitizedData = sanitizeFormData({
        title: item.title,
        content: item.content,
        style: item.style,
        colour: item.colour,
      });

      // Prepare image detail
      let imageDetail = '';
      if (imageType === 'blog') {
        imageDetail = `Blog post title: '${sanitizedData.title}', Content: ${sanitizedData.content}`;
      } else {
        imageDetail = sanitizedData.content;
      }

      // Add style and colour if specified
      if (sanitizedData.style) {
        imageDetail += `, Style: ${sanitizedData.style}`;
      }
      if (sanitizedData.colour) {
        imageDetail += `, Colour: ${sanitizedData.colour}`;
      }

      // Prepare payload
      const payload = {
        image_type: imageType === 'blog' ? 'Featured Image' : 'Infographic',
        image_detail: imageDetail,
      };

      console.log('BULK: 📤 Sending request to webhook...');
      console.log('BULK: Webhook URL:', WEBHOOK_URL);
      console.log('BULK: Payload:', JSON.stringify(payload, null, 2));

      // Create abort controller for timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => {
        controller.abort();
        console.error('BULK: ⏰ Request aborted due to timeout (2 minutes)');
      }, 120000); // 2 minutes timeout

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'SEO-Engine-Bulk-Generator/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(requestTimeout);

      console.log('BULK: 📥 Response received');
      console.log('BULK: Response status:', response.status);
      console.log('BULK: Response ok:', response.ok);
      console.log('BULK: Response status text:', response.statusText);
      console.log('BULK: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('BULK: Error response body:', errorText);
        } catch (e) {
          console.error('BULK: Could not read error response body');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const responseText = await response.text();
      console.log('BULK: 📄 Raw response received');
      console.log('BULK: Response text length:', responseText.length);
      console.log('BULK: Response text type:', typeof responseText);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('BULK: ✅ Successfully parsed response as JSON');
        console.log('BULK: Parsed result type:', typeof result);
        console.log('BULK: Parsed result keys:', result && typeof result === 'object' ? Object.keys(result) : 'Not an object');
      } catch (parseError) {
        console.log('BULK: ❌ Failed to parse response as JSON:', parseError);
        console.log('BULK: Treating response as raw text');
        result = responseText.trim();
      }

      // Use enhanced image extraction function
      const imageBase64 = extractImageData(result, responseText);

      if (!imageBase64) {
        console.error('BULK: 💥 CRITICAL: No image data extracted');
        console.error('BULK: This means the extraction failed completely');
        console.error('BULK: Full response for debugging:', {
          result,
          responseText: responseText.substring(0, 1000) + '...'
        });
        throw new Error('No image data found in response. The image generation service may have failed.');
      }

      console.log('BULK: ✅ Image extraction successful!');
      console.log('BULK: Final image data length:', imageBase64.length);

      // Update item with success
      setBulkItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'completed', imageData: imageBase64 } : i
      ));

      // Create history image object
      const historyImage: HistoryImage = {
        id: `${item.id}-${Date.now()}`,
        type: imageType,
        title: item.title || (imageType === 'blog' ? 'Blog Image' : 'Infographic'),
        content: item.content,
        base64: imageBase64,
        timestamp: Date.now(),
        style: item.style,
        colour: item.colour,
      };

      // Add to history
      onImageGenerated(historyImage);

      console.log(`BULK: ✅ Item ${index + 1} completed successfully`);
      return true;

    } catch (error) {
      console.error(`BULK: 💥 Error processing item ${index + 1}:`, error);
      console.error('BULK: Error type:', typeof error);
      console.error('BULK: Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('BULK: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('BULK: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = 'Failed to generate image';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out after 2 minutes';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Invalid response format from server';
        } else if (error.message.includes('Empty response')) {
          errorMessage = 'No response received from server';
        } else if (error.message.includes('base64')) {
          errorMessage = 'Invalid image data received';
        } else if (error.message.includes('HTTP')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      // Update item with error
      setBulkItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'failed', error: errorMessage } : i
      ));

      return false;
    }
  };

  const startBulkProcessing = async () => {
    if (bulkItems.length === 0) return;

    // Validate all items have required content
    const invalidItems = bulkItems.filter(item => {
      if (imageType === 'blog') {
        return !item.title?.trim() || !item.content?.trim();
      } else {
        return !item.content?.trim();
      }
    });

    if (invalidItems.length > 0) {
      alert(`Please fill in all required fields for all items before processing.`);
      return;
    }

    // Check if user has enough credits
    if (user) {
      const requiredCredits = bulkItems.length * CREDIT_COSTS[imageType];
      if (user.credits < requiredCredits) {
        alert(`Insufficient credits. You need ${requiredCredits} credits but only have ${user.credits}.`);
        return;
      }
    }

    console.log('BULK: 🚀 Starting bulk processing...');
    console.log('BULK: Total items to process:', bulkItems.length);
    console.log('BULK: Image type:', imageType);

    setIsProcessing(true);
    setCurrentProcessingIndex(-1);

    let successCount = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      console.log(`BULK: 🔄 Starting item ${i + 1}/${bulkItems.length}`);
      
      const success = await processItem(item, i);
      
      if (success) {
        successCount++;
        console.log(`BULK: ✅ Item ${i + 1} successful. Total successes: ${successCount}`);

        // Deduct credits for successful generations
        if (user) {
          try {
            const { deductCredits } = await import('../lib/supabase');
            await deductCredits(user.id, CREDIT_COSTS[imageType]);
            onRefreshUser(); // Refresh user data
          } catch (creditError) {
            console.error('BULK: Error deducting credits:', creditError);
          }
        }

        // Save to database if user is authenticated
        if (user) {
          try {
            const { saveImageGeneration } = await import('../lib/supabase');
            await saveImageGeneration({
              user_id: user.id,
              image_type: imageType,
              title: item.title,
              content: item.content,
              style: item.style,
              colour: item.colour,
              credits_used: CREDIT_COSTS[imageType],
              image_data: bulkItems.find(i => i.id === item.id)?.imageData || '',
            });
          } catch (dbError) {
            console.error('BULK: Error saving to database:', dbError);
          }
        }
      } else {
        console.log(`BULK: ❌ Item ${i + 1} failed`);
      }

      // Small delay between requests to avoid overwhelming the server
      if (i < bulkItems.length - 1) {
        console.log('BULK: ⏳ Waiting 1 second before next request...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    // Notify parent about completion
    onBulkCompleted(successCount, bulkItems.length);

    console.log('BULK: 🏁 Bulk processing completed!');
    console.log(`BULK: Final results: ${successCount}/${bulkItems.length} successful`);
  };

  const downloadImage = (item: BulkItem) => {
    if (!item.imageData) return;
    
    try {
      const byteCharacters = atob(item.imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const title = item.title || item.content?.substring(0, 30) || 'image';
      const safeTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '-').toLowerCase();
      link.download = `seo-engine-${imageType}-${safeTitle}-${Date.now()}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const downloadAllImages = async () => {
    const completedItems = bulkItems.filter(item => item.status === 'completed' && item.imageData);
    
    if (completedItems.length === 0) {
      alert('No completed images to download');
      return;
    }

    try {
      const zip = new JSZip();
      
      completedItems.forEach((item, index) => {
        if (item.imageData) {
          const fileName = `${imageType}-${item.title || `image-${index + 1}`}.png`
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
          
          // Convert base64 to binary
          const binaryString = atob(item.imageData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          zip.file(fileName, bytes);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seo-engine-bulk-${imageType}-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip file:', error);
      alert('Failed to create download file');
    }
  };

  const handleClose = () => {
    // Simply close without any confirmation dialog to prevent browser notifications
    onClose();
  };

  if (!isOpen) return null;

  const completedCount = bulkItems.filter(item => item.status === 'completed').length;
  const totalCreditsNeeded = bulkItems.length * CREDIT_COSTS[imageType];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white relative flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bulk Processing</h2>
                <p className="text-blue-100">Generate multiple {imageType} images at once</p>
              </div>
            </div>
            {user && (
              <div className="text-right">
                <div className="text-sm text-blue-100">Available Credits</div>
                <div className="text-2xl font-bold">{user.credits}</div>
              </div>
            )}
          </div>
        </div>

        {/* Processing Status */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Processing Status</h3>
            <span className="text-sm text-gray-600">{completedCount}/{bulkItems.length} completed</span>
          </div>
          {bulkItems.length > 0 && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${bulkItems.length > 0 ? (completedCount / bulkItems.length) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {bulkItems.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Started</h3>
              <p className="text-gray-600 mb-6">Add your first {imageType} item to begin bulk processing</p>
              <button
                onClick={addNewItem}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 mr-2 inline" />
                Add First Item
              </button>
            </div>
          ) : (
            // Items list
            <div className="space-y-4">
              {/* Add new item button */}
              <button
                onClick={addNewItem}
                disabled={isProcessing}
                className="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 mr-2 inline" />
                Add {imageType === 'blog' ? 'Blog Post' : 'Infographic'} Item
              </button>

              {/* Items */}
              {bulkItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    item.status === 'completed' ? 'bg-green-50 border-green-200' :
                    item.status === 'failed' ? 'bg-red-50 border-red-200' :
                    item.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                    'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {item.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {item.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
                        {item.status === 'processing' && <Clock className="w-5 h-5 text-blue-600 animate-spin" />}
                        {item.status === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}
                      </div>
                      <h4 className="font-semibold text-gray-900">
                        {imageType === 'blog' ? 'Blog Post' : 'Infographic'} #{index + 1}
                      </h4>
                      <span className="text-sm text-gray-500">
                        Cost: {CREDIT_COSTS[imageType]} credits
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Preview and Download buttons for completed items */}
                      {item.status === 'completed' && item.imageData && (
                        <>
                          <button
                            onClick={() => setPreviewImage({ 
                              base64: item.imageData!, 
                              title: item.title || item.content.substring(0, 30) 
                            })}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Preview Image"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadImage(item)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Download Image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {!isProcessing && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {imageType === 'blog' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Blog Title *
                        </label>
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter blog title..."
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {imageType === 'blog' ? 'Blog Content / Keywords *' : 'Content to Visualize *'}
                      </label>
                      <textarea
                        value={item.content}
                        onChange={(e) => updateItem(item.id, 'content', e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={3}
                        placeholder={
                          imageType === 'blog' 
                            ? "Enter blog content, summary, or keywords..."
                            : "Enter content to visualize..."
                        }
                      />
                    </div>

                    {/* Style and Colour in a row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Style (Optional)
                        </label>
                        <select
                          value={item.style || ''}
                          onChange={(e) => updateItem(item.id, 'style', e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Default</option>
                          <option value="minimalist">Minimalist</option>
                          <option value="modern">Modern</option>
                          <option value="professional">Professional</option>
                          <option value="creative">Creative</option>
                          <option value="elegant">Elegant</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Colour (Optional)
                        </label>
                        <select
                          value={item.colour || ''}
                          onChange={(e) => updateItem(item.id, 'colour', e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Default</option>
                          <option value="blue">Blue</option>
                          <option value="red">Red</option>
                          <option value="green">Green</option>
                          <option value="purple">Purple</option>
                          <option value="orange">Orange</option>
                          <option value="multicolor">Multicolor</option>
                        </select>
                      </div>
                    </div>

                    {item.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {item.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {bulkItems.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-6 flex-shrink-0">
            <div className="flex items-center justify-between space-x-4">
              <button
                onClick={startBulkProcessing}
                disabled={isProcessing || bulkItems.length === 0}
                className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Wand2 className="w-5 h-5 mr-2 inline" />
                Process All Items ({bulkItems.length}) - {totalCreditsNeeded} Credits
              </button>
              
              {completedCount > 0 && (
                <button
                  onClick={downloadAllImages}
                  disabled={isProcessing}
                  className="py-3 px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-5 h-5 mr-2 inline" />
                  Download ZIP ({completedCount})
                </button>
              )}
              
              <button
                onClick={clearAllItems}
                disabled={isProcessing}
                className="py-3 px-6 bg-gray-500 text-white rounded-xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Image Preview</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              <div className="flex items-center justify-center">
                <img
                  src={`data:image/png;base64,${previewImage.base64}`}
                  alt={previewImage.title}
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                />
              </div>
            </div>
            
            {/* Preview Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{previewImage.title}</span>
                <button
                  onClick={() => {
                    // Find the item and download it
                    const item = bulkItems.find(i => i.imageData === previewImage.base64);
                    if (item) downloadImage(item);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2 inline" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};