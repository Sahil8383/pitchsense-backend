import { Injectable } from '@nestjs/common';
import type { Scenario, Session, Evaluation } from '../common/interfaces';

@Injectable()
export class StorageService {
  private readonly scenarios = new Map<string, Scenario>();
  private readonly sessions = new Map<string, Session>();
  private readonly evaluations = new Map<string, Evaluation>();
  private readonly evaluationBySessionId = new Map<string, string>();

  private nextId(): string {
    return crypto.randomUUID();
  }

  private now(): string {
    return new Date().toISOString();
  }

  createScenario(data: Omit<Scenario, 'id' | 'createdAt'>): Scenario {
    const scenario: Scenario = {
      ...data,
      id: this.nextId(),
      createdAt: this.now(),
    };
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  getScenarioById(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  createSession(data: Omit<Session, 'id' | 'createdAt'>): Session {
    const session: Session = {
      ...data,
      id: this.nextId(),
      createdAt: this.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSessionById(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  updateSession(
    id: string,
    update: Partial<Pick<Session, 'messages' | 'status' | 'completedAt'>>,
  ): Session {
    const existing = this.sessions.get(id);
    if (!existing) {
      throw new Error(`Session not found: ${id}`);
    }
    const updated: Session = {
      ...existing,
      ...update,
    };
    this.sessions.set(id, updated);
    return updated;
  }

  createEvaluation(evaluation: Evaluation): Evaluation {
    this.evaluations.set(evaluation.id, evaluation);
    this.evaluationBySessionId.set(evaluation.sessionId, evaluation.id);
    return evaluation;
  }

  getEvaluationBySessionId(sessionId: string): Evaluation | undefined {
    const evalId = this.evaluationBySessionId.get(sessionId);
    return evalId ? this.evaluations.get(evalId) : undefined;
  }
}
