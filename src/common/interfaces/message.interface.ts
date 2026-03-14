/**
 * Single message in a session (seller or buyer). wordCount for analytics.
 */
export interface Message {
  id: string;
  role: 'seller' | 'buyer';
  content: string;
  timestamp: string; // ISO 8601
  wordCount?: number;
}
