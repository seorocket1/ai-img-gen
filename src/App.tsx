import React, { useState } from 'react';
import { Sparkles, Zap, LogOut, User, History } from 'lucide-react';
import { ImageTypeSelector } from './components/ImageTypeSelector';
import { BlogImageForm } from './components/BlogImageForm';
import { InfographicForm } from './components/InfographicForm';
import { ImagePreview } from './components/ImagePreview';
import { ProgressSteps } from './components/ProgressSteps';
import { QuickNavigation } from './components/QuickNavigation';
import { DreamscapeBackground } from './components/DreamscapeBackground';
import { AuthModal } from './components/AuthModal';
import { ImageHistorySidebar } from './components/ImageHistorySidebar';
import { BulkProcessingModal } from './components/BulkProcessingModal';
import { SuccessNotification } from './components/SuccessNotification';
import { useAuth } from './hooks/useAuth';
import { useImageHistory } from './hooks/useImageHistory';
import { useProcessingState } from './hooks/useProcessingState';
import { sanitizeFormData } from './utils/textSanitizer';

type Step = 'select' | 'form' | 'result';
type ImageType = 'blog' | 'infographic' | null;

interface GeneratedImage {
  base64: string;
  type: 'blog' | 'infographic';
}

const WEBHOOK_URL = 'https://n8n.seoengine.agency/webhook/6e9e3b30-cb55-4d74-aa9d-68691983455f';

function App() {
  const { user, isAuthenticated, isLoading: authLoading, signInWithEmail, signInAnonymously, signOut } = useAuth();
  const { addToHistory } = useImageHistory();
  const { 
    isProcessing, 
    isBulkProcessing, 
    bulkProgress, 
    setIsProcessing, 
    setIsBulkProcessing, 
    setBulkProgress 
  } = useProcessingState();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
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

  const handleTypeSelect = (type: 'blog' | 'infographic') => {
    setSelectedType(type);
    setCurrentStep('form');
    setGeneratedImage(null);
    setFormData(null);
    setError(null);
  };

  const handleQuickNavigation = (type: 'blog' | 'infographic') => {
    // If switching types while in form or result step, go to form step for new type
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

  const handleFormSubmit = async (data: any) => {
    setIsProcessing(true);
    setFormData(data);
    setError(null);
    
    try {
      // Sanitize the data before sending
      const sanitizedData = sanitizeFormData(data);
      
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

      console.log('Sending to webhook:', payload);

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
      console.log('Webhook response:', result);

      if (result.image) {
        const newImage = {
          base64: result.image,
          type: selectedType as 'blog' | 'infographic',
        };
        
        setGeneratedImage(newImage);
        setCurrentStep('result');
        
        // Add to history immediately
        const historyImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: selectedType as 'blog' | 'infographic',
          base64: result.image,
          title: selectedType === 'blog' ? sanitizedData.title : 'Infographic',
          content: selectedType === 'blog' ? sanitizedData.intro : sanitizedData.content,
          timestamp: Date.now(),
          style: sanitizedData.style,
          colour: sanitizedData.colour,
        };
        
        addToHistory(historyImage);
        
        // Show success notification
        setShowSuccessNotification(true);
      } else {
        throw new Error('No image data received from the server');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      let errorMessage = 'Failed to generate image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          errorMessage = 'Invalid content format. Please check your input and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
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
    setShowBulkModal(true);
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
          onSignInWithEmail={signInWithEmail}
          onSignInAnonymously={signInAnonymously}
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
                <button
                  onClick={() => setShowHistorySidebar(true)}
                  disabled={isProcessing || isBulkProcessing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="View History"
                >
                  <History className="w-4 h-4" />
                </button>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  {user?.isAnonymous ? 'Anonymous' : user?.email || 'User'}
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
                      ? 'Provide your blog details to generate a stunning featured image'
                      : 'Provide your content to create a visual infographic'
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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
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
      />

      <SuccessNotification
        isVisible={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        imageType={generatedImage?.type || 'blog'}
        onDownload={downloadCurrentImage}
        onPreview={() => {
          // Scroll to preview section or open full preview
          const previewElement = document.querySelector('[data-preview]');
          if (previewElement) {
            previewElement.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />
    </div>
  );
}

export default App;