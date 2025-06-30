import { useState, useCallback } from 'react';

interface BulkProgress {
  completed: number;
  total: number;
}

export const useProcessingState = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const resetProcessingState = useCallback(() => {
    setIsProcessing(false);
    setIsBulkProcessing(false);
    setBulkProgress(null);
  }, []);

  return {
    isProcessing,
    isBulkProcessing,
    bulkProgress,
    setIsProcessing,
    setIsBulkProcessing,
    setBulkProgress,
    resetProcessingState,
  };
};