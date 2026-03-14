import { Controller, Get, Param } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';

@Controller('sessions')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get(':sessionId/evaluation')
  findOne(@Param('sessionId') sessionId: string) {
    return this.evaluationsService.findBySessionId(sessionId);
  }
}
