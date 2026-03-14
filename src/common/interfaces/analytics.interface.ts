/**
 * Real-time analytics payload sent over WebSocket (not persisted).
 */
export interface AnalyticsPayload {
  fillerWordCount: number;
  fillerWordTotal: number;
  talkRatio: { seller: number; buyer: number };
  monologueFlag: boolean;
  messageIndex: number;
  buyerInterestPercent: number | null;
}
