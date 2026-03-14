/**
 * Score and feedback for one competency in an evaluation.
 */
export interface CompetencyScore {
  competencyId: string;
  competencyName: string;
  score: number; // 1–5
  feedback: string;
  weight: number;
}

/**
 * Post-session evaluation: weighted overall score and per-competency scores.
 */
export interface Evaluation {
  id: string;
  sessionId: string;
  overallScore: number; // 0–100, weighted
  competencies: CompetencyScore[];
  createdAt: string; // ISO 8601
}
