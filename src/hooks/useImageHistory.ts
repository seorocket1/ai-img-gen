import { useState, useEffect } from 'react';
import { HistoryImage } from '../types/history';

const STORAGE_KEY = 'seo_engine_image_history';
const MAX_HISTORY_ITEMS = 50;

export const useImageHistory = () => {
  const [history, setHistory] = useState<HistoryImage[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Ensure we have valid data structure
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading image history:', error);
      setHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving image history:', error);
    }
  }, [history]);

  const addToHistory = (image: HistoryImage) => {
    console.log('Adding to history:', image);
    
    setHistory(prev => {
      const updated = [image, ...prev];
      // Keep only the most recent MAX_HISTORY_ITEMS
      const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);
      console.log('Updated history length:', trimmed.length);
      return trimmed;
    });

    return image;
  };

  const removeImage = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getImageById = (id: string) => {
    return history.find(img => img.id === id);
  };

  return {
    history,
    addToHistory,
    removeImage,
    clearHistory,
    getImageById,
  };
};