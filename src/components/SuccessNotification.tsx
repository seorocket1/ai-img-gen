import React, { useEffect, useState } from 'react';
import { CheckCircle, X, Download, Eye, Package } from 'lucide-react';

interface SuccessNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  imageType: 'blog' | 'infographic';
  onDownload?: () => void;
  onPreview?: () => void;
  autoHide?: boolean;
  duration?: number;
  isBulkCompletion?: boolean;
  completedCount?: number;
  totalCount?: number;
}

export const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  isVisible,
  onClose,
  imageType,
  onDownload,
  onPreview,
  autoHide = true,
  duration = 5000,
  isBulkCompletion = false,
  completedCount = 0,
  totalCount = 0,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setProgress(100);
      
      if (autoHide) {
        // Start progress countdown
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const newProgress = prev - (100 / (duration / 100));
            return Math.max(0, newProgress);
          });
        }, 100);

        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => {
          clearTimeout(timer);
          clearInterval(progressInterval);
        };
      }
    }
  }, [isVisible, autoHide, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  // Determine if this is a bulk completion notification based on props
  const isBulk = completedCount > 0 && totalCount > 0;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm transform transition-all duration-300 ${
          isAnimating ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isBulk ? 'bg-purple-100' : 'bg-green-100'
            }`}>
              {isBulk ? (
                <Package className="w-6 h-6 text-purple-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {isBulk 
                ? 'Bulk Processing Complete!' 
                : 'Image Generated Successfully!'
              }
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {isBulk 
                ? `Successfully generated ${completedCount} out of ${totalCount} images. Check your history to view all generated images.`
                : `Your ${imageType === 'blog' ? 'blog featured image' : 'infographic'} has been created and added to your history.`
              }
            </p>
            
            <div className="flex items-center space-x-2">
              {onPreview && (
                <button
                  onClick={onPreview}
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {isBulk ? 'View History' : 'Preview'}
                </button>
              )}
              {onDownload && !isBulk && (
                <button
                  onClick={onDownload}
                  className="flex items-center px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar for auto-hide */}
        {autoHide && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-100 ease-linear ${
                isBulk ? 'bg-purple-500' : 'bg-green-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};