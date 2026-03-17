import { QuizQuestion } from '@/types';

export interface ShuffleResult {
  question: QuizQuestion;
  /** Maps shuffled index → original index (e.g. indexMap[0] = 2 means display slot 0 holds original option 2) */
  indexMap: number[];
}

/**
 * Shuffles the options of a quiz question using Fisher-Yates.
 * Returns the shuffled question (with updated correctAnswer) and an index map.
 */
export function shuffleQuestionOptions(question: QuizQuestion): ShuffleResult {
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return {
    question: {
      ...question,
      options: indices.map((i) => question.options[i]),
      correctAnswer: indices.indexOf(question.correctAnswer),
    },
    indexMap: indices,
  };
}

/**
 * Maps a display-index answer back to the original option index for backend submission.
 */
export function unshuffleAnswerIndex(displayIndex: number, indexMap: number[]): number {
  return indexMap[displayIndex];
}
