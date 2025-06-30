import React from 'react';
import { FileText, Image, ArrowRight } from 'lucide-react';

interface QuickNavigationProps {
  currentType: 'blog' | 'infographic' | null;
  onTypeSelect: (type: 'blog' | 'infographic') => void;
  isVisible: boolean;
  disabled?: boolean;
}

export const QuickNavigation: React.FC<QuickNavigationProps> = ({
  currentType,
  onTypeSelect,
  isVisible,
  disabled = false,
}) => {
  if (!isVisible) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => !disabled && onTypeSelect('blog')}
              disabled={disabled}
              className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentType === 'blog'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Blog Featured Image
              {currentType !== 'blog' && !disabled && (
                <ArrowRight className="w-3 h-3 ml-2 opacity-50" />
              )}
            </button>
            
            <button
              onClick={() => !disabled && onTypeSelect('infographic')}
              disabled={disabled}
              className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentType === 'infographic'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Image className="w-4 h-4 mr-2" />
              Infographic Image
              {currentType !== 'infographic' && !disabled && (
                <ArrowRight className="w-3 h-3 ml-2 opacity-50" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};