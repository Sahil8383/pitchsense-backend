import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type {
  Session,
  Evaluation,
  CompetencyScore,
} from '../common/interfaces';
import { buildBuyerSystemPrompt } from './prompts/buyer.prompt';
import { buildEvaluationPrompt } from './prompts/evaluation.prompt';

@Injectable()
export class ConversationService {
  private readonly anthropic: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    if (typeof key === 'string' && key) {
      this.anthropic = new Anthropic({ apiKey: key });
    }
  }

  async reply(
    session: Session,
  ): Promise<{ content: string; interestPercent: number | null }> {
    const system = buildBuyerSystemPrompt(
      session.scenario.persona,
      session.scenario.context,
    );
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of session.messages) {
      if (m.role === 'seller')
        messages.push({ role: 'user', content: m.content });
      else messages.push({ role: 'assistant', content: m.content });
    }

    if (!this.anthropic) {
      throw new Error('Anthropic not configured. Set ANTHROPIC_API_KEY.');
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    const text = response.content.find((b) => b.type === 'text');
    const raw = text && 'text' in text ? text.text : '';
    return this.parseBuyerReply(raw);
  }

  /**
   * Streams the buyer reply token-by-token. Yields content deltas then a final
   * done event with parsed content and interest. The INTEREST: line is not
   * included in streamed content.
   */
  async *replyStream(
    session: Session,
  ): AsyncGenerator<
    | { type: 'delta'; delta: string }
    | { type: 'done'; content: string; interestPercent: number | null }
  > {
    const system = buildBuyerSystemPrompt(
      session.scenario.persona,
      session.scenario.context,
    );
    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const m of session.messages) {
      if (m.role === 'seller')
        messages.push({ role: 'user', content: m.content });
      else messages.push({ role: 'assistant', content: m.content });
    }

    if (!this.anthropic) {
      throw new Error('Anthropic not configured. Set ANTHROPIC_API_KEY.');
    }

    const stream = this.anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    let accumulated = '';
    let emittedUpTo = 0;
    const interestMarker = /\nINTEREST:\s*\d+\s*$/i;

    type StreamEvent =
      | { type: 'delta'; delta: string }
      | { type: 'done'; content: string; interestPercent: number | null };
    const queue: StreamEvent[] = [];
    let resolveNext: (v: StreamEvent) => void = () => {};

    const next = (): Promise<StreamEvent> => {
      return new Promise((resolve) => {
        if (queue.length > 0) {
          resolve(queue.shift()!);
          return;
        }
        resolveNext = resolve;
      });
    };

    const pushAndWake = (event: StreamEvent) => {
      queue.push(event);
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = () => {};
        r(queue.shift()!);
      }
    };

    stream.on('text', (delta: string) => {
      accumulated += delta;
      const match = accumulated.match(interestMarker);
      if (match) {
        const contentEnd = accumulated.length - match[0].length;
        if (contentEnd > emittedUpTo) {
          const toEmit = accumulated.slice(emittedUpTo, contentEnd).trimEnd();
          if (toEmit) pushAndWake({ type: 'delta', delta: toEmit });
        }
        emittedUpTo = Infinity;
      } else if (emittedUpTo !== Infinity) {
        pushAndWake({ type: 'delta', delta });
        emittedUpTo = accumulated.length;
      }
    });

    stream.finalMessage().then(
      (message) => {
        const text = message.content.find((b) => b.type === 'text');
        const raw = text && 'text' in text ? text.text : '';
        const { content, interestPercent } = this.parseBuyerReply(raw);
        pushAndWake({ type: 'done', content, interestPercent });
      },
      () => {
        pushAndWake({
          type: 'done',
          content: '',
          interestPercent: null,
        });
      },
    );

    while (true) {
      const event = await next();
      yield event;
      if (event.type === 'done') break;
    }
  }

  private parseBuyerReply(raw: string): {
    content: string;
    interestPercent: number | null;
  } {
    const interestMatch = raw.match(/\nINTEREST:\s*(\d+)\s*$/i);
    let content = raw;
    let interestPercent: number | null = null;
    if (interestMatch) {
      content = raw.slice(0, raw.length - interestMatch[0].length).trimEnd();
      const n = parseInt(interestMatch[1], 10);
      if (n >= 0 && n <= 100) interestPercent = n;
    }
    return { content, interestPercent };
  }

  async generateEvaluation(session: Session): Promise<Evaluation> {
    const transcript = session.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    const prompt = buildEvaluationPrompt(transcript, session.scenario.rubric);
    const rubric = session.scenario.rubric;

    let raw: string;
    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content.find((b) => b.type === 'text');
      raw = text && 'text' in text ? text.text : '{}';
    } else {
      return this.fallbackEvaluation(session);
    }

    const parsed = this.parseEvaluationJson(raw);
    if (parsed) {
      const competencies: CompetencyScore[] = [];
      let sumWeighted = 0;
      let sumWeights = 0;
      for (const r of rubric) {
        const item = parsed.competencies.find((c) => c.competencyId === r.id);
        const score =
          item && item.score >= 1 && item.score <= 5 ? item.score : 3;
        const feedback = item?.feedback ?? 'No specific feedback.';
        sumWeights += r.weight;
        sumWeighted += score * r.weight;
        competencies.push({
          competencyId: r.id,
          competencyName: r.name,
          score,
          feedback,
          weight: r.weight,
        });
      }
      const overallScore =
        sumWeights > 0 ? Math.round((sumWeighted / sumWeights) * 20) : 0;
      return {
        id: crypto.randomUUID(),
        sessionId: session.id,
        overallScore,
        competencies,
        createdAt: new Date().toISOString(),
      };
    }

    const retryRaw = await this.retryEvaluationPrompt(session);
    const retryParsed = this.parseEvaluationJson(retryRaw);
    if (retryParsed) {
      const competencies: CompetencyScore[] = [];
      let sumWeighted = 0;
      let sumWeights = 0;
      for (const r of rubric) {
        const item = retryParsed.competencies.find(
          (c) => c.competencyId === r.id,
        );
        const score =
          item && item.score >= 1 && item.score <= 5 ? item.score : 3;
        const feedback = item?.feedback ?? 'No specific feedback.';
        sumWeights += r.weight;
        sumWeighted += score * r.weight;
        competencies.push({
          competencyId: r.id,
          competencyName: r.name,
          score,
          feedback,
          weight: r.weight,
        });
      }
      const overallScore =
        sumWeights > 0 ? Math.round((sumWeighted / sumWeights) * 20) : 0;
      return {
        id: crypto.randomUUID(),
        sessionId: session.id,
        overallScore,
        competencies,
        createdAt: new Date().toISOString(),
      };
    }

    return this.fallbackEvaluation(session);
  }

  private parseEvaluationJson(raw: string): {
    competencies: {
      competencyId: string;
      competencyName: string;
      score: number;
      feedback: string;
    }[];
  } | null {
    try {
      const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim();
      const data: unknown = JSON.parse(cleaned);
      if (
        data &&
        typeof data === 'object' &&
        'competencies' in data &&
        Array.isArray((data as { competencies: unknown }).competencies)
      ) {
        return data as {
          competencies: {
            competencyId: string;
            competencyName: string;
            score: number;
            feedback: string;
          }[];
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async retryEvaluationPrompt(session: Session): Promise<string> {
    const transcript = session.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    const retryPrompt = `${buildEvaluationPrompt(transcript, session.scenario.rubric)}\n\nIf you already responded, output valid JSON only, no other text.`;
    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: retryPrompt }],
      });
      const text = response.content.find((b) => b.type === 'text');
      return text && 'text' in text ? text.text : '{}';
    }
    return '{}';
  }

  private fallbackEvaluation(session: Session): Evaluation {
    const competencies: CompetencyScore[] = session.scenario.rubric.map(
      (r) => ({
        competencyId: r.id,
        competencyName: r.name,
        score: 3,
        feedback: 'Evaluation could not be generated; default score applied.',
        weight: r.weight,
      }),
    );
    return {
      id: crypto.randomUUID(),
      sessionId: session.id,
      overallScore: 60,
      competencies,
      createdAt: new Date().toISOString(),
    };
  }
}
