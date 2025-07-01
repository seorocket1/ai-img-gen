import React from 'react';
import { FileText, Image, ArrowRight, Zap } from 'lucide-react';

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
    <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-[73px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center bg-gray-50 rounded-2xl p-2 shadow-inner">
            <button
              onClick={() => !disabled && onTypeSelect('blog')}
              disabled={disabled}
              className={`group flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentType === 'blog'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Blog Featured Image
              {currentType !== 'blog' && !disabled && (
                <ArrowRight className="w-3 h-3 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              )}
              {currentType === 'blog' && (
                <Zap className="w-3 h-3 ml-2 animate-pulse" />
              )}
            </button>
            
            <div className="w-px h-8 bg-gray-300 mx-2"></div>
            
            <button
              onClick={() => !disabled && onTypeSelect('infographic')}
              disabled={disabled}
              className={`group flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                currentType === 'infographic'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Image className="w-4 h-4 mr-2" />
              Infographic Image
              {currentType !== 'infographic' && !disabled && (
                <ArrowRight className="w-3 h-3 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              )}
              {currentType === 'infographic' && (
                <Zap className="w-3 h-3 ml-2 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};