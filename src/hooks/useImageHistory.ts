import { useState, useEffect, useCallback } from 'react';
import { HistoryImage } from '../types/history';

const STORAGE_KEY = 'seo_engine_image_history';
const MAX_HISTORY_ITEMS = 50;

export const useImageHistory = () => {
  const [history, setHistory] = useState<HistoryImage[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistoryFromStorage();
  }, []);

  const loadHistoryFromStorage = useCallback(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      console.log('Loading history from localStorage:', savedHistory);
      
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        console.log('Parsed history:', parsed);
        
        // Ensure we have valid data structure
        if (Array.isArray(parsed)) {
          // Validate each item has required properties
          const validHistory = parsed.filter(item => 
            item && 
            typeof item === 'object' && 
            item.id && 
            item.base64 && 
            item.type &&
            item.timestamp
          );
          console.log('Valid history items:', validHistory.length);
          setHistory(validHistory);
        } else {
          console.log('Invalid history format, resetting');
          setHistory([]);
        }
      }
    } catch (error) {
      console.error('Error loading image history:', error);
      setHistory([]);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save history to localStorage whenever it changes
  const saveHistoryToStorage = useCallback((historyData: HistoryImage[]) => {
    try {
      console.log('Saving history to localStorage:', historyData.length, 'items');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
    } catch (error) {
      console.error('Error saving image history:', error);
    }
  }, []);

  const addToHistory = useCallback((image: HistoryImage) => {
    console.log('Adding to history:', {
      id: image.id,
      type: image.type,
      title: image.title,
      hasBase64: !!image.base64,
      timestamp: image.timestamp
    });
    
    // Validate the image object
    if (!image.id || !image.base64 || !image.type || !image.timestamp) {
      console.error('Invalid image object:', image);
      return image;
    }
    
    setHistory(prev => {
      // Check if image already exists
      const exists = prev.some(item => item.id === image.id);
      if (exists) {
        console.log('Image already exists in history');
        return prev;
      }
      
      const updated = [image, ...prev];
      // Keep only the most recent MAX_HISTORY_ITEMS
      const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);
      console.log('Updated history length:', trimmed.length);
      
      // Save to localStorage immediately
      saveHistoryToStorage(trimmed);
      
      return trimmed;
    });

    return image;
  }, [saveHistoryToStorage]);

  const removeImage = useCallback((id: string) => {
    console.log('Removing image from history:', id);
    setHistory(prev => {
      const filtered = prev.filter(img => img.id !== id);
      console.log('History after removal:', filtered.length, 'items');
      
      // Save to localStorage immediately
      saveHistoryToStorage(filtered);
      
      return filtered;
    });
  }, [saveHistoryToStorage]);

  const clearHistory = useCallback(() => {
    console.log('Clearing all history');
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getImageById = useCallback((id: string) => {
    return history.find(img => img.id === id);
  }, [history]);

  // Debug log current state
  console.log('Current history state:', {
    length: history.length,
    items: history.map(h => ({ id: h.id, type: h.type, title: h.title }))
  });

  return {
    history,
    addToHistory,
    removeImage,
    clearHistory,
    getImageById,
    forceRefresh: loadHistoryFromStorage,
  };
};