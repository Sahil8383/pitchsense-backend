import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { ConversationService } from '../conversation/conversation.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsGateway } from '../analytics/analytics.gateway';
import type { Session, Message, Evaluation } from '../common/interfaces';

@Injectable()
export class SessionsService {
  constructor(
    private readonly storage: StorageService,
    private readonly conversation: ConversationService,
    private readonly analytics: AnalyticsService,
    private readonly analyticsGateway: AnalyticsGateway,
  ) {}

  createSession(scenarioId: string): Session {
    const scenario = this.storage.getScenarioById(scenarioId);
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }
    return this.storage.createSession({
      scenarioId,
      scenario,
      messages: [],
      status: 'active',
    });
  }

  async sendMessage(sessionId: string, content: string): Promise<Message> {
    const session = this.storage.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== 'active') {
      throw new BadRequestException('Session already completed');
    }
    if (!content?.trim()) {
      throw new BadRequestException('Content cannot be empty');
    }

    const now = new Date().toISOString();
    const sellerWordCount = content.trim()
      ? content.trim().split(/\s+/).length
      : 0;
    const sellerMessage: Message = {
      id: crypto.randomUUID(),
      role: 'seller',
      content: content.trim(),
      timestamp: now,
      wordCount: sellerWordCount,
    };
    const updatedMessages = [...session.messages, sellerMessage];
    const lastSellerIndex = updatedMessages.findLastIndex(
      (m) => m.role === 'seller',
    );
    this.storage.updateSession(sessionId, {
      messages: updatedMessages,
    });
    let updatedSession = this.storage.getSessionById(sessionId)!;

    const analyticsPayload = this.analytics.compute(
      updatedSession.messages,
      lastSellerIndex,
      null,
    );
    this.analyticsGateway.broadcastToSession(sessionId, analyticsPayload);

    const { content: buyerContent, interestPercent: buyerInterest } =
      await this.conversation.reply(updatedSession);
    const buyerWordCount = buyerContent.trim()
      ? buyerContent.trim().split(/\s+/).length
      : 0;
    const buyerMessage: Message = {
      id: crypto.randomUUID(),
      role: 'buyer',
      content: buyerContent.trim(),
      timestamp: new Date().toISOString(),
      wordCount: buyerWordCount,
    };
    const finalMessages = [...updatedSession.messages, buyerMessage];
    this.storage.updateSession(sessionId, { messages: finalMessages });
    updatedSession = this.storage.getSessionById(sessionId)!;

    const talkRatioPayload = this.analytics.compute(
      updatedSession.messages,
      lastSellerIndex,
      buyerInterest,
    );
    this.analyticsGateway.broadcastToSession(sessionId, talkRatioPayload);

    return buyerMessage;
  }

  async *sendMessageStream(
    sessionId: string,
    content: string,
  ): AsyncGenerator<
    { type: 'delta'; delta: string } | { type: 'done'; message: Message }
  > {
    const session = this.storage.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== 'active') {
      throw new BadRequestException('Session already completed');
    }
    if (!content?.trim()) {
      throw new BadRequestException('Content cannot be empty');
    }

    const now = new Date().toISOString();
    const sellerWordCount = content.trim()
      ? content.trim().split(/\s+/).length
      : 0;
    const sellerMessage: Message = {
      id: crypto.randomUUID(),
      role: 'seller',
      content: content.trim(),
      timestamp: now,
      wordCount: sellerWordCount,
    };
    const updatedMessages = [...session.messages, sellerMessage];
    const lastSellerIndex = updatedMessages.findLastIndex(
      (m) => m.role === 'seller',
    );
    this.storage.updateSession(sessionId, {
      messages: updatedMessages,
    });
    const updatedSession = this.storage.getSessionById(sessionId)!;

    const analyticsPayload = this.analytics.compute(
      updatedSession.messages,
      lastSellerIndex,
      null,
    );
    this.analyticsGateway.broadcastToSession(sessionId, analyticsPayload);

    for await (const event of this.conversation.replyStream(updatedSession)) {
      if (event.type === 'delta') {
        yield { type: 'delta', delta: event.delta };
      } else {
        const buyerWordCount = event.content.trim()
          ? event.content.trim().split(/\s+/).length
          : 0;
        const buyerMessage: Message = {
          id: crypto.randomUUID(),
          role: 'buyer',
          content: event.content.trim(),
          timestamp: new Date().toISOString(),
          wordCount: buyerWordCount,
        };
        const finalMessages = [...updatedSession.messages, buyerMessage];
        this.storage.updateSession(sessionId, { messages: finalMessages });

        const talkRatioPayload = this.analytics.compute(
          finalMessages,
          lastSellerIndex,
          event.interestPercent,
        );
        this.analyticsGateway.broadcastToSession(sessionId, talkRatioPayload);

        yield { type: 'done', message: buyerMessage };
      }
    }
  }

  async endSession(sessionId: string): Promise<Evaluation> {
    const session = this.storage.getSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== 'active') {
      throw new BadRequestException('Session already completed');
    }

    const completedAt = new Date().toISOString();
    this.storage.updateSession(sessionId, {
      status: 'completed',
      completedAt,
    });
    const updatedSession = this.storage.getSessionById(sessionId)!;

    const evaluation =
      await this.conversation.generateEvaluation(updatedSession);
    this.storage.createEvaluation(evaluation);
    return evaluation;
  }
}
