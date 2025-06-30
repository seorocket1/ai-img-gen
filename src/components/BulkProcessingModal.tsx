import React, { useState, useEffect } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, Clock, Package, Plus, Trash2, Eye, Palette, Lightbulb, Brush, Sparkles, Zap, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, ChevronDown } from 'lucide-react';
import JSZip from 'jszip';
import { sanitizeFormData, createSafeFilename } from '../utils/textSanitizer';
import { HistoryImage } from '../types/history';

interface BulkItem {
  id: string;
  type: 'blog' | 'infographic';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string; // base64 image
  error?: string;
  processingStep?: number; // Current step index
}

interface BulkProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageType: 'blog' | 'infographic';
  onProcessingStateChange?: (isProcessing: boolean) => void;
  onProgressUpdate?: (progress: { completed: number; total: number }) => void;
  onImageGenerated?: (image: HistoryImage) => void;
  onBulkCompleted?: (completedCount: number, totalCount: number) => void;
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

const PROCESSING_STEPS = [
  { text: "Understanding your request...", icon: Lightbulb, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  { text: "Ideating creative concepts...", icon: Sparkles, color: "text-purple-500", bgColor: "bg-purple-50" },
  { text: "Dipping the digital brush...", icon: Brush, color: "text-blue-500", bgColor: "bg-blue-50" },
  { text: "Opening the creative canvas...", icon: Palette, color: "text-green-500", bgColor: "bg-green-50" },
  { text: "Painting your masterpiece...", icon: ImageIcon, color: "text-pink-500", bgColor: "bg-pink-50" },
  { text: "Adding final touches...", icon: Zap, color: "text-orange-500", bgColor: "bg-orange-50" },
];

const STYLE_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'very simple', label: 'Very Simple' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'modern', label: 'Modern' },
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'bold', label: 'Bold' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'custom', label: 'Custom (specify below)' },
];

const COLOUR_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink', label: 'Pink' },
  { value: 'teal', label: 'Teal' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
  { value: 'gray', label: 'Gray' },
  { value: 'multicolor', label: 'Multicolor' },
  { value: 'custom', label: 'Custom (specify below)' },
];

