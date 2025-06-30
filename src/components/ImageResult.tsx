import React from 'react';
import { Download, RefreshCw, ArrowLeft } from 'lucide-react';

interface ImageResultProps {
  imageUrl: string;
  imageType: 'blog' | 'infographic';
  onDownload: () => void;
  onGenerateNew: () => void;
  onBack: () => void;
}

export const ImageResult: React.FC<ImageResultProps> = ({
  imageUrl,
  imageType,
  onDownload,
  onGenerateNew,
  onBack,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          Your {imageType === 'blog' ? 'Blog Featured' : 'Infographic'} Image is Ready!
        </h2>
        <p className="text-gray-300">Preview your generated image and download it</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
        <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden mb-6">
          <img
            src={imageUrl}
            alt={`Generated ${imageType} image`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onDownload}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-center">
              <Download className="w-5 h-5 mr-2" />
              Download Image
            </div>
          </button>

          <button
            onClick={onGenerateNew}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Generate Another
            </div>
          </button>

          <button
            onClick={onBack}
            className="py-3 px-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300"
          >
            <div className="flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};