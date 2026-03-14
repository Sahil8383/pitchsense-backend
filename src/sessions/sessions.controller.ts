import { Controller, Post, Body, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SessionsService } from './sessions.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post(':sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.sessionsService.sendMessage(
      sessionId,
      dto.content,
    );
    return { message };
  }

  @Post(':sessionId/messages/stream')
  async sendMessageStream(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const resWithFlush = res as Response & { flush?: () => void };
      for await (const event of this.sessionsService.sendMessageStream(
        sessionId,
        dto.content,
      )) {
        res.write(JSON.stringify(event) + '\n');
        if (typeof resWithFlush.flush === 'function') resWithFlush.flush();
      }
    } catch (err) {
      res.write(
        JSON.stringify({
          type: 'error',
          error: err instanceof Error ? err.message : 'Stream failed',
        }) + '\n',
      );
    } finally {
      res.end();
    }
  }

  @Post(':sessionId/end')
  async endSession(@Param('sessionId') sessionId: string) {
    return this.sessionsService.endSession(sessionId);
  }
}
