import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { Evaluation } from '../common/interfaces';

@Injectable()
export class EvaluationsService {
  constructor(private readonly storage: StorageService) {}

  findBySessionId(sessionId: string): Evaluation {
    const evaluation = this.storage.getEvaluationBySessionId(sessionId);
    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }
    return evaluation;
  }
}
