import type { TestStep, Sample, SampleParsedContent, EvidenceItem, StepResultValue } from '@icet/shared';
import { executeGraph, type ExecutorState } from './graph.js';
import type { Sample as PrismaSample } from '@prisma/client';

export interface StepExecutionResult {
  result: StepResultValue;
  reasoning: string;
  evidence: EvidenceItem[];
  confidence: number;
}

/**
 * Execute a single step against a single sample.
 * This is the core entry point for the TestExecutorAgent.
 */
export async function executeStep(
  step: TestStep,
  sample: Sample,
  parsedContent: SampleParsedContent,
): Promise<StepExecutionResult> {
  const initialState: ExecutorState = {
    step,
    sample,
    parsedContent,
    executionPlan: [],
    planStepIndex: 0,
    toolCallHistory: [],
    maxToolCalls: 10,
    finalResult: null,
    reasoning: '',
    evidence: [],
    confidence: 0,
    isComplete: false,
  };

  const result = await executeGraph(initialState);

  return {
    result: result.finalResult ?? 'PENDING',
    reasoning: result.reasoning,
    evidence: result.evidence,
    confidence: result.confidence,
  };
}
