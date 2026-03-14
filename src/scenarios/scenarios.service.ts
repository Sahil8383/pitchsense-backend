import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { Scenario } from '../common/interfaces';
import type { CreateScenarioDto } from './dto/create-scenario.dto';

@Injectable()
export class ScenariosService {
  constructor(private readonly storage: StorageService) {}

  create(dto: CreateScenarioDto): Scenario {
    const scenario = this.storage.createScenario({
      persona: dto.persona,
      context: dto.context,
      rubric: dto.rubric,
    });
    return scenario;
  }

  findById(id: string): Scenario {
    const scenario = this.storage.getScenarioById(id);
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }
    return scenario;
  }
}
