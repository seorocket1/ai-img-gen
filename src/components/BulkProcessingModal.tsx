import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Trash2, Upload, Download, AlertCircle, CheckCircle, Clock, Wand2 } from 'lucide-react';
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
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [globalStyle, setGlobalStyle] = useState('');
  const [globalColour, setGlobalColour] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setBulkItems([]);
      setGlobalStyle('');
      setGlobalColour('');
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
    }
  }, [isOpen]);

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
  };

  // Enhanced image extraction function that matches the main app
  const extractImageData = (responseData: any, responseText: string): string | null => {
    console.log('BULK: === EXTRACTING IMAGE DATA ===');
    console.log('BULK: Response data type:', typeof responseData);
    console.log('BULK: Response text length:', responseText.length);
    console.log('BULK: Response data keys:', responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'Not an object');

    let imageBase64 = null;

    // Method 1: Direct property access (most common case for n8n)
    if (responseData && typeof responseData === 'object') {
      // Check for 'image' property first (your n8n format)
      if (responseData.image && typeof responseData.image === 'string') {
        console.log('BULK: Found image in responseData.image');
        imageBase64 = responseData.image;
      }
      // Check other common property names
      else if (responseData.data && typeof responseData.data === 'string') {
        console.log('BULK: Found image in responseData.data');
        imageBase64 = responseData.data;
      }
      else if (responseData.base64 && typeof responseData.base64 === 'string') {
        console.log('BULK: Found image in responseData.base64');
        imageBase64 = responseData.base64;
      }
      // Check for nested structures
      else if (responseData.data && responseData.data.image) {
        console.log('BULK: Found image in responseData.data.image');
        imageBase64 = responseData.data.image;
      }
    }

    // Method 2: If response is a string, treat it as base64
    if (!imageBase64 && typeof responseData === 'string' && responseData.length > 100) {
      console.log('BULK: Treating entire response as base64 string');
      imageBase64 = responseData;
    }

    // Method 3: Parse response text for base64 patterns
    if (!imageBase64 && responseText && responseText.length > 100) {
      console.log('BULK: Searching response text for base64 patterns');
      
      // Look for data URL pattern
      const dataUrlMatch = responseText.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (dataUrlMatch && dataUrlMatch[1]) {
        console.log('BULK: Found base64 in data URL');
        imageBase64 = dataUrlMatch[1];
      }
      // Look for JSON with image property
      else {
        const imageMatch = responseText.match(/"image"\s*:\s*"([A-Za-z0-9+/=]+)"/);
        if (imageMatch && imageMatch[1]) {
          console.log('BULK: Found base64 in JSON image property');
          imageBase64 = imageMatch[1];
        }
        // Look for standalone base64 (at least 1000 chars)
        else {
          const base64Match = responseText.match(/([A-Za-z0-9+/]{1000,}={0,2})/);
          if (base64Match && base64Match[1]) {
            console.log('BULK: Found standalone base64 pattern');
            imageBase64 = base64Match[1];
          }
        }
      }
    }

    // Clean the base64 string
    if (imageBase64) {
      // Remove data URL prefix if present
      if (imageBase64.startsWith('data:image/')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      
      // Remove any whitespace
      imageBase64 = imageBase64.replace(/\s/g, '');
      
      console.log('BULK: Cleaned base64 length:', imageBase64.length);
      console.log('BULK: First 50 chars:', imageBase64.substring(0, 50));
      console.log('BULK: Last 10 chars:', imageBase64.substring(imageBase64.length - 10));
    }

    console.log('BULK: Image extraction result:', {
      found: !!imageBase64,
      length: imageBase64 ? imageBase64.length : 0,
      isValidLength: imageBase64 ? imageBase64.length > 1000 : false
    });

    return imageBase64;
  };

  const processItem = async (item: BulkItem, index: number): Promise<boolean> => {
    console.log(`BULK: === PROCESSING ITEM ${index + 1} ===`);
    console.log('BULK: Item:', { id: item.id, title: item.title, content: item.content });

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

      console.log('BULK: Sending payload:', payload);

      // Create abort controller for timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => {
        controller.abort();
        console.error('BULK: Request aborted due to timeout');
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

      console.log('BULK: Response status:', response.status);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          console.error('BULK: Could not read error response');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const responseText = await response.text();
      console.log('BULK: Response text length:', responseText.length);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('BULK: Parsed JSON result:', result);
      } catch (parseError) {
        console.log('BULK: Response was not valid JSON, treating as raw data');
        result = responseText.trim();
      }

      // Use enhanced image extraction function
      const imageBase64 = extractImageData(result, responseText);

      if (!imageBase64) {
        console.error('BULK: No image data found in response');
        console.error('BULK: Full response:', result);
        throw new Error('No image data found in response');
      }

      // Validate base64 length
      if (imageBase64.length < 1000) {
        throw new Error('Received image data is too short to be valid');
      }

      // Test base64 validity
      try {
        atob(imageBase64.substring(0, 100));
        console.log('BULK: Base64 validation passed');
      } catch (base64Error) {
        console.error('BULK: Base64 validation failed:', base64Error);
        throw new Error('Received data is not valid base64 format');
      }

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

      console.log(`BULK: Item ${index + 1} completed successfully`);
      return true;

    } catch (error) {
      console.error(`BULK: Error processing item ${index + 1}:`, error);
      
      let errorMessage = 'Failed to generate image';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out';
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

    setIsProcessing(true);
    setCurrentProcessingIndex(-1);

    let successCount = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      console.log(`BULK: Processing item ${i + 1}/${bulkItems.length}: ${item.title || item.content.substring(0, 50)}`);
      
      const success = await processItem(item, i);
      
      if (success) {
        successCount++;

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
      }

      // Small delay between requests to avoid overwhelming the server
      if (i < bulkItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    // Notify parent about completion
    onBulkCompleted(successCount, bulkItems.length);

    console.log(`BULK: Processing completed. ${successCount}/${bulkItems.length} successful.`);
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

  if (!isOpen) return null;

  const completedCount = bulkItems.filter(item => item.status === 'completed').length;
  const totalCreditsNeeded = bulkItems.length * CREDIT_COSTS[imageType];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {!isProcessing && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
    </div>
  );
};