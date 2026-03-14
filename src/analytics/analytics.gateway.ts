import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { AnalyticsPayload } from '../common/interfaces';

type WsClient = { send(data: string): void; readyState: number };

@WebSocketGateway({ path: '/ws' })
export class AnalyticsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: unknown;

  private readonly sessionClients = new Map<string, Set<WsClient>>();
  private readonly clientToSession = new Map<WsClient, string>();

  handleDisconnect(client: WsClient): void {
    const sessionId = this.clientToSession.get(client);
    if (sessionId) {
      this.clientToSession.delete(client);
      const set = this.sessionClients.get(sessionId);
      if (set) {
        set.delete(client);
        if (set.size === 0) this.sessionClients.delete(sessionId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: WsClient, payload: { sessionId?: string }): void {
    const sessionId = payload?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') return;
    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, new Set());
    }
    this.sessionClients.get(sessionId)!.add(client);
    this.clientToSession.set(client, sessionId);
  }

  broadcastToSession(sessionId: string, payload: AnalyticsPayload): void {
    const clients = this.sessionClients.get(sessionId);
    if (!clients) return;
    const message = JSON.stringify({ event: 'analytics', data: payload });
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }
}
