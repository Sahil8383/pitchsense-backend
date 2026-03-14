import type { Scenario } from './scenario.interface';
import type { Message } from './message.interface';

/**
 * Roleplay session. scenario is denormalized for easy access per spec.
 */
export interface Session {
  id: string;
  scenarioId: string;
  scenario: Scenario;
  messages: Message[];
  status: 'active' | 'completed';
  createdAt: string; // ISO 8601
  completedAt?: string;
}
