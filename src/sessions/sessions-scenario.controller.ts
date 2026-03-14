import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('scenarios')
export class SessionsScenarioController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post(':scenarioId/sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(@Param('scenarioId') scenarioId: string) {
    return this.sessionsService.createSession(scenarioId);
  }
}
