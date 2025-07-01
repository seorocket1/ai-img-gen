import React from 'react';
import { Image, FileText, Sparkles, ArrowRight } from 'lucide-react';

interface ImageTypeSelectorProps {
  selectedType: 'blog' | 'infographic' | null;
  onTypeSelect: (type: 'blog' | 'infographic') => void;
  disabled?: boolean;
}

export const ImageTypeSelector: React.FC<ImageTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Image Type</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the type of image you want to generate and let AI create stunning visuals for your content
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div
          className={`group relative overflow-hidden rounded-3xl p-8 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] ${
            selectedType === 'blog'
              ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 shadow-xl'
              : 'bg-white border-2 border-gray-200 hover:border-blue-200 hover:shadow-lg'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeSelect('blog')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 mx-auto shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Blog Featured Image</h3>
            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              Create eye-catching featured images for your blog posts with custom titles and engaging visuals
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-blue-500" />
                Blog title and content
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-blue-500" />
                Professional layouts
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-blue-500" />
                Social media ready
              </div>
            </div>

            <div className={`flex items-center justify-center text-blue-600 font-medium transition-transform duration-300 ${!disabled ? 'group-hover:translate-x-1' : ''}`}>
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        <div
          className={`group relative overflow-hidden rounded-3xl p-8 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] ${
            selectedType === 'infographic'
              ? 'bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-300 shadow-xl'
              : 'bg-white border-2 border-gray-200 hover:border-purple-200 hover:shadow-lg'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeSelect('infographic')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mb-6 mx-auto shadow-lg">
              <Image className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Infographic Image</h3>
            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              Transform your data and content into visually appealing infographics that tell your story
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                Data visualization
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                Custom graphics
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                Engaging layouts
              </div>
            </div>

            <div className={`flex items-center justify-center text-purple-600 font-medium transition-transform duration-300 ${!disabled ? 'group-hover:translate-x-1' : ''}`}>
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};