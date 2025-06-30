import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, LogOut, User, History, Settings, CreditCard, AlertCircle } from 'lucide-react';
import { ImageTypeSelector } from './components/ImageTypeSelector';
import { BlogImageForm } from './components/BlogImageForm';
import { InfographicForm } from './components/InfographicForm';
import { ImagePreview } from './components/ImagePreview';
import { ProgressSteps } from './components/ProgressSteps';
import { QuickNavigation } from './components/QuickNavigation';
import { DreamscapeBackground } from './components/DreamscapeBackground';
import { AuthModal } from './components/AuthModal';
import { SignUpModal } from './components/SignUpModal';
import { AdminPanel } from './components/AdminPanel';
import { ImageHistorySidebar } from './components/ImageHistorySidebar';
import { BulkProcessingModal } from './components/BulkProcessingModal';
import { SuccessNotification } from './components/SuccessNotification';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useImageHistory } from './hooks/useImageHistory';
import { useProcessingState } from './hooks/useProcessingState';
import { sanitizeFormData } from './utils/textSanitizer';
import { isSupabaseConfigured } from './lib/supabase';

type Step = 'select' | 'form' | 'result';
type ImageType = 'blog' | 'infographic' | null;

interface GeneratedImage {
  base64: string;
  type: 'blog' | 'infographic';
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

// Credit costs
const CREDIT_COSTS = {
  blog: 5,
  infographic: 10,
};

function App() {
  const { user, isAuthenticated, isLoading: authLoading, error: authError, signUp, signIn, signOut, refreshUser, clearError } = useSupabaseAuth();
  const { addToHistory, history } = useImageHistory();
  const { 
    isProcessing, 
    isBulkProcessing, 
    bulkProgress, 
    setIsProcessing, 
    setIsBulkProcessing, 
    setBulkProgress 
  } = useProcessingState();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [bulkCompletionNotification, setBulkCompletionNotification] = useState<{
    show: boolean;
    completed: number;
    total: number;
  }>({ show: false, completed: 0, total: 0 });
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<ImageType>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Select Type', 'Provide Content', 'Generate Image'];
  const getStepIndex = () => {
    switch (currentStep) {
      case 'select': return 0;
      case 'form': return 1;
      case 'result': return 2;
      default: return 0;
    }
  };

  // Clear auth errors when modals are opened
  useEffect(() => {
    if (showAuthModal || showSignUpModal) {
      clearError();
      setError(null);
    }
  }, [showAuthModal, showSignUpModal, clearError]);

  const handleTypeSelect = (type: 'blog' | 'infographic') => {
    setSelectedType(type);
    setCurrentStep('form');
    setGeneratedImage(null);
    setFormData(null);
    setError(null);
  };

  const handleQuickNavigation = (type: 'blog' | 'infographic') => {
    if (currentStep !== 'select') {
      setSelectedType(type);
      setCurrentStep('form');
      setGeneratedImage(null);
      setFormData(null);
      setError(null);
    } else {
      handleTypeSelect(type);
    }
  };

  const checkCredits = (imageType: 'blog' | 'infographic'): boolean => {
    if (!user || !isAuthenticated || !isSupabaseConfigured) return true; // Allow usage for non-authenticated users or when DB not configured
    
    const requiredCredits = CREDIT_COSTS[imageType];
    if (user.credits < requiredCredits) {
      setError(`Insufficient credits. You need ${requiredCredits} credits to generate a ${imageType} image. You currently have ${user.credits} credits.`);
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (data: any) => {
    if (!selectedType) return;

    // Check credits before processing
    if (!checkCredits(selectedType)) {
      return;
    }

    setIsProcessing(true);
    setFormData(data);
    setError(null);
    
    try {
      console.log('=== STARTING IMAGE GENERATION ===');
      console.log('Selected type:', selectedType);
      console.log('Raw form data:', data);
      
      // Sanitize the data before sending
      const sanitizedData = sanitizeFormData(data);
      console.log('Sanitized data:', sanitizedData);
      
      // Prepare image detail with style and colour if provided
      let imageDetail = '';
      if (selectedType === 'blog') {
        imageDetail = `Blog post title: '${sanitizedData.title}', Content: ${sanitizedData.intro}`;
      } else {
        imageDetail = sanitizedData.content;
      }

      // Add style and colour to the image detail if specified
      if (sanitizedData.style) {
        imageDetail += `, Style: ${sanitizedData.style}`;
      }
      if (sanitizedData.colour) {
        imageDetail += `, Colour: ${sanitizedData.colour}`;
      }
      
      // Prepare payload for n8n webhook
      const payload = {
        image_type: selectedType === 'blog' ? 'Featured Image' : 'Infographic',
        image_detail: imageDetail,
      };

      console.log('=== SENDING TO WEBHOOK ===');
      console.log('Webhook URL:', WEBHOOK_URL);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('=== WEBHOOK RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response status text:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      // Get response as text first to debug
      const responseText = await response.text();
      console.log('=== RAW RESPONSE ===');
      console.log('Response text length:', responseText.length);
      console.log('First 500 chars:', responseText.substring(0, 500));
      console.log('Last 100 chars:', responseText.substring(Math.max(0, responseText.length - 100)));

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from server');
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('=== PARSED JSON ===');
        console.log('Result type:', typeof result);
        console.log('Result keys:', result && typeof result === 'object' ? Object.keys(result) : 'Not an object');
        console.log('Full result:', result);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('Response was not valid JSON. Checking if it might be base64...');
        
        // Check if the response looks like base64
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (responseText.length > 100 && base64Regex.test(responseText.trim())) {
          console.log('Response appears to be base64 string');
          result = { image: responseText.trim() };
        } else {
          throw new Error(`Invalid response format. Expected JSON but got: ${responseText.substring(0, 200)}...`);
        }
      }

      console.log('=== EXTRACTING IMAGE DATA ===');

      // Check for different possible response formats
      let imageBase64 = null;
      
      // Try different possible property names for the image data
      if (result && typeof result === 'object') {
        const possibleKeys = ['image', 'data', 'base64', 'imageData', 'image_data', 'output', 'result', 'response'];
        
        for (const key of possibleKeys) {
          if (result[key]) {
            console.log(`Found image data in property: ${key}`);
            imageBase64 = result[key];
            break;
          }
          
          // Check nested objects
          if (result[key] && typeof result[key] === 'object' && result[key].image) {
            console.log(`Found image data in nested property: ${key}.image`);
            imageBase64 = result[key].image;
            break;
          }
        }
        
        // If still not found, look for any string property that looks like base64
        if (!imageBase64) {
          console.log('Searching all properties for base64-like strings...');
          for (const [key, value] of Object.entries(result)) {
            if (typeof value === 'string' && value.length > 100) {
              const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
              if (base64Regex.test(value)) {
                console.log(`Found potential base64 in property: ${key}`);
                imageBase64 = value;
                break;
              }
            }
          }
        }
      } else if (typeof result === 'string' && result.length > 100) {
        // Sometimes the response might be just the base64 string
        console.log('Treating entire result as base64 string');
        imageBase64 = result;
      }

      console.log('=== IMAGE DATA VALIDATION ===');
      console.log('Image base64 found:', !!imageBase64);
      console.log('Image base64 length:', imageBase64 ? imageBase64.length : 0);

      if (!imageBase64) {
        console.error('=== NO IMAGE DATA FOUND ===');
        console.error('Full response structure:', JSON.stringify(result, null, 2));
        throw new Error('No image data found in response. Please check the webhook response format.');
      }

      // Clean the base64 string (remove data URL prefix if present)
      if (imageBase64.startsWith('data:image/')) {
        console.log('Removing data URL prefix');
        imageBase64 = imageBase64.split(',')[1];
      }

      // Validate base64 string
      if (imageBase64.length < 100) {
        throw new Error('Received image data is too short to be valid');
      }

      // Test if it's valid base64
      try {
        atob(imageBase64.substring(0, 100)); // Test decode a small portion
        console.log('Base64 validation passed');
      } catch (base64Error) {
        console.error('Base64 validation failed:', base64Error);
        throw new Error('Received data is not valid base64 format');
      }

      console.log('=== PROCESSING CREDITS AND DATABASE ===');

      // Deduct credits for authenticated users (only if Supabase is configured)
      if (user && isAuthenticated && isSupabaseConfigured) {
        try {
          console.log('Deducting credits for user:', user.id, 'Amount:', CREDIT_COSTS[selectedType]);
          const { deductCredits } = await import('./lib/supabase');
          const newCredits = await deductCredits(user.id, CREDIT_COSTS[selectedType]);
          console.log('Credits deducted successfully. New balance:', newCredits);
          await refreshUser(); // Refresh user data to update credits
        } catch (creditError) {
          console.error('Error deducting credits:', creditError);
          // Continue with image generation even if credit deduction fails
        }
      }

      // Save to database for authenticated users (only if Supabase is configured)
      if (user && isAuthenticated && isSupabaseConfigured) {
        try {
          console.log('Saving image generation to database');
          const { saveImageGeneration } = await import('./lib/supabase');
          await saveImageGeneration({
            user_id: user.id,
            image_type: selectedType,
            title: selectedType === 'blog' ? sanitizedData.title : undefined,
            content: selectedType === 'blog' ? sanitizedData.intro : sanitizedData.content,
            style: sanitizedData.style,
            colour: sanitizedData.colour,
            credits_used: CREDIT_COSTS[selectedType],
            image_data: imageBase64,
          });
          console.log('Image generation saved to database successfully');
        } catch (dbError) {
          console.error('Error saving to database:', dbError);
          // Continue with local storage even if database save fails
        }
      }

      console.log('=== FINALIZING IMAGE GENERATION ===');

      const newImage = {
        base64: imageBase64,
        type: selectedType as 'blog' | 'infographic',
      };
      
      console.log('Setting generated image');
      setGeneratedImage(newImage);
      setCurrentStep('result');
      
      // Create history image object with proper structure
      const historyImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: selectedType as 'blog' | 'infographic',
        base64: imageBase64,
        title: selectedType === 'blog' ? sanitizedData.title : 'Infographic',
        content: selectedType === 'blog' ? sanitizedData.intro : sanitizedData.content,
        timestamp: Date.now(),
        style: sanitizedData.style || undefined,
        colour: sanitizedData.colour || undefined,
      };
      
      console.log('Adding image to history:', historyImage.id);
      
      // Add to history immediately - this will trigger real-time updates
      addToHistory(historyImage);
      
      // Show success notification
      setShowSuccessNotification(true);
      
      console.log('=== IMAGE GENERATION COMPLETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== IMAGE GENERATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = 'Failed to generate image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          errorMessage = 'Invalid response format from server. Please contact support.';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Server error: ${error.message}`;
        } else if (error.message.includes('Empty response')) {
          errorMessage = 'No response received from server. Please try again.';
        } else if (error.message.includes('base64')) {
          errorMessage = 'Invalid image data received. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
      console.log('=== PROCESSING COMPLETED ===');
    }
  };

  const handleGenerateNew = () => {
    setCurrentStep('form');
    setGeneratedImage(null);
    setError(null);
  };

  const handleBack = () => {
    if (currentStep === 'form') {
      setCurrentStep('select');
      setSelectedType(null);
      setFormData(null);
      setGeneratedImage(null);
      setError(null);
    } else if (currentStep === 'result') {
      setCurrentStep('form');
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleOpenBulkModal = () => {
    if (!selectedType) return;
    
    // Check if user has enough credits for at least one image
    if (!checkCredits(selectedType)) {
      return;
    }
    
    setShowBulkModal(true);
  };

  const handleBulkCompleted = (completedCount: number, totalCount: number) => {
    console.log('Bulk processing completed notification:', completedCount, totalCount);
    setBulkCompletionNotification({
      show: true,
      completed: completedCount,
      total: totalCount
    });
    
    // Refresh user data to update credits
    if (user && isAuthenticated && isSupabaseConfigured) {
      refreshUser();
    }
  };

  const downloadCurrentImage = () => {
    if (!generatedImage) return;
    
    try {
      const byteCharacters = atob(generatedImage.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const title = formData?.title || formData?.content?.substring(0, 30) || 'image';
      const safeTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '-').toLowerCase();
      link.download = `seo-engine-${generatedImage.type}-${safeTitle}-${Date.now()}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const showSplitLayout = currentStep === 'form' || currentStep === 'result';
  const showQuickNav = currentStep !== 'select';

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">SEO Engine</h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error screen if there's an authentication error
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>To fix this:</strong> Please click the "Connect to Supabase" button in the top right corner to set up your database connection.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-black relative overflow-hidden flex flex-col">
        <DreamscapeBackground />
        
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 relative z-10 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 mr-3 shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Image Generator</h1>
                  <p className="text-sm text-blue-200 hidden sm:block">Create stunning visuals with AI</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section - Perfectly Centered */}
        <main className="flex-1 flex items-center justify-center relative z-10 px-4 sm:px-6">
          <div className="text-center max-w-5xl mx-auto">
            {/* Main Icon */}
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 mx-auto mb-8 shadow-2xl animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-tight">
              AI Image Generator
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed">
              Create stunning blog featured images and infographics with the power of AI
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white">
                <Zap className="w-5 h-5 mr-2 text-blue-400" />
                Powered by SEO Engine
              </div>
              <div className="hidden sm:block w-2 h-2 bg-white/30 rounded-full"></div>
              <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white">
                <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                Professional Quality
              </div>
              <div className="hidden sm:block w-2 h-2 bg-white/30 rounded-full"></div>
              <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white">
                <CreditCard className="w-5 h-5 mr-2 text-green-400" />
                {isSupabaseConfigured ? '100 Free Credits' : 'Free to Use'}
              </div>
            </div>
            
            {/* CTA Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 text-white font-bold hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-2xl text-lg border border-white/20"
            >
              Get Started Free
            </button>
          </div>
        </main>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSignInWithEmail={signIn}
          onSignInAnonymously={async () => {
            // For now, we'll disable anonymous sign-in to encourage registration
            setError('Please create an account to use the service and get 100 free credits!');
            return false;
          }}
          onOpenSignUp={() => setShowSignUpModal(true)}
        />

        <SignUpModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          onSignUp={signUp}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Image Generator</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Create stunning visuals with AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center text-sm text-gray-500">
                <Zap className="w-4 h-4 mr-2" />
                Powered by <span className="font-semibold text-blue-600 ml-1">SEO Engine</span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Credits Display */}
                {user && isSupabaseConfigured && (
                  <div className="flex items-center px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <CreditCard className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">{user.credits} Credits</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowHistorySidebar(true)}
                  disabled={isProcessing || isBulkProcessing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                  title="View History"
                >
                  <History className="w-4 h-4" />
                  {history.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {history.length > 9 ? '9+' : history.length}
                    </span>
                  )}
                </button>
                
                {/* Admin Panel Button */}
                {user && user.is_admin && isSupabaseConfigured && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    disabled={isProcessing || isBulkProcessing}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Admin Panel"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  {user?.name || user?.email || 'User'}
                </div>
                <button
                  onClick={signOut}
                  disabled={isProcessing || isBulkProcessing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Processing Status Notification */}
      {(isProcessing || isBulkProcessing) && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-center">
              <div className="flex items-center text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-sm font-medium">
                  {isBulkProcessing 
                    ? `Bulk processing is currently active. Please wait for completion before starting another process.${bulkProgress ? ` (${bulkProgress.completed}/${bulkProgress.total} completed)` : ''}`
                    : 'Single image generation is currently active. Please wait...'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <QuickNavigation
        currentType={selectedType}
        onTypeSelect={handleQuickNavigation}
        isVisible={showQuickNav}
        disabled={isProcessing || isBulkProcessing}
      />

      {/* Progress Steps */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <ProgressSteps currentStep={getStepIndex()} steps={steps} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!showSplitLayout ? (
          // Full width for type selection
          <div className="max-w-4xl mx-auto">
            <ImageTypeSelector
              selectedType={selectedType}
              onTypeSelect={handleTypeSelect}
              disabled={isProcessing || isBulkProcessing}
            />
          </div>
        ) : (
          // Split layout for form and preview
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 min-h-[calc(100vh-300px)]">
            {/* Left Side - Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="p-4 sm:p-8 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {selectedType === 'blog' ? 'Blog Featured Image' : 'Infographic Image'}
                    </h2>
                    <button
                      onClick={handleBack}
                      disabled={isProcessing || isBulkProcessing}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Back
                    </button>
                  </div>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    {selectedType === 'blog' 
                      ? `Provide your blog details to generate a stunning featured image${isSupabaseConfigured ? ` (${CREDIT_COSTS.blog} credits)` : ''}`
                      : `Provide your content to create a visual infographic${isSupabaseConfigured ? ` (${CREDIT_COSTS.infographic} credits)` : ''}`
                    }
                  </p>
                </div>
                
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                  {selectedType === 'blog' && (
                    <BlogImageForm
                      onSubmit={handleFormSubmit}
                      isLoading={isProcessing}
                      disabled={isProcessing || isBulkProcessing}
                      onOpenBulkModal={handleOpenBulkModal}
                    />
                  )}
                  
                  {selectedType === 'infographic' && (
                    <InfographicForm
                      onSubmit={handleFormSubmit}
                      isLoading={isProcessing}
                      disabled={isProcessing || isBulkProcessing}
                      onOpenBulkModal={handleOpenBulkModal}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Preview */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden" data-preview>
              <ImagePreview
                isLoading={isProcessing}
                generatedImage={generatedImage}
                formData={formData}
                imageType={selectedType}
                onGenerateNew={handleGenerateNew}
                isBulkProcessing={isBulkProcessing}
                bulkProgress={bulkProgress}
                onOpenBulkModal={handleOpenBulkModal}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer with SEO Engine Branding */}
      <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 mr-3">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SEO Engine
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Empowering content creators with AI-driven visual solutions
            </p>
            <p className="text-sm text-gray-500">
              © 2025 SEO Engine. All rights reserved. | Transforming ideas into stunning visuals.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals and Notifications */}
      <ImageHistorySidebar
        isOpen={showHistorySidebar}
        onClose={() => setShowHistorySidebar(false)}
      />

      <BulkProcessingModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        imageType={selectedType || 'blog'}
        onProcessingStateChange={setIsBulkProcessing}
        onProgressUpdate={setBulkProgress}
        onImageGenerated={addToHistory}
        onBulkCompleted={handleBulkCompleted}
        user={user}
        onRefreshUser={refreshUser}
      />

      {user && user.is_admin && isSupabaseConfigured && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          currentUser={user}
        />
      )}

      <SuccessNotification
        isVisible={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        imageType={generatedImage?.type || 'blog'}
        onDownload={downloadCurrentImage}
        onPreview={() => {
          const previewElement = document.querySelector('[data-preview]');
          if (previewElement) {
            previewElement.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Bulk Completion Notification */}
      <SuccessNotification
        isVisible={bulkCompletionNotification.show}
        onClose={() => setBulkCompletionNotification({ show: false, completed: 0, total: 0 })}
        imageType="blog"
        autoHide={true}
        duration={8000}
        isBulkCompletion={true}
        completedCount={bulkCompletionNotification.completed}
        totalCount={bulkCompletionNotification.total}
        onPreview={() => {
          setShowHistorySidebar(true);
          setBulkCompletionNotification({ show: false, completed: 0, total: 0 });
        }}
      />
    </div>
  );
}

export default App;