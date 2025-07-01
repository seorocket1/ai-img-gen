import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, LogOut, User, History, Settings, CreditCard, AlertCircle, Brain, Cpu, Palette, Layers } from 'lucide-react';
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
import { 
  processImageResponse, 
  checkUserCredits, 
  getCreditCost 
} from './services/imageResponseHandler';

type Step = 'select' | 'form' | 'result';
type ImageType = 'blog' | 'infographic' | null;

interface GeneratedImage {
  base64: string;
  type: 'blog' | 'infographic';
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

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
    if (!checkUserCredits(user, imageType)) {
      const requiredCredits = getCreditCost(imageType);
      setError(`Insufficient credits. You need ${requiredCredits} credits to generate a ${imageType} image. You currently have ${user?.credits || 0} credits.`);
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

    // Create abort controller for the request
    const controller = new AbortController();
    
    // Set timeout for the request
    const requestTimeout = setTimeout(() => {
      controller.abort();
      console.error('❌ Request aborted due to timeout');
    }, 120000); // 2 minutes timeout

    setIsProcessing(true);
    setFormData(data);
    setError(null);
    
    try {
      console.log('🚀 STARTING N8N WEBHOOK IMAGE GENERATION');
      console.log('Selected type:', selectedType);
      console.log('Form data:', data);
      
      // Sanitize the data before sending
      const sanitizedData = sanitizeFormData(data);
      console.log('Sanitized data:', sanitizedData);
      
      // Prepare image detail with style and colour if provided
      let imageDetail = '';
      if (selectedType === 'blog') {
        imageDetail = `Blog post title: '${sanitizedData.title}', Content: ${sanitizedData.intro || sanitizedData.content}`;
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

      console.log('📤 Sending to n8n webhook:', payload);

      const response = await fetch(WEBHOOK_URL, {
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

      console.log('📥 N8N webhook response received:', response.status, response.statusText);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('❌ N8N webhook error response:', errorText);
        } catch (e) {
          console.error('❌ Could not read error response body');
        }
        
        if (response.status === 404) {
          throw new Error('Image generation service not found. Please contact support.');
        } else if (response.status === 500) {
          throw new Error('Image generation service is experiencing issues. Please try again later.');
        } else if (response.status === 503) {
          throw new Error('Image generation service is temporarily unavailable. Please try again in a few minutes.');
        } else {
          throw new Error(`Service error (${response.status}): ${response.statusText}. ${errorText ? `Details: ${errorText}` : ''}`);
        }
      }

      // Get response as text first
      const responseText = await response.text();
      console.log('📄 N8N webhook raw response received, length:', responseText.length);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response received from image generation service. Please try again.');
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ N8N webhook response parsed as JSON successfully');
      } catch (parseError) {
        console.log('⚠️ N8N webhook response was not valid JSON, treating as raw data');
        result = responseText.trim();
      }

      // Use the enhanced image response handler - THIS IS THE CRITICAL PART
      console.log('🔄 Processing n8n webhook response with image handler...');
      const processResult = await processImageResponse(
        result,
        responseText,
        selectedType,
        sanitizedData,
        {
          user,
          onImageGenerated: addToHistory,
          onRefreshUser: refreshUser,
          isBulkProcessing: false
        }
      );

      if (!processResult.success) {
        console.error('❌ Image response processing failed:', processResult.error);
        throw new Error(processResult.error || 'Failed to process image response from webhook');
      }

      if (!processResult.image) {
        console.error('❌ No image data received from processing');
        throw new Error('No image data received from webhook');
      }

      console.log('✅ N8N WEBHOOK IMAGE GENERATION COMPLETED SUCCESSFULLY');

      // Create the generated image object for the UI
      const newImage = {
        base64: processResult.image.base64,
        type: selectedType as 'blog' | 'infographic',
      };
      
      // Update the UI state
      setGeneratedImage(newImage);
      setCurrentStep('result');
      
      // Show success notification
      setShowSuccessNotification(true);
      
    } catch (error) {
      console.error('❌ N8N WEBHOOK IMAGE GENERATION ERROR:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = 'Failed to generate image. Please try again.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. The image generation is taking longer than expected. Please try again in a few minutes.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Invalid response format from server. Please contact support if this persists.';
        } else if (error.message.includes('HTTP error') || error.message.includes('Service error')) {
          errorMessage = error.message;
        } else if (error.message.includes('Empty response')) {
          errorMessage = 'No response received from server. The service may be temporarily unavailable. Please try again.';
        } else if (error.message.includes('base64')) {
          errorMessage = 'Invalid image data received. Please try again.';
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMessage = 'Request timed out. Please try again with a shorter description or try again later.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      clearTimeout(requestTimeout);
      setIsProcessing(false);
      console.log('🏁 N8N webhook processing completed');
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            <a 
              href="https://seoengine.agency/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              SEO Engine
            </a>
          </h2>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden flex flex-col">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating Orbs */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-amber-400/20 to-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-r from-violet-400/20 to-purple-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-r from-rose-400/20 to-pink-500/20 rounded-full blur-xl animate-pulse delay-3000"></div>
          
          {/* Neural Network Lines */}
          <div className="absolute inset-0">
            <svg className="w-full h-full opacity-10" viewBox="0 0 1000 1000">
              <defs>
                <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path d="M100,200 Q300,100 500,200 T900,200" stroke="url(#neuralGradient)" strokeWidth="2" fill="none" className="animate-pulse" />
              <path d="M100,400 Q300,300 500,400 T900,400" stroke="url(#neuralGradient)" strokeWidth="2" fill="none" className="animate-pulse delay-1000" />
              <path d="M100,600 Q300,500 500,600 T900,600" stroke="url(#neuralGradient)" strokeWidth="2" fill="none" className="animate-pulse delay-2000" />
              <path d="M100,800 Q300,700 500,800 T900,800" stroke="url(#neuralGradient)" strokeWidth="2" fill="none" className="animate-pulse delay-3000" />
            </svg>
          </div>
        </div>
        
        {/* Header */}
        <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50 relative z-10 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 mr-3 shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Image Generator</h1>
                  <p className="text-sm text-emerald-200 hidden sm:block">Create stunning visuals with AI</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section - Properly Centered with Scroll */}
        <main className="flex-1 flex items-center justify-center relative z-10 px-4 sm:px-6 py-8 overflow-y-auto">
          <div className="text-center max-w-5xl mx-auto w-full">
            {/* Main Icon with Animated Elements */}
            <div className="relative flex items-center justify-center w-32 h-32 mx-auto mb-8">
              {/* Main Icon */}
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
              
              {/* Floating Elements Around Icon */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-bounce delay-300">
                <Cpu className="w-4 h-4 text-white m-1" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-bounce delay-700">
                <Palette className="w-4 h-4 text-white m-1" />
              </div>
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full animate-bounce delay-1000">
                <Layers className="w-4 h-4 text-white m-1" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-bounce delay-1500">
                <Sparkles className="w-4 h-4 text-white m-1" />
              </div>
            </div>
            
            {/* Main Heading with Better Colors */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                AI Image
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                Generator
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Create stunning blog featured images and infographics with the power of AI
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8">
              <div className="flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-600/50 text-slate-200">
                <Zap className="w-4 h-4 mr-2 text-emerald-400" />
                Powered by{' '}
                <a 
                  href="https://seoengine.agency/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
                >
                  SEO Engine
                </a>
              </div>
              <div className="hidden sm:block w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-600/50 text-slate-200">
                <Brain className="w-4 h-4 mr-2 text-violet-400" />
                Neural Networks
              </div>
              <div className="hidden sm:block w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-600/50 text-slate-200">
                <CreditCard className="w-4 h-4 mr-2 text-amber-400" />
                {isSupabaseConfigured ? '100 Free Credits' : 'Free to Use'}
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">10K+</div>
                <div className="text-xs sm:text-sm text-slate-400">Images Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">99.9%</div>
                <div className="text-xs sm:text-sm text-slate-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-violet-400 mb-1">30s</div>
                <div className="text-xs sm:text-sm text-slate-400">Avg Generation</div>
              </div>
            </div>
            
            {/* CTA Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 sm:px-10 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-2xl text-base sm:text-lg border border-emerald-400/20"
            >
              Start Creating Free
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
                Powered by{' '}
                <a 
                  href="https://seoengine.agency/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 ml-1 hover:text-blue-700 transition-colors"
                >
                  SEO Engine
                </a>
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
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-600 text-sm font-medium mb-1">Image Generation Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    onClick={() => setError(null)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      if (formData) {
                        handleFormSubmit(formData);
                      }
                    }}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
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
                      ? `Provide your blog details to generate a stunning featured image${isSupabaseConfigured ? ` (${getCreditCost('blog')} credits)` : ''}`
                      : `Provide your content to create a visual infographic${isSupabaseConfigured ? ` (${getCreditCost('infographic')} credits)` : ''}`
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
              <a 
                href="https://seoengine.agency/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
              >
                SEO Engine
              </a>
            </div>
            <p className="text-gray-600 mb-2">
              Empowering content creators with AI-driven visual solutions
            </p>
            <p className="text-sm text-gray-500">
              © 2025{' '}
              <a 
                href="https://seoengine.agency/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                SEO Engine
              </a>
              . All rights reserved. | Transforming ideas into stunning visuals.
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