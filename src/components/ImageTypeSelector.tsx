import React from 'react';
import { Image, FileText, Sparkles, ArrowRight, Zap, Palette, BarChart3, TrendingUp } from 'lucide-react';

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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-700">AI-Powered Visual Creation</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
          Choose Your Image Type
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Select the type of image you want to generate and let our advanced AI create stunning visuals tailored to your content
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Blog Image Card */}
        <div
          className={`group relative overflow-hidden rounded-3xl p-8 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] hover:shadow-2xl ${
            selectedType === 'blog'
              ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-2 border-blue-300 shadow-xl scale-[1.02]'
              : 'bg-white border-2 border-gray-200 hover:border-blue-200 hover:shadow-lg'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeSelect('blog')}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Floating Elements */}
          <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-300"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-700"></div>
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <FileText className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center group-hover:text-blue-900 transition-colors duration-300">
              Blog Featured Image
            </h3>
            <p className="text-gray-600 text-center mb-6 leading-relaxed text-lg">
              Create eye-catching featured images for your blog posts with custom titles and engaging visuals that drive clicks
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center text-gray-600 group-hover:text-blue-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mr-4">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">Blog title and content optimization</span>
              </div>
              <div className="flex items-center text-gray-600 group-hover:text-blue-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mr-4">
                  <Palette className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">Professional layouts and designs</span>
              </div>
              <div className="flex items-center text-gray-600 group-hover:text-blue-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mr-4">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">Social media ready formats</span>
              </div>
            </div>

            <div className={`flex items-center justify-center text-blue-600 font-semibold text-lg transition-all duration-300 ${!disabled ? 'group-hover:translate-x-2' : ''}`}>
              Get Started 
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </div>

        {/* Infographic Card */}
        <div
          className={`group relative overflow-hidden rounded-3xl p-8 cursor-pointer transition-all duration-500 transform hover:scale-[1.02] hover:shadow-2xl ${
            selectedType === 'infographic'
              ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 border-2 border-purple-300 shadow-xl scale-[1.02]'
              : 'bg-white border-2 border-gray-200 hover:border-purple-200 hover:shadow-lg'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeSelect('infographic')}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Floating Elements */}
          <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-300"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-700"></div>
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Image className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center group-hover:text-purple-900 transition-colors duration-300">
              Infographic Image
            </h3>
            <p className="text-gray-600 text-center mb-6 leading-relaxed text-lg">
              Transform your data and content into visually appealing infographics that tell compelling stories
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center text-gray-600 group-hover:text-purple-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 mr-4">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Data visualization and charts</span>
              </div>
              <div className="flex items-center text-gray-600 group-hover:text-purple-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 mr-4">
                  <Palette className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Custom graphics and icons</span>
              </div>
              <div className="flex items-center text-gray-600 group-hover:text-purple-700 transition-colors duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 mr-4">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Engaging storytelling layouts</span>
              </div>
            </div>

            <div className={`flex items-center justify-center text-purple-600 font-semibold text-lg transition-all duration-300 ${!disabled ? 'group-hover:translate-x-2' : ''}`}>
              Get Started 
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-full">
          <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">
            Powered by advanced AI • Generate unlimited images • Professional quality
          </span>
        </div>
      </div>
    </div>
  );
};