/**
 * Sanitizes text input to prevent JSON parsing errors and ensure clean API requests
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove or escape problematic characters
    .replace(/"/g, "'") // Replace double quotes with single quotes
    .replace(/\\/g, '') // Remove backslashes
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, ' ') // Replace carriage returns with spaces
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
};

/**
 * Validates and sanitizes form data before API submission
 */
export const sanitizeFormData = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeFormData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeFormData(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Creates a safe filename from text
 */
export const createSafeFilename = (text: string, maxLength: number = 50): string => {
  return text
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase()
    .substring(0, maxLength)
    .replace(/-+$/, ''); // Remove trailing hyphens
};