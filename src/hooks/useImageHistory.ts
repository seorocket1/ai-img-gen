import { useState, useEffect, useCallback } from 'react';
import { HistoryImage } from '../types/history';
import { useSupabaseAuth } from './useSupabaseAuth';
import { isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'seo_engine_image_history';
const MAX_HISTORY_ITEMS = 50;

export const useImageHistory = () => {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [history, setHistory] = useState<HistoryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user-specific storage key
  const getUserStorageKey = useCallback(() => {
    if (user && isAuthenticated && isSupabaseConfigured) {
      return `${STORAGE_KEY}_${user.id}`;
    }
    return STORAGE_KEY; // Fallback for anonymous users
  }, [user, isAuthenticated]);

  // Load history from localStorage and database
  const loadHistoryFromStorage = useCallback(async () => {
    try {
      setIsLoading(true);
      const storageKey = getUserStorageKey();
      
      // First, try to load from database if user is authenticated
      if (user && isAuthenticated && isSupabaseConfigured) {
        try {
          const { getUserImageGenerations } = await import('../lib/supabase');
          const dbHistory = await getUserImageGenerations(user.id);
          
          // Convert database format to history format
          const convertedHistory: HistoryImage[] = dbHistory.map(item => ({
            id: item.id,
            type: item.image_type,
            title: item.title || (item.image_type === 'blog' ? 'Blog Image' : 'Infographic'),
            content: item.content,
            base64: item.image_data,
            timestamp: new Date(item.created_at).getTime(),
            style: item.style,
            colour: item.colour,
          }));
          
          console.log('Loaded history from database:', convertedHistory.length, 'items');
          setHistory(convertedHistory);
          
          // Also save to localStorage for offline access
          localStorage.setItem(storageKey, JSON.stringify(convertedHistory));
          return;
        } catch (dbError) {
          console.error('Error loading from database, falling back to localStorage:', dbError);
        }
      }
      
      // Fallback to localStorage
      const savedHistory = localStorage.getItem(storageKey);
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
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading image history:', error);
      setHistory([]);
      // Clear corrupted data
      const storageKey = getUserStorageKey();
      localStorage.removeItem(storageKey);
    } finally {
      setIsLoading(false);
    }
  }, [getUserStorageKey, user, isAuthenticated]);

  // Load history on mount and when user changes
  useEffect(() => {
    loadHistoryFromStorage();
  }, [loadHistoryFromStorage]);

  // Save history to localStorage whenever it changes
  const saveHistoryToStorage = useCallback((historyData: HistoryImage[]) => {
    try {
      const storageKey = getUserStorageKey();
      console.log('Saving history to localStorage:', historyData.length, 'items');
      localStorage.setItem(storageKey, JSON.stringify(historyData));
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('historyUpdated', { 
        detail: { history: historyData } 
      }));
    } catch (error) {
      console.error('Error saving image history:', error);
    }
  }, [getUserStorageKey]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const storageKey = getUserStorageKey();
      if (e.key === storageKey) {
        console.log('Storage changed externally, reloading history');
        loadHistoryFromStorage();
      }
    };

    const handleHistoryUpdate = (e: CustomEvent) => {
      console.log('History updated event received');
      // Force a re-render by updating state
      setHistory(prev => [...e.detail.history]);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('historyUpdated', handleHistoryUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('historyUpdated', handleHistoryUpdate as EventListener);
    };
  }, [loadHistoryFromStorage, getUserStorageKey]);

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
    const storageKey = getUserStorageKey();
    localStorage.removeItem(storageKey);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('historyUpdated', { 
      detail: { history: [] } 
    }));
  }, [getUserStorageKey]);

  const getImageById = useCallback((id: string) => {
    return history.find(img => img.id === id);
  }, [history]);

  // Debug log current state
  console.log('Current history state:', {
    length: history.length,
    isLoading,
    userId: user?.id,
    storageKey: getUserStorageKey(),
    items: history.map(h => ({ id: h.id, type: h.type, title: h.title }))
  });

  return {
    history,
    isLoading,
    addToHistory,
    removeImage,
    clearHistory,
    getImageById,
    forceRefresh: loadHistoryFromStorage,
  };
};