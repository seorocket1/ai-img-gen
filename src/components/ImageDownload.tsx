import React, { useState } from 'react';
import { Download, Image as ImageIcon, Check } from 'lucide-react';

interface ImageDownloadProps {
  imageBase64: string;
  imageType: 'blog' | 'infographic';
  onClose?: () => void;
}

type ImageFormat = 'png' | 'jpeg' | 'webp';

export const ImageDownload: React.FC<ImageDownloadProps> = ({
  imageBase64,
  imageType,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('png');
  const [isDownloading, setIsDownloading] = useState(false);

  const formats: { value: ImageFormat; label: string; description: string }[] = [
    { value: 'png', label: 'PNG', description: 'Best quality, larger file size' },
    { value: 'jpeg', label: 'JPEG', description: 'Good quality, smaller file size' },
    { value: 'webp', label: 'WebP', description: 'Modern format, excellent compression' },
  ];

  const downloadImage = async (format: ImageFormat) => {
    setIsDownloading(true);
    
    try {
      // Convert base64 to blob
      const byteCharacters = atob(imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Create canvas to convert format if needed
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Convert to desired format
        const mimeType = `image/${format}`;
        const quality = format === 'jpeg' ? 0.9 : undefined;
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `seo-engine-${imageType}-${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          setIsDownloading(false);
        }, mimeType, quality);
      };
      
      img.src = `data:image/png;base64,${imageBase64}`;
    } catch (error) {
      console.error('Download error:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner">
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt={`Generated ${imageType} image`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Format Selection */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Choose Download Format</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => setSelectedFormat(format.value)}
              className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                selectedFormat === format.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{format.label}</span>
                {selectedFormat === format.value && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-600">{format.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={() => downloadImage(selectedFormat)}
        disabled={isDownloading}
        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
      >
        {isDownloading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            Preparing Download...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Download className="w-5 h-5 mr-2" />
            Download as {selectedFormat.toUpperCase()}
          </div>
        )}
      </button>
    </div>
  );
};