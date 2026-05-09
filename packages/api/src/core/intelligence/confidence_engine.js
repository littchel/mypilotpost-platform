/**
 * myPilotPost — Confidence Engine
 * NO FAKE CERTAINTY • STRATEGIC TRANSPARENCY
 */

export const CONFIDENCE_LEVELS = {
  MEASURED: "measured",      // Direct platform data
  INFERRED: "inferred",      // Calculated from correlated metrics
  ESTIMATED: "estimated",    // Algorithmic estimation
  BENCHMARKED: "benchmarked",// Compared against industry baseline
  USER_SUPPLIED: "user_supplied" // Manually entered by user
};

/**
 * Attaches confidence labels to a dataset
 */
export function wrapWithConfidence(data, level, evidence = null) {
  return {
    value: data,
    confidence: level,
    evidence: evidence,
    timestamp: new Date().toISOString()
  };
}

/**
 * Determines confidence level for a metric based on source
 */
export function getConfidenceForMetric(metricName, source) {
  if (source === 'api_direct') return CONFIDENCE_LEVELS.MEASURED;
  if (source === 'user_input') return CONFIDENCE_LEVELS.USER_SUPPLIED;
  if (source === 'calculation') return CONFIDENCE_LEVELS.INFERRED;
  if (source === 'ai_vision') return CONFIDENCE_LEVELS.ESTIMATED;
  
  return CONFIDENCE_LEVELS.BENCHMARKED;
}
