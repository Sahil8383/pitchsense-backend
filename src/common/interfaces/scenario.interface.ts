import type { Persona } from './persona.interface';
import type { ScenarioContext } from './scenario-context.interface';
import type { RubricCompetency } from './rubric.interface';

/**
 * Practice scenario: persona, context, and evaluation rubric.
 */
export interface Scenario {
  id: string;
  persona: Persona;
  context: ScenarioContext;
  rubric: RubricCompetency[];
  createdAt: string; // ISO 8601
}
