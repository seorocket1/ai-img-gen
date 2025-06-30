import React, { useState, useEffect } from 'react';
import { X, Package, Upload, FileText, Wand2, Download, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
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
  const [bulkText, setBulkText] = useState('');
  const [globalStyle, setGlobalStyle] = useState('');
  const [globalColour, setGlobalColour] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setBulkItems([]);
      setBulkText('');
      setGlobalStyle('');
      setGlobalColour('');
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
      setCompletedCount(0);
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

  const parseBulkText = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    const items: BulkItem[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        if (imageType === 'blog') {
          // For blog posts, try to parse "Title | Content" format
          const parts = trimmedLine.split('|').map(part => part.trim());
          if (parts.length >= 2) {
            items.push({
              id: `bulk-${Date.now()}-${index}`,
              title: parts[0],
              content: parts.slice(1).join(' | '),
              style: globalStyle || undefined,
              colour: globalColour || undefined,
              status: 'pending',
            });
          } else {
            // If no separator, use the line as title and generate content
            items.push({
              id: `bulk-${Date.now()}-${index}`,
              title: trimmedLine,
              content: `Blog post about: ${trimmedLine}`,
              style: globalStyle || undefined,
              colour: globalColour || undefined,
              status: 'pending',
            });
          }
        } else {
          // For infographics, each line is content
          items.push({
            id: `bulk-${Date.now()}-${index}`,
            content: trimmedLine,
            style: globalStyle || undefined,
            colour: globalColour || undefined,
            status: 'pending',
          });
        }
      }
    });

    setBulkItems(items);
  };

  const removeItem = (id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

  const processItem = async (item: BulkItem, index: number): Promise<boolean> => {
    console.log(`=== BULK: PROCESSING ITEM ${index + 1} ===`);
    console.log('Item:', { id: item.id, title: item.title, content: item.content });

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

      // Extract image data using the same logic as main app
      let imageBase64 = null;

      // Method 1: Check for 'image' property in JSON response (your n8n format)
      if (result && typeof result === 'object' && result.image) {
        console.log('BULK: Found image in result.image');
        imageBase64 = result.image;
      }
      // Method 2: Check other common property names
      else if (result && typeof result === 'object') {
        const possibleKeys = ['data', 'base64', 'imageData', 'image_data'];
        for (const key of possibleKeys) {
          if (result[key] && typeof result[key] === 'string') {
            console.log(`BULK: Found image in result.${key}`);
            imageBase64 = result[key];
            break;
          }
        }
      }
      // Method 3: If response is a string, treat it as base64
      else if (typeof result === 'string' && result.length > 100) {
        console.log('BULK: Treating entire response as base64 string');
        imageBase64 = result;
      }

      if (!imageBase64) {
        console.error('BULK: No image data found in response');
        console.error('BULK: Full response:', result);
        throw new Error('No image data found in response');
      }

      // Clean the base64 string
      if (imageBase64.startsWith('data:image/')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      imageBase64 = imageBase64.replace(/\s/g, '');

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

    // Check if user has enough credits
    if (user) {
      const requiredCredits = bulkItems.length * CREDIT_COSTS[imageType];
      if (user.credits < requiredCredits) {
        alert(`Insufficient credits. You need ${requiredCredits} credits but only have ${user.credits}.`);
        return;
      }
    }

    setIsProcessing(true);
    setCompletedCount(0);
    setCurrentProcessingIndex(-1);

    let successCount = 0;

    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      console.log(`Processing item ${i + 1}/${bulkItems.length}: ${item.title || item.content.substring(0, 50)}`);
      
      const success = await processItem(item, i);
      
      if (success) {
        successCount++;
        setCompletedCount(successCount);

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bulk {imageType === 'blog' ? 'Blog' : 'Infographic'} Generation</h2>
              <p className="text-purple-100">Generate multiple images at once</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {bulkItems.length === 0 ? (
            // Input Phase
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  {imageType === 'blog' ? 'Blog Posts (one per line)' : 'Infographic Content (one per line)'}
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  disabled={isProcessing}
                  className="w-full h-64 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none disabled:opacity-50"
                  placeholder={
                    imageType === 'blog'
                      ? 'Enter blog posts, one per line. Format: "Title | Content" or just "Title"\n\nExample:\nHow to Start a Blog | Complete guide for beginners\nBest SEO Tips | Improve your website ranking\nContent Marketing Strategy'
                      : 'Enter infographic content, one per line.\n\nExample:\n5 Steps to Better Health\nTop 10 Marketing Trends 2024\nThe Future of AI Technology'
                  }
                />
                <p className="text-sm text-gray-500 mt-2">
                  {imageType === 'blog' 
                    ? 'For blog posts, use "Title | Content" format or just the title. Each line will generate one featured image.'
                    : 'Each line will generate one infographic. Be descriptive about the content you want to visualize.'
                  }
                </p>
              </div>

              {/* Global Style and Colour */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Global Style <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={globalStyle}
                    onChange={(e) => setGlobalStyle(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                    placeholder="e.g., minimalist, modern, professional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Global Colour <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={globalColour}
                    onChange={(e) => setGlobalColour(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                    placeholder="e.g., blue, red, multicolor"
                  />
                </div>
              </div>

              <button
                onClick={parseBulkText}
                disabled={!bulkText.trim() || isProcessing}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <div className="flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Parse Content
                </div>
              </button>
            </div>
          ) : (
            // Processing Phase
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-purple-900">
                    Bulk Processing {isProcessing ? 'Active' : 'Ready'}
                  </h3>
                  <div className="text-sm text-purple-700">
                    {completedCount}/{bulkItems.length} completed
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-purple-200 rounded-full h-3 mb-3">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${bulkItems.length > 0 ? (completedCount / bulkItems.length) * 100 : 0}%` }}
                  />
                </div>

                {user && (
                  <div className="text-sm text-purple-700">
                    Credits required: {bulkItems.length * CREDIT_COSTS[imageType]} 
                    (You have: {user.credits})
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bulkItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      item.status === 'completed' ? 'bg-green-50 border-green-200' :
                      item.status === 'failed' ? 'bg-red-50 border-red-200' :
                      item.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {item.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          {item.status === 'processing' && <Clock className="w-4 h-4 text-blue-600 animate-spin" />}
                          {item.title && (
                            <span className="font-semibold text-gray-900 truncate">{item.title}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                        {item.error && (
                          <p className="text-sm text-red-600 mt-1">{item.error}</p>
                        )}
                        {(item.style || item.colour) && (
                          <div className="flex items-center space-x-2 mt-2">
                            {item.style && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                Style: {item.style}
                              </span>
                            )}
                            {item.colour && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                Colour: {item.colour}
                              </span>
                            )}
                          </div>
                        )}
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
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                {!isProcessing ? (
                  <>
                    <button
                      onClick={startBulkProcessing}
                      disabled={bulkItems.length === 0}
                      className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <div className="flex items-center justify-center">
                        <Wand2 className="w-5 h-5 mr-2" />
                        Start Bulk Generation
                      </div>
                    </button>
                    <button
                      onClick={() => setBulkItems([])}
                      className="py-3 px-6 rounded-xl bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors"
                    >
                      Reset
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      Processing... {currentProcessingIndex >= 0 ? `(${currentProcessingIndex + 1}/${bulkItems.length})` : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      Please wait while we generate your images. This may take several minutes.
                    </div>
                  </div>
                )}
              </div>

              {/* Download Button */}
              {completedCount > 0 && !isProcessing && (
                <button
                  onClick={downloadAllImages}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300"
                >
                  <div className="flex items-center justify-center">
                    <Download className="w-5 h-5 mr-2" />
                    Download All Images ({completedCount} files)
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};