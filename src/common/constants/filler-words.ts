/**
 * Filler words to detect in seller messages (analytics). Case-insensitive match.
 * @see BACKEND_SPEC §8.1
 */
export const FILLER_WORDS: readonly string[] = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'actually',
  'sort of',
  'kind of',
] as const;
