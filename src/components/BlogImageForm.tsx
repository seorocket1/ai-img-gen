import React, { useState } from 'react';
import { FileText, Wand2, Package, ChevronDown } from 'lucide-react';
import { sanitizeFormData } from '../utils/textSanitizer';

interface BlogImageFormProps {
  onSubmit: (data: { title: string; intro: string; style?: string; colour?: string }) => void;
  isLoading: boolean;
  disabled?: boolean;
  onOpenBulkModal?: () => void;
}

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
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      <div className="space-y-6 flex-1">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-3">
            Blog Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your blog title..."
            required
          />
        </div>

        <div className="flex-1 flex flex-col">
          <label htmlFor="intro" className="block text-sm font-semibold text-gray-900 mb-3">
            Blog Content / Keywords *
          </label>
          <textarea
            id="intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            disabled={disabled}
            className="w-full flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none min-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your blog content, summary, or keywords that should influence the visual design..."
            required
          />
          <p className="text-sm text-gray-500 mt-2">
            Provide blog content, theme, keywords, or any details that should influence the featured image design.
          </p>
        </div>

        {/* Optional Style and Colour Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Style Dropdown */}
          <div>
            <label htmlFor="style" className="block text-sm font-semibold text-gray-900 mb-3">
              Style <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <select
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                className="w-full mt-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Specify custom style..."
              />
            )}
          </div>

          {/* Colour Dropdown */}
          <div>
            <label htmlFor="colour" className="block text-sm font-semibold text-gray-900 mb-3">
              Colour <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <select
                id="colour"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                disabled={disabled}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {COLOUR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {colour === 'custom' && (
              <input
                type="text"
                value={customColour}
                onChange={(e) => setCustomColour(e.target.value)}
                disabled={disabled}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Specify custom colour..."
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!title.trim() || !intro.trim() || isLoading || disabled}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Generating Image...
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
  );
};