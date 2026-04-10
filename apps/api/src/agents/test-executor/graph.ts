import type { TestStep, Sample, SampleParsedContent, EvidenceItem, StepResultValue } from '@icet/shared';
import { callLLM, extractJSON } from '../../lib/llm.js';
import { searchText } from './tools/search-text.tool.js';
import { checkSignature } from './tools/check-signature.tool.js';
import { extractField } from './tools/extract-field.tool.js';
import { compareValues } from './tools/compare-values.tool.js';
import { checkCompleteness } from './tools/check-document-completeness.tool.js';

// ── Executor State ──

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  timestamp: string;
}

export interface ExecutorState {
  // Immutable input
  step: TestStep;
  sample: Sample;
  parsedContent: SampleParsedContent;

  // Mutable execution state
  executionPlan: string[];
  planStepIndex: number;
  toolCallHistory: ToolCallRecord[];
  maxToolCalls: number;

  // Output
  finalResult: StepResultValue | null;
  reasoning: string;
  evidence: EvidenceItem[];
  confidence: number;
  isComplete: boolean;
}

// ── Nodes ──

const PLAN_NODE_SYSTEM = `你是一个内部控制测试计划专家。基于测试步骤的要求和文档的结构化信息，制定3-5个具体的检查子任务。
每个子任务应该是一个明确的动作，如"搜索关键词X"、"检查Y签名"、"提取Z字段"等。
输出JSON数组，格式: ["检查子任务1", "检查子任务2", ...]`;

const JUDGE_NODE_SYSTEM = `你是一个内部控制测试裁判。基于以下测试步骤描述和完整的工具调用证据链，判断该步骤是否通过。
你必须输出严格的JSON，格式如下:
{
  "result": "✓" | "×" | "N/A",
  "reasoning": "详细的推理过程，说明为什么得出这个结论",
  "confidence": 0.0-1.0之间的数字,
  "evidence": [
    {
      "type": "TEXT" | "SIGNATURE" | "DATE" | "AMOUNT" | "ABSENCE",
      "description": "证据描述",
      "extractedValue": "提取的值(如有)",
      "meetsCriteria": true或false
    }
  ]
}

判断规则:
- 如果所有检查都通过 → "✓"
- 如果关键检查失败（如缺少必需签名、关键内容不存在）→ "×"
- 如果该步骤不适用于此样本 → "N/A"
- 置信度: 证据充分时 >0.8, 证据有限时 0.5-0.8, 不确定时 <0.5`;

async function planNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const stepDescription = state.step.description;
  const config = state.step.executionConfig;

  const userPrompt = `测试步骤: ${stepDescription}
执行配置: ${JSON.stringify(config, null, 2)}

文档摘要:
${state.parsedContent.summary || state.parsedContent.structureSummary || '（无摘要）'}

文档中包含的签名: ${(state.parsedContent.signatures ?? []).map((s) => s.signerHint).join(', ') || '（无）'}
文档中包含的日期: ${(state.parsedContent.dates ?? []).map((d) => d.value).join(', ') || '（无）'}
文档中包含的金额: ${(state.parsedContent.amounts ?? []).map((a) => String(a.value)).join(', ') || '（无）'}

请列出3-5个检查子任务。`;

  const { content } = await callLLM({
    system: PLAN_NODE_SYSTEM,
    user: userPrompt,
    jsonMode: true,
    maxTokens: 1024,
  });

  try {
    const plan = extractJSON<string[]>(content);
    if (Array.isArray(plan) && plan.length > 0) {
      return { executionPlan: plan.slice(0, 5) };
    }
  } catch {
    // Fallback: create a simple plan from config
    const fallbackPlan: string[] = [];
    if (config.checkType === 'SIGNATURE_PRESENCE' && config.signatureCheck?.requiredSigners) {
      for (const signer of config.signatureCheck.requiredSigners) {
        fallbackPlan.push(`检查是否存在 "${signer}" 的签字`);
      }
    }
    if (config.checkType === 'CONTENT_EXISTENCE' && config.contentCheck?.requiredKeywords) {
      for (const kw of config.contentCheck.requiredKeywords) {
        fallbackPlan.push(`搜索关键词 "${kw}"`);
      }
    }
    if (fallbackPlan.length === 0) {
      fallbackPlan.push(`检查步骤要求的内容是否在文档中存在`);
    }
    return { executionPlan: fallbackPlan };
  }

  return { executionPlan: [`执行检查: ${stepDescription}`] };
}

