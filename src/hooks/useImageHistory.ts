import { useState, useEffect } from 'react';
import { HistoryImage } from '../types/history';

const STORAGE_KEY = 'seo_engine_image_history';
const MAX_HISTORY_ITEMS = 20;

export const useImageHistory = () => {
  const [history, setHistory] = useState<HistoryImage[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
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

  const addToHistory = (image: Omit<HistoryImage, 'id' | 'timestamp'>) => {
    const newImage: HistoryImage = {
      ...image,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const updated = [newImage, ...prev];
      // Keep only the most recent MAX_HISTORY_ITEMS
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });

    return newImage;
  };

  const removeImage = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
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