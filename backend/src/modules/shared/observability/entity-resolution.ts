export enum EntityResolutionDecisionKind {
  Matched = 'matched',
  Unmatched = 'unmatched',
}

export enum EntityResolutionMatchStrategy {
  ExactAlias = 'exact_alias',
  HighConfidenceVector = 'high_confidence_vector',
  JudgeConfirmed = 'judge_confirmed',
}

export enum EntityResolutionUnmatchedReason {
  CandidateEmpty = 'candidate_empty',
  MissingEmbedding = 'missing_embedding',
  NoViableCandidates = 'no_viable_candidates',
  JudgeRejected = 'judge_rejected',
  JudgeError = 'judge_error',
  InvalidJudgeMatch = 'invalid_judge_match',
}

export enum EntityResolutionMode {
  Single = 'single',
  Batch = 'batch',
  ResolveByName = 'resolve_by_name',
  Unknown = 'unknown',
}

export enum EntityResolutionEntryPoint {
  Resolve = 'resolve',
  ResolveByName = 'resolve_by_name',
}

export enum EntityResolutionStage {
  PipelineStart = 'pipeline_start',
  ExactLookup = 'exact_lookup',
  ExactLookupComplete = 'exact_lookup_complete',
  CandidateSearch = 'candidate_search',
  HighConfidenceMatch = 'high_confidence_match',
  JudgePreparation = 'judge_preparation',
  JudgeInvocation = 'judge_invocation',
  JudgeFailure = 'judge_failure',
  JudgeVerdict = 'judge_verdict',
  NewDecision = 'new_decision',
  PipelineEnd = 'pipeline_end',
  InputRejected = 'input_rejected',
  PreflightEmbedding = 'preflight_embedding',
}

export enum EntityResolutionEvent {
  BatchStarted = 'batch_started',
  BatchExactLookupComplete = 'batch_exact_lookup_complete',
  BatchCompleted = 'batch_completed',
  BatchJudgePrepared = 'batch_judge_prepared',
  BatchJudgeInvoked = 'batch_judge_invoked',
  SingleStarted = 'single_started',
  CandidateEmpty = 'candidate_empty',
  ExactMatchFound = 'exact_match_found',
  ExactMissNoEmbedding = 'exact_miss_missing_embedding',
  HighConfidenceMatchFound = 'high_confidence_match_found',
  JudgeMarkedNew = 'judge_marked_new',
  JudgeMatchFound = 'judge_match_found',
  NoConfidentMatchMarkedNew = 'no_confident_match_marked_new',
  SingleJudgePrepared = 'single_judge_prepared',
  SingleJudgeInvoked = 'single_judge_invoked',
  EmbeddingPreflightFailed = 'embedding_preflight_failed',
  ExistingTopicReused = 'existing_topic_reused',
  ReverseResolutionExactMatch = 'reverse_resolution_exact_match',
  ReverseResolutionSemanticMatch = 'reverse_resolution_semantic_match',
  ReverseResolutionFailed = 'reverse_resolution_failed',
}

export enum EntityResolutionMetricOutcome {
  MatchedExactAlias = 'matched_exact_alias',
  MatchedHighConfidenceVector = 'matched_high_confidence_vector',
  MatchedJudgeConfirmed = 'matched_judge_confirmed',
  MatchedExistingTopicReuse = 'matched_existing_topic_reuse',
  UnmatchedCandidateEmpty = 'unmatched_candidate_empty',
  UnmatchedMissingEmbedding = 'unmatched_missing_embedding',
  UnmatchedNoViableCandidates = 'unmatched_no_viable_candidates',
  UnmatchedJudgeRejected = 'unmatched_judge_rejected',
  UnmatchedJudgeError = 'unmatched_judge_error',
  UnmatchedInvalidJudgeMatch = 'unmatched_invalid_judge_match',
}

export enum EntityResolutionReverseResult {
  Exact = 'exact',
  Semantic = 'semantic',
  Error = 'error',
}
