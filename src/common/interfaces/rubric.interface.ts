/**
 * Single competency in the evaluation rubric. Weights typically 1–100; sum to 100 for scenario.
 */
export interface RubricCompetency {
  id: string;
  name: string;
  description: string;
  weight: number;
}
