import { Controller, Post, Body, Param } from '@nestjs/common';
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

  @Post(':sessionId/end')
  async endSession(@Param('sessionId') sessionId: string) {
    return this.sessionsService.endSession(sessionId);
  }
}
