export interface HistoryImage {
  id: string;
  type: 'blog' | 'infographic';
  title?: string;
  content?: string;
  base64: string;
  timestamp: number;
  style?: string;
  colour?: string;
}