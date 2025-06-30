import React from 'react';
import { X, History, Download, Trash2, Image as ImageIcon, Eye } from 'lucide-react';
import { useImageHistory } from '../hooks/useImageHistory';
import { HistoryImage } from '../types/history';

interface ImageHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageHistorySidebar: React.FC<ImageHistorySidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const { history, clearHistory, removeImage } = useImageHistory();

  const downloadImage = (image: HistoryImage) => {
    try {
      const byteCharacters = atob(image.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seo-engine-${image.type}-${image.title || 'image'}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <History className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Image History</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No images generated yet.</p>
                <p className="text-sm">Start creating to see your history here!</p>
              </div>
            ) : (
              history.map((image) => (
                <div key={image.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <img
                      src={`data:image/png;base64,${image.base64}`}
                      alt={image.title || image.content}
                      className="w-16 h-16 object-cover rounded-md border border-gray-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {image.title || image.content?.substring(0, 30) + '...'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {image.type === 'blog' ? 'Blog Image' : 'Infographic'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(image.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadImage(image)}
                        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition-colors"
                        title="Download Image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                      title="Remove from History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={clearHistory}
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All History
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};