export const BulkProcessingModal: React.FC<BulkProcessingModalProps> = ({
  isOpen,
  onClose,
  imageType,
  onProcessingStateChange,
  onProgressUpdate,
  onImageGenerated,
  onBulkCompleted,
}) => {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ base64: string; title: string; item: BulkItem } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Notify parent component about processing state changes
  useEffect(() => {
    onProcessingStateChange?.(isProcessing);
  }, [isProcessing, onProcessingStateChange]);

  // Update progress when items change
  useEffect(() => {
    const validItems = items.filter(item => {
      if (item.type === 'blog') {
        return item.data.title?.trim() && item.data.intro?.trim();
      } else {
        return item.data.content?.trim();
      }
    });
    
    const completedItems = validItems.filter(item => item.status === 'completed');
    
    if (validItems.length > 0) {
      onProgressUpdate?.({
        completed: completedItems.length,
        total: validItems.length
      });
    }
  }, [items, onProgressUpdate]);

  const addNewItem = () => {
    const newItem: BulkItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: imageType,
      data: imageType === 'blog' 
        ? { title: '', intro: '', style: '', customStyle: '', colour: '', customColour: '' }
        : { content: '', style: '', customStyle: '', colour: '', customColour: '' },
      status: 'pending',
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemData = (id: string, data: any) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, data: sanitizeFormData(data), status: 'pending' }
        : item
    ));
  };

  const downloadSingleImage = (item: BulkItem, format: 'png' | 'jpeg' | 'webp' = 'png') => {
    if (!item.result) return;

    try {
      // Convert base64 to blob
      const byteCharacters = atob(item.result);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Create canvas to convert format if needed
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Convert to desired format
        const mimeType = `image/${format}`;
        const quality = format === 'jpeg' ? 0.9 : undefined;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const baseName = item.type === 'blog' 
              ? createSafeFilename(item.data.title)
              : createSafeFilename(item.data.content);
            
            link.download = `${baseName || `${item.type}-${Date.now()}`}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, mimeType, quality);
      };
      
      img.src = `data:image/png;base64,${item.result}`;
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const processItem = async (item: BulkItem): Promise<BulkItem> => {
    try {
      // Simulate processing steps with delays and animations
      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        setItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, processingStep: i }
              : prevItem
          )
        );
        
        // Add delay between steps (except for the last step which will be the actual API call)
        if (i < PROCESSING_STEPS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      // Prepare the final style and colour values
      const finalStyle = item.data.style === 'custom' ? item.data.customStyle?.trim() : item.data.style;
      const finalColour = item.data.colour === 'custom' ? item.data.customColour?.trim() : item.data.colour;

      let imageDetail = '';
      if (item.type === 'blog') {
        imageDetail = `Blog post title: '${item.data.title}', Content: ${item.data.intro}`;
      } else {
        imageDetail = item.data.content;
      }

      // Add style and colour to the image detail if specified
      if (finalStyle) {
        imageDetail += `, Style: ${finalStyle}`;
      }
      if (finalColour) {
        imageDetail += `, Colour: ${finalColour}`;
      }

      const payload = {
        image_type: item.type === 'blog' ? 'Featured Image' : 'Infographic',
        image_detail: imageDetail,
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.image) {
        const completedItem = {
          ...item,
          status: 'completed' as const,
          result: result.image,
          processingStep: undefined,
        };

        // Add to history with proper structure
        const historyImage: HistoryImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: item.type,
          base64: result.image,
          title: item.type === 'blog' ? item.data.title : 'Infographic',
          content: item.type === 'blog' ? item.data.intro : item.data.content,
          timestamp: Date.now(),
          style: finalStyle,
          colour: finalColour,
        };

        console.log('Adding bulk image to history:', historyImage);
        onImageGenerated?.(historyImage);

        return completedItem;
      } else {
        throw new Error('No image data received from the server');
      }
    } catch (error) {
      return {
        ...item,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingStep: undefined,
      };
    }
  };

  const processBulkItems = async () => {
    const validItems = items.filter(item => {
      if (item.type === 'blog') {
        return item.data.title?.trim() && item.data.intro?.trim();
      } else {
        return item.data.content?.trim();
      }
    });

    if (validItems.length === 0) {
      alert('Please fill out at least one complete form before processing.');
      return;
    }

    setIsProcessing(true);
    const updatedItems = [...items];
    let completedCount = 0;

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      
      // Skip items that don't have valid data
      if (item.type === 'blog' && (!item.data.title?.trim() || !item.data.intro?.trim())) {
        continue;
      }
      if (item.type === 'infographic' && !item.data.content?.trim()) {
        continue;
      }
      
      if (item.status !== 'pending') continue;

      setCurrentProcessing(item.id);
      updatedItems[i] = { ...updatedItems[i], status: 'processing' };
      setItems([...updatedItems]);

      // Add delay between requests to avoid overwhelming the server
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const processedItem = await processItem(updatedItems[i]);
      updatedItems[i] = processedItem;
      setItems([...updatedItems]);

      if (processedItem.status === 'completed') {
        completedCount++;
      }
    }

    setCurrentProcessing(null);
    setIsProcessing(false);

    // Notify parent about bulk completion
    console.log('Bulk processing completed:', completedCount, 'out of', validItems.length);
    onBulkCompleted?.(completedCount, validItems.length);
  };

  const downloadAllAsZip = async () => {
    const completedItems = items.filter(item => item.status === 'completed' && item.result);
    
    if (completedItems.length === 0) {
      alert('No completed images to download');
      return;
    }

    const zip = new JSZip();

    completedItems.forEach((item, index) => {
      if (!item.result) return;

      // Convert base64 to binary
      const byteCharacters = atob(item.result);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Create filename
      const baseName = item.type === 'blog' 
        ? createSafeFilename(item.data.title)
        : createSafeFilename(item.data.content);
      
      const filename = `${baseName || `${item.type}-${index + 1}`}.png`;
      
      zip.file(filename, byteArray);
    });

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seo-engine-${imageType}-images-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: BulkItem['status'], processingStep?: number) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'processing':
        if (processingStep !== undefined && processingStep < PROCESSING_STEPS.length) {
          const StepIcon = PROCESSING_STEPS[processingStep].icon;
          return <StepIcon className={`w-4 h-4 animate-pulse ${PROCESSING_STEPS[processingStep].color}`} />;
        }
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const openPreview = (item: BulkItem, index: number) => {
    if (!item.result) return;
    
    const title = item.type === 'blog' 
      ? item.data.title || `Blog Post ${index + 1}`
      : `Infographic ${index + 1}`;
    
    setPreviewImage({
      base64: item.result,
      title,
      item
    });
    setZoomLevel(1); // Reset zoom when opening preview
  };

  const handleClose = () => {
    if (isProcessing) {
      // Allow closing but keep processing in background
      onClose();
    } else {
      onClose();
    }
  };

  const completedCount = items.filter(item => item.status === 'completed').length;
  const errorCount = items.filter(item => item.status === 'error').length;
  const validItemsCount = items.filter(item => {
    if (item.type === 'blog') {
      return item.data.title?.trim() && item.data.intro?.trim();
    } else {
      return item.data.content?.trim();
    }
  }).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative flex-shrink-0">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bulk Processing</h2>
                <p className="text-blue-100">Generate multiple {imageType} images at once</p>
              </div>
            </div>
          </div>

          {/* Processing Warning */}
          {isProcessing && (
            <div className="bg-blue-50 border-b border-blue-200 p-4 flex-shrink-0">
              <div className="flex items-center text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-sm font-medium">
                  Bulk processing is currently running. Please wait for completion before starting another process.
                </span>
              </div>
            </div>
          )}

          {/* Progress Summary */}
          {items.length > 0 && (
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Processing Status</h3>
                <div className="text-sm text-gray-600">
                  {completedCount}/{validItemsCount} completed
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isProcessing ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'
                  }`}
                  style={{ width: validItemsCount > 0 ? `${(completedCount / validItemsCount) * 100}%` : '0%' }}
                />
              </div>
              {errorCount > 0 && (
                <p className="text-sm text-red-600 mt-2">{errorCount} items failed</p>
              )}
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                        currentProcessing === item.id
                          ? 'border-blue-300 bg-blue-50'
                          : item.status === 'completed'
                          ? 'border-green-200 bg-green-50'
                          : item.status === 'error'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          {getStatusIcon(item.status, item.processingStep)}
                          <div className="ml-3">
                            <span className="font-semibold text-gray-900">
                              {imageType === 'blog' ? 'Blog Post' : 'Infographic'} #{index + 1}
                            </span>
                            {item.status === 'processing' && item.processingStep !== undefined && (
                              <div className={`mt-2 p-3 rounded-lg ${PROCESSING_STEPS[item.processingStep].bgColor} border border-opacity-20`}>
                                <div className="flex items-center">
                                  {React.createElement(PROCESSING_STEPS[item.processingStep].icon, {
                                    className: `w-5 h-5 mr-3 animate-pulse ${PROCESSING_STEPS[item.processingStep].color}`
                                  })}
                                  <div>
                                    <p className={`text-sm font-medium ${PROCESSING_STEPS[item.processingStep].color}`}>
                                      Step {item.processingStep + 1} of {PROCESSING_STEPS.length}
                                    </p>
                                    <p className="text-sm text-gray-600 animate-pulse">
                                      {PROCESSING_STEPS[item.processingStep].text}
                                    </p>
                                  </div>
                                </div>
                                {/* Progress bar for current step */}
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className={`h-1 rounded-full transition-all duration-1000 ${PROCESSING_STEPS[item.processingStep].color.replace('text-', 'bg-')}`}
                                    style={{ width: `${((item.processingStep + 1) / PROCESSING_STEPS.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.status === 'completed' && item.result && (
                            <>
                              <button
                                onClick={() => openPreview(item, index)}
                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Preview Image"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadSingleImage(item)}
                                className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                title="Download Image"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={isProcessing}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Form Fields */}
                      {imageType === 'blog' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Blog Title *
                            </label>
                            <input
                              type="text"
                              value={item.data.title || ''}
                              onChange={(e) => updateItemData(item.id, { ...item.data, title: e.target.value })}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                              placeholder="Enter blog title..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Blog Content / Keywords *
                            </label>
                            <textarea
                              value={item.data.intro || ''}
                              onChange={(e) => updateItemData(item.id, { ...item.data, intro: e.target.value })}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none h-24 disabled:opacity-50"
                              placeholder="Enter blog content, summary, or keywords..."
                            />
                          </div>
                          
                          {/* Style and Colour for Blog */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Style <span className="text-gray-500 font-normal">(Optional)</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={item.data.style || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, style: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50"
                                >
                                  {STYLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {item.data.style === 'custom' && (
                                <input
                                  type="text"
                                  value={item.data.customStyle || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, customStyle: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                                  placeholder="Specify custom style..."
                                />
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Colour <span className="text-gray-500 font-normal">(Optional)</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={item.data.colour || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, colour: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50"
                                >
                                  {COLOUR_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {item.data.colour === 'custom' && (
                                <input
                                  type="text"
                                  value={item.data.customColour || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, customColour: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                                  placeholder="Specify custom colour..."
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Content to Visualize *
                            </label>
                            <textarea
                              value={item.data.content || ''}
                              onChange={(e) => updateItemData(item.id, { ...item.data, content: e.target.value })}
                              disabled={isProcessing}
                              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none h-32 disabled:opacity-50"
                              placeholder="Enter content, data points, or statistics to visualize..."
                            />
                          </div>
                          
                          {/* Style and Colour for Infographic */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Style <span className="text-gray-500 font-normal">(Optional)</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={item.data.style || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, style: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50"
                                >
                                  {STYLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {item.data.style === 'custom' && (
                                <input
                                  type="text"
                                  value={item.data.customStyle || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, customStyle: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                                  placeholder="Specify custom style..."
                                />
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Colour <span className="text-gray-500 font-normal">(Optional)</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={item.data.colour || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, colour: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50"
                                >
                                  {COLOUR_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {item.data.colour === 'custom' && (
                                <input
                                  type="text"
                                  value={item.data.customColour || ''}
                                  onChange={(e) => updateItemData(item.id, { ...item.data, customColour: e.target.value })}
                                  disabled={isProcessing}
                                  className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                                  placeholder="Specify custom colour..."
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error Display */}
                      {item.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{item.error}</p>
                        </div>
                      )}

                      {/* Completed Image Preview */}
                      {item.status === 'completed' && item.result && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                              <span className="text-sm font-medium text-green-700">Image generated successfully!</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openPreview(item, index)}
                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => downloadSingleImage(item)}
                                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add More Item Button */}
              <button
                onClick={addNewItem}
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                <div className="flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add {imageType === 'blog' ? 'Blog Post' : 'Infographic'} Item
                </div>
              </button>

              {/* Getting Started Message */}
              {items.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Started</h3>
                  <p className="text-gray-600 mb-6">
                    Add your first {imageType} item to begin bulk processing
                  </p>
                  <button
                    onClick={addNewItem}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                  >
                    <div className="flex items-center">
                      <Plus className="w-5 h-5 mr-2" />
                      Add First Item
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {items.length > 0 && (
            <div className="bg-gray-50 p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={processBulkItems}
                  disabled={isProcessing || validItemsCount === 0}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing... ({completedCount}/{validItemsCount})
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Upload className="w-5 h-5 mr-2" />
                      Process All Items ({validItemsCount})
                    </div>
                  )}
                </button>

                <button
                  onClick={downloadAllAsZip}
                  disabled={completedCount === 0}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <div className="flex items-center justify-center">
                    <Download className="w-5 h-5 mr-2" />
                    Download ZIP ({completedCount})
                  </div>
                </button>

                <button
                  onClick={() => setItems([])}
                  disabled={isProcessing}
                  className="py-3 px-6 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Image Preview Modal with Zoom */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">{previewImage.title}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Zoom Controls */}
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.25}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              <div className="flex items-center justify-center min-h-full">
                <img
                  src={`data:image/png;base64,${previewImage.base64}`}
                  alt={previewImage.title}
                  className="max-w-none rounded-lg shadow-lg transition-transform duration-300 cursor-move"
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                  draggable={false}
                />
              </div>
            </div>
            
            {/* Preview Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Use zoom controls to inspect details • Click and drag to pan when zoomed
                </div>
                <button
                  onClick={() => downloadSingleImage(previewImage.item)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
                >
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};