async function executeNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const config = state.step.executionConfig;
  const currentPlanStep = state.executionPlan[state.planStepIndex] ?? '';
  const pages = state.parsedContent.pages ?? [];

  const toolCalls: ToolCallRecord[] = [];
  const now = new Date().toISOString();

  // Execute tools based on the current plan step and execution config
  switch (config.checkType) {
    case 'SIGNATURE_PRESENCE':
    case 'SIGNATURE_CHAIN': {
      const signers = config.signatureCheck?.requiredSigners ?? [];
      for (const signer of signers) {
        if (currentPlanStep.toLowerCase().includes(signer.toLowerCase()) ||
            state.planStepIndex === 0) {
          const result = checkSignature(signer, state.parsedContent);
          toolCalls.push({
            tool: 'check_signature',
            input: { signerRole: signer },
            output: result.summary,
            timestamp: now,
          });
        }
      }
      break;
    }
    case 'CONTENT_EXISTENCE':
    case 'CONTENT_MATCH': {
      const keywords = config.contentCheck?.requiredKeywords ?? [];
      const forbidden = config.contentCheck?.forbiddenKeywords ?? [];
      const pattern = config.contentCheck?.patternMatch;

      for (const kw of keywords) {
        if (currentPlanStep.toLowerCase().includes(kw.toLowerCase()) ||
            state.planStepIndex === 0) {
          const result = searchText(kw, pages);
          toolCalls.push({
            tool: 'search_text',
            input: { query: kw },
            output: result.found
              ? `找到 ${result.matches.length} 处匹配`
              : '未找到匹配',
            timestamp: now,
          });
        }
      }

      for (const kw of forbidden) {
        const result = searchText(kw, pages);
        toolCalls.push({
          tool: 'search_text',
          input: { query: kw, type: 'forbidden' },
          output: result.found
            ? `发现禁止关键词 "${kw}" (${result.matches.length}处)`
            : '未发现禁止关键词',
          timestamp: now,
        });
      }

      if (pattern && pages.length > 0) {
        const result = searchText(pattern, pages);
        toolCalls.push({
          tool: 'search_text',
          input: { query: pattern, type: 'pattern' },
          output: result.found
            ? `找到 ${result.matches.length} 处模式匹配`
            : '未发现模式匹配',
          timestamp: now,
        });
      }
      break;
    }
    case 'DATE_VALIDITY': {
      const fieldName = config.dateCheck?.fieldName ?? '';
      if (fieldName) {
        const result = extractField(fieldName, 'date', state.parsedContent);
        toolCalls.push({
          tool: 'extract_field',
          input: { fieldName, fieldType: 'date' },
          output: result.found ? `找到: ${result.value}` : result.context ?? '未找到',
          timestamp: now,
        });
      }
      break;
    }
    case 'AMOUNT_MATCH': {
      const fieldName = config.amountCheck?.fieldName ?? '';
      if (fieldName) {
        const result = extractField(fieldName, 'amount', state.parsedContent);
        toolCalls.push({
          tool: 'extract_field',
          input: { fieldName, fieldType: 'amount' },
          output: result.found ? `找到: ${result.value}` : result.context ?? '未找到',
          timestamp: now,
        });
      }
      break;
    }
    case 'DOCUMENT_COMPLETENESS': {
      const fields = config.contentCheck?.requiredKeywords ?? [];
      if (fields.length > 0) {
        const result = checkCompleteness(fields, state.parsedContent);
        toolCalls.push({
          tool: 'check_completeness',
          input: { requiredFields: fields },
          output: result.summary,
          timestamp: now,
        });
      }
      break;
    }
    case 'FREE_FORM_AI': {
      // For free-form, use search based on the prompt hints
      const prompt = config.freeFormCheck?.prompt ?? '';
      const evidenceHints = config.freeFormCheck?.expectedEvidence ?? '';

      // Extract keywords from prompt
      const keywords = prompt
        .replace(/[？?，。、！!；;：:\s]/g, ' ')
        .split(' ')
        .filter((w) => w.length >= 2)
        .slice(0, 5);

      for (const kw of keywords) {
        const result = searchText(kw, pages);
        toolCalls.push({
          tool: 'search_text',
          input: { query: kw },
          output: result.found
            ? `找到 ${result.matches.length} 处`
            : '未找到',
          timestamp: now,
        });
      }

      if (evidenceHints) {
        const hints = evidenceHints.replace(/[，。、；;]/g, ' ').split(' ').filter((w) => w.length >= 2);
        for (const hint of hints.slice(0, 3)) {
          const result = searchText(hint, pages);
          toolCalls.push({
            tool: 'search_text',
            input: { query: hint, type: 'evidence' },
            output: result.found
              ? `找到证据: ${result.matches[0].snippet}`
              : '未找到',
            timestamp: now,
          });
        }
      }
      break;
    }
  }

  // If no tool calls were made, add a generic search
  if (toolCalls.length === 0 && pages.length > 0) {
    const stepKeywords = state.step.description
      .replace(/[检查查看核对确认是否存在的]/g, '')
      .split(/["""]/)
      .filter((s) => s.trim().length >= 2)
      .slice(0, 3);

    for (const kw of stepKeywords) {
      const result = searchText(kw.trim(), pages);
      toolCalls.push({
        tool: 'search_text',
        input: { query: kw.trim() },
        output: result.found ? `找到 ${result.matches.length} 处` : '未找到',
        timestamp: now,
      });
    }
  }

  return {
    toolCallHistory: [...state.toolCallHistory, ...toolCalls],
    planStepIndex: state.planStepIndex + 1,
  };
}

interface JudgeOutput {
  result: '✓' | '×' | 'N/A';
  reasoning: string;
  confidence: number;
  evidence: EvidenceItem[];
}

async function judgeNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const evidenceText = state.toolCallHistory
    .map(
      (tc, i) =>
        `${i + 1}. [${tc.tool}] 输入: ${JSON.stringify(tc.input)} → 输出: ${tc.output}`,
    )
    .join('\n');

  const userPrompt = `测试步骤: ${state.step.description}
执行配置: ${JSON.stringify(state.step.executionConfig, null, 2)}

工具调用证据链:
${evidenceText}

请综合以上所有检查结果，判断该步骤是否通过。`;

  const { content } = await callLLM({
    system: JUDGE_NODE_SYSTEM,
    user: userPrompt,
    jsonMode: true,
    maxTokens: 2048,
  });

  try {
    const judgment = extractJSON<JudgeOutput>(content);

    return {
      finalResult: judgment.result,
      reasoning: judgment.reasoning,
      evidence: judgment.evidence ?? [],
      confidence: judgment.confidence ?? 0.7,
      isComplete: true,
    };
  } catch {
    // Fallback judgment based on tool results
    const hasFailures = state.toolCallHistory.some(
      (tc) =>
        tc.output.includes('未找到') ||
        tc.output.includes('未发') ||
        tc.output.includes('缺少') ||
        tc.output.includes('不匹配'),
    );

    const hasSuccesses = state.toolCallHistory.some(
      (tc) =>
        tc.output.includes('找到') ||
        tc.output.includes('发现') ||
        tc.output.includes('存在') ||
        tc.output.includes('均已找到'),
    );

    let result: StepResultValue = 'PENDING';
    if (hasFailures && !hasSuccesses) result = '×';
    else if (hasSuccesses && !hasFailures) result = '✓';
    else if (hasFailures) result = '×';
    else result = '✓';

    return {
      finalResult: result,
      reasoning: `基于 ${state.toolCallHistory.length} 次工具调用的结果判断: ${
        result === '✓' ? '所有检查项均通过' : '存在未通过的检查项'
      }`,
      evidence: state.toolCallHistory.map((tc) => ({
        type: 'TEXT' as const,
        description: `[${tc.tool}] ${tc.output}`,
        extractedValue: tc.output,
        meetsCriteria: !tc.output.includes('未找到') && !tc.output.includes('未发'),
      })),
      confidence: 0.6,
      isComplete: true,
    };
  }
}

// ── Main Graph Execution ──

export async function executeGraph(
  initialState: Omit<ExecutorState, 'executionPlan' | 'planStepIndex' | 'toolCallHistory' | 'finalResult' | 'reasoning' | 'evidence' | 'confidence' | 'isComplete'> & {
    executionPlan?: string[];
    planStepIndex?: number;
    toolCallHistory?: ToolCallRecord[];
    finalResult?: StepResultValue | null;
    reasoning?: string;
    evidence?: EvidenceItem[];
    confidence?: number;
    isComplete?: boolean;
  },
): Promise<ExecutorState> {
  let state: ExecutorState = {
    ...initialState,
    executionPlan: initialState.executionPlan ?? [],
    planStepIndex: initialState.planStepIndex ?? 0,
    toolCallHistory: initialState.toolCallHistory ?? [],
    finalResult: initialState.finalResult ?? null,
    reasoning: initialState.reasoning ?? '',
    evidence: initialState.evidence ?? [],
    confidence: initialState.confidence ?? 0,
    isComplete: initialState.isComplete ?? false,
  };

  // Phase 1: Plan
  const planResult = await planNode(state);
  state = { ...state, ...planResult };

  // Phase 2: Execute (loop through plan steps)
  while (
    state.planStepIndex < state.executionPlan.length &&
    state.toolCallHistory.length < state.maxToolCalls
  ) {
    const execResult = await executeNode(state);
    state = { ...state, ...execResult };
  }

  // Phase 3: Judge
  const judgeResult = await judgeNode(state);
  state = { ...state, ...judgeResult };

  return state;
}
