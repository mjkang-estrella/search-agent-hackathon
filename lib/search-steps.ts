/** The three steps a person sees while one intention searches. The board and the guided flow share them. */
export const SEARCH_STEPS = ["Planning", "Searching the web and people", "Checking fit"] as const;

/** Folds a run's stage into the index of the step in progress. */
export function searchStep(stage?: string | null) {
  if (!stage || stage === "created" || stage === "solution_planning") return 0;
  return stage === "discovery" ? 1 : 2;
}
