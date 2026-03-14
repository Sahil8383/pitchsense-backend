import type { RubricCompetency } from '../../common/interfaces/rubric.interface';

export function buildEvaluationPrompt(
  transcript: string,
  rubric: RubricCompetency[],
): string {
  const rubricBlock = rubric
    .map((r) => `- ${r.id} (${r.name}, weight ${r.weight}): ${r.description}`)
    .join('\n');

  return `You are evaluating a sales conversation against the SPIN selling framework.

## Transcript
${transcript}

## Rubric (score each 1–5; weights sum to 100)
${rubricBlock}

Score each competency from 1 (poor) to 5 (excellent) and provide brief feedback. Output valid JSON only, no markdown or explanation, in this exact shape:

{
  "competencies": [
    {
      "competencyId": "<id from rubric>",
      "competencyName": "<name from rubric>",
      "score": <1-5>,
      "feedback": "<one sentence>"
    }
  ]
}

Include one object for each rubric competency. Output nothing else.`;
}
