import React, { useState } from 'react';
import { FileText, Wand2, Package, ChevronDown, Sparkles, Palette, Brush } from 'lucide-react';
import { sanitizeFormData } from '../utils/textSanitizer';

interface BlogImageFormProps {
  onSubmit: (data: { title: string; intro: string; style?: string; colour?: string }) => void;
  isLoading: boolean;
  disabled?: boolean;
  onOpenBulkModal?: () => void;
}

const STYLE_OPTIONS = [
  { value: '', label: 'Default', description: 'Clean and professional' },
  { value: 'very simple', label: 'Very Simple', description: 'Minimal and clean' },
  { value: 'minimalist', label: 'Minimalist', description: 'Less is more approach' },
  { value: 'modern', label: 'Modern', description: 'Contemporary design' },
  { value: 'professional', label: 'Professional', description: 'Business-ready' },
  { value: 'creative', label: 'Creative', description: 'Artistic and unique' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated style' },
  { value: 'bold', label: 'Bold', description: 'Strong and impactful' },
  { value: 'vintage', label: 'Vintage', description: 'Classic retro feel' },
  { value: 'custom', label: 'Custom', description: 'Specify your own style' },
];

const COLOUR_OPTIONS = [
  { value: '', label: 'Default', color: 'bg-gradient-to-r from-gray-400 to-gray-500' },
  { value: 'red', label: 'Red', color: 'bg-gradient-to-r from-red-400 to-red-600' },
  { value: 'blue', label: 'Blue', color: 'bg-gradient-to-r from-blue-400 to-blue-600' },
  { value: 'green', label: 'Green', color: 'bg-gradient-to-r from-green-400 to-green-600' },
  { value: 'purple', label: 'Purple', color: 'bg-gradient-to-r from-purple-400 to-purple-600' },
  { value: 'orange', label: 'Orange', color: 'bg-gradient-to-r from-orange-400 to-orange-600' },
  { value: 'yellow', label: 'Yellow', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
  { value: 'pink', label: 'Pink', color: 'bg-gradient-to-r from-pink-400 to-pink-600' },
  { value: 'teal', label: 'Teal', color: 'bg-gradient-to-r from-teal-400 to-teal-600' },
  { value: 'black', label: 'Black', color: 'bg-gradient-to-r from-gray-800 to-black' },
  { value: 'white', label: 'White', color: 'bg-gradient-to-r from-gray-100 to-white border border-gray-300' },
  { value: 'gray', label: 'Gray', color: 'bg-gradient-to-r from-gray-400 to-gray-600' },
  { value: 'multicolor', label: 'Multicolor', color: 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400' },
  { value: 'custom', label: 'Custom', color: 'bg-gradient-to-r from-indigo-400 to-purple-400' },
];

export const BlogImageForm: React.FC<BlogImageFormProps> = ({ 
  onSubmit, 
  isLoading, 
  disabled = false,
  onOpenBulkModal 
}) => {
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [style, setStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [colour, setColour] = useState('');
  const [customColour, setCustomColour] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && intro.trim()) {
      const finalStyle = style === 'custom' ? customStyle.trim() : style;
      const finalColour = colour === 'custom' ? customColour.trim() : colour;
      
      const sanitizedData = sanitizeFormData({
        title: title.trim(),
        intro: intro.trim(),
        ...(finalStyle && { style: finalStyle }),
        ...(finalColour && { colour: finalColour }),
      });
      onSubmit(sanitizedData);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          {/* Title Field */}
          <div className="group">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Blog Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
              placeholder="Enter your compelling blog title..."
              required
            />
          </div>

          {/* Content Field */}
          <div className="flex-1 flex flex-col group">
            <label htmlFor="intro" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
              Blog Content / Keywords *
            </label>
            <textarea
              id="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              disabled={disabled}
              className="w-full flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none min-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
              placeholder="Describe your blog content, main themes, or keywords that should influence the visual design. The more detailed, the better the AI can create a relevant featured image..."
              required
            />
            <p className="text-sm text-gray-500 mt-2 flex items-center">
              <Brush className="w-3 h-3 mr-1" />
              Provide blog content, theme, keywords, or any details that should influence the featured image design.
            </p>
          </div>

          {/* Style and Colour Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Style Dropdown */}
            <div className="group">
              <label htmlFor="style" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Palette className="w-4 h-4 mr-2 text-blue-600" />
                Style <span className="text-gray-500 font-normal ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={disabled}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {style === 'custom' && (
                <input
                  type="text"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  disabled={disabled}
                  className="w-full mt-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Describe your custom style..."
                />
              )}
            </div>

            {/* Colour Dropdown */}
            <div className="group">
              <label htmlFor="colour" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-blue-400"></div>
                Colour <span className="text-gray-500 font-normal ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  id="colour"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  disabled={disabled}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
                >
                  {COLOUR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {/* Color Preview */}
              {colour && colour !== 'custom' && (
                <div className="mt-3 flex items-center">
                  <div className={`w-6 h-6 rounded-full ${COLOUR_OPTIONS.find(c => c.value === colour)?.color} mr-2`}></div>
                  <span className="text-sm text-gray-600">Selected: {COLOUR_OPTIONS.find(c => c.value === colour)?.label}</span>
                </div>
              )}
              {colour === 'custom' && (
                <input
                  type="text"
                  value={customColour}
                  onChange={(e) => setCustomColour(e.target.value)}
                  disabled={disabled}
                  className="w-full mt-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Specify custom colour scheme..."
                />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={!title.trim() || !intro.trim() || isLoading || disabled}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Generating Your Featured Image...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Featured Image
              </div>
            )}
          </button>

          {onOpenBulkModal && (
            <button
              type="button"
              onClick={onOpenBulkModal}
              disabled={isLoading || disabled}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              <div className="flex items-center justify-center">
                <Package className="w-5 h-5 mr-2" />
                Bulk Process Multiple Blogs
              </div>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};