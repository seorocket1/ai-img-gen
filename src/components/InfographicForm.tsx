import React, { useState } from 'react';
import { Image, Wand2, Package, ChevronDown, BarChart3, Palette, Lightbulb } from 'lucide-react';
import { sanitizeFormData } from '../utils/textSanitizer';

interface InfographicFormProps {
  onSubmit: (data: { content: string; style?: string; colour?: string }) => void;
  isLoading: boolean;
  disabled?: boolean;
  onOpenBulkModal?: () => void;
}

const STYLE_OPTIONS = [
  { value: '', label: 'Default', description: 'Balanced and clear' },
  { value: 'very simple', label: 'Very Simple', description: 'Clean and minimal' },
  { value: 'minimalist', label: 'Minimalist', description: 'Focus on essentials' },
  { value: 'modern', label: 'Modern', description: 'Contemporary design' },
  { value: 'professional', label: 'Professional', description: 'Business-ready' },
  { value: 'creative', label: 'Creative', description: 'Artistic and unique' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated style' },
  { value: 'bold', label: 'Bold', description: 'Strong visual impact' },
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

export const InfographicForm: React.FC<InfographicFormProps> = ({ 
  onSubmit, 
  isLoading, 
  disabled = false,
  onOpenBulkModal 
}) => {
  const [content, setContent] = useState('');
  const [style, setStyle] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [colour, setColour] = useState('');
  const [customColour, setCustomColour] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      const finalStyle = style === 'custom' ? customStyle.trim() : style;
      const finalColour = colour === 'custom' ? customColour.trim() : colour;
      
      const sanitizedData = sanitizeFormData({
        content: content.trim(),
        ...(finalStyle && { style: finalStyle }),
        ...(finalColour && { colour: finalColour }),
      });
      onSubmit(sanitizedData);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col space-y-6">
          {/* Content Field */}
          <div className="flex-1 flex flex-col group">
            <label htmlFor="content" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-purple-600" />
              Content to Visualize *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={disabled}
              className="w-full flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none min-h-[250px] disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
              placeholder="Enter the data, statistics, process steps, or information you want to transform into a visual infographic. Include specific numbers, percentages, or key points for best results..."
              required
            />
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start">
                <Lightbulb className="w-4 h-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-700">
                  <p className="font-medium mb-1">Pro Tips for Better Infographics:</p>
                  <ul className="text-xs space-y-1 text-purple-600">
                    <li>• Include specific data points, statistics, or percentages</li>
                    <li>• Describe the flow or hierarchy of information</li>
                    <li>• Mention any comparisons or relationships between data</li>
                    <li>• Specify the target audience or context</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Style and Colour Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Style Dropdown */}
            <div className="group">
              <label htmlFor="style" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Palette className="w-4 h-4 mr-2 text-purple-600" />
                Style <span className="text-gray-500 font-normal ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={disabled}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
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
                  className="w-full mt-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Describe your custom style..."
                />
              )}
            </div>

            {/* Colour Dropdown */}
            <div className="group">
              <label htmlFor="colour" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-red-400"></div>
                Colour <span className="text-gray-500 font-normal ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  id="colour"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  disabled={disabled}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-gray-300"
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
                  className="w-full mt-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
            disabled={!content.trim() || isLoading || disabled}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Generating Your Infographic...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Infographic
              </div>
            )}
          </button>

          {onOpenBulkModal && (
            <button
              type="button"
              onClick={onOpenBulkModal}
              disabled={isLoading || disabled}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              <div className="flex items-center justify-center">
                <Package className="w-5 h-5 mr-2" />
                Bulk Process Multiple Infographics
              </div>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};