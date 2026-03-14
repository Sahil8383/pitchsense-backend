import type { RubricCompetency } from '../interfaces';

/**
 * Pre-configured SPIN Selling rubric (4 competencies, weights sum to 100).
 * @see BACKEND_SPEC §11
 */
export const SPIN_RUBRIC: RubricCompetency[] = [
  {
    id: 'comp-1',
    name: 'Situation Questions',
    description:
      "Establishes context about prospect's current processes, tools, operations",
    weight: 25,
  },
  {
    id: 'comp-2',
    name: 'Problem Questions',
    description: 'Surfaces pains, challenges, obstacles buyer faces',
    weight: 25,
  },
  {
    id: 'comp-3',
    name: 'Implication Questions',
    description: 'Explores consequences, business impact of problems',
    weight: 25,
  },
  {
    id: 'comp-4',
    name: 'Need-Payoff Questions',
    description: 'Guides buyer to articulate benefits of solving in own words',
    weight: 25,
  },
];
