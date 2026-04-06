import type { StepResultValue } from './base';
import type { SampleParsedContent } from './entities';

// ── TestExecutor Agent 状态 ──
export interface ExecutorState {
  step: import('./entities').TestStep;
  sample: import('./entities').Sample;
  parsedContent: SampleParsedContent;
  plan: string[];
  currentPlanStep: number;
  observations: Observation[];
  toolCallCount: number;
  result: StepResultValue | null;
  reasoning: string;
  evidence: import('./entities').EvidenceItem[];
  confidence: number;
}

export interface Observation {
  tool: string;
  input: string;
  output: string;
  relevance: number;
}
