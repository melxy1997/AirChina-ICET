import { callLLM, extractJSON } from '../../lib/llm.js';
import type { StepExecutionConfig } from '@icet/shared';
import type { StepCheckType } from '@icet/shared';

export const PLAN_GENERATION_SYSTEM_PROMPT = `你是内部控制评价测试专家。你擅长分析规章制度中的控制点，并设计出具体可执行的测试步骤。
你的输出必须是严格的 JSON 格式，不要包含任何其他文字或 Markdown 代码块标记。`;

export const PLAN_GENERATION_USER_PROMPT = `基于以下控制点列表，设计一份测试计划。

控制点列表：
{controlPointsText}

要求：
1. **控制点描述**（controlDescription）：整合所有控制点，形成一段连贯的叙述文本（200-500字），概括这些控制点的核心业务逻辑。
2. **测试步骤**（steps）：设计 3-8 个具体可执行的测试步骤。
   - 每个步骤必须是可以对一份具体文件执行的检查动作
   - 步骤描述要具体明确，例如：
     - "查看[文件]中是否存在[角色]的签字/盖章"
     - "核对[字段A]与[字段B]是否一致"
     - "检查[日期字段]是否在规定期限内"
   - 每个步骤配置合适的执行类型（checkType）和检查参数

可选的 checkType 及其对应的 executionConfig：
- SIGNATURE_PRESENCE: 检查签名/签字是否存在
  { "checkType": "SIGNATURE_PRESENCE", "signatureCheck": { "requiredSigners": ["总经理", "财务负责人"] } }
- SIGNATURE_CHAIN: 检查审批链条是否完整
  { "checkType": "SIGNATURE_CHAIN", "signatureCheck": { "requiredSigners": ["经办人", "部门经理", "总经理"] } }
- CONTENT_EXISTENCE: 检查特定内容/关键词是否存在
  { "checkType": "CONTENT_EXISTENCE", "contentCheck": { "requiredKeywords": ["预算", "审批"] } }
- CONTENT_MATCH: 检查内容是否匹配特定模式
  { "checkType": "CONTENT_MATCH", "contentCheck": { "patternMatch": ".*审批.*同意.*" } }
- DATE_VALIDITY: 检查日期字段是否有效/在规定期限内
  { "checkType": "DATE_VALIDITY", "dateCheck": { "fieldName": "审批日期", "rangeDescription": "2025年1月1日至2025年12月31日" } }
- AMOUNT_MATCH: 检查金额是否匹配
  { "checkType": "AMOUNT_MATCH", "amountCheck": { "fieldName": "预算金额", "tolerance": 0 } }
- DOCUMENT_COMPLETENESS: 检查文档完整性
  { "checkType": "DOCUMENT_COMPLETENESS", "contentCheck": { "requiredKeywords": ["附件", "附表"] } }
- FREE_FORM_AI: AI 自由判断（适合复杂场景）
  { "checkType": "FREE_FORM_AI", "freeFormCheck": { "prompt": "判断该文件的审批流程是否合规", "expectedEvidence": "审批签字、日期、盖章" } }

输出 JSON，格式如下：
{
  "controlDescription": "整合后的控制点描述文本",
  "controlIds": ["C1", "C2"],
  "steps": [
    {
      "index": 1,
      "description": "具体的测试步骤描述",
      "executionConfig": {
        "checkType": "SIGNATURE_PRESENCE",
        "signatureCheck": { "requiredSigners": ["总经理"] }
      }
    }
  ]
}

注意：
- steps 数组至少包含 2 个步骤，最多 8 个
- 每个步骤的 index 从 1 开始递增
- executionConfig 必须包含 checkType 字段，以及对应类型的配置对象
- 优先使用具体的 checkType（如 SIGNATURE_PRESENCE），只在确实需要 AI 自由判断时才用 FREE_FORM_AI`;

interface GeneratedPlan {
  controlDescription: string;
  controlIds: string[];
  steps: {
    index: number;
    description: string;
    executionConfig: {
      checkType: StepCheckType;
      signatureCheck?: { requiredSigners: string[] };
      contentCheck?: { requiredKeywords?: string[]; forbiddenKeywords?: string[]; patternMatch?: string };
      dateCheck?: { fieldName: string; rangeDescription?: string };
      amountCheck?: { fieldName: string; tolerance?: number };
      freeFormCheck?: { prompt: string; expectedEvidence: string };
    };
  }[];
}

export async function generatePlan(
  controlPointsText: string,
): Promise<GeneratedPlan> {
  const userPrompt = PLAN_GENERATION_USER_PROMPT.replace('{controlPointsText}', controlPointsText);

  const { content } = await callLLM({
    system: PLAN_GENERATION_SYSTEM_PROMPT,
    user: userPrompt,
    jsonMode: true,
    maxTokens: 4096,
  });

  const result = extractJSON<GeneratedPlan>(content);

  if (!result.controlDescription || !Array.isArray(result.steps) || result.steps.length === 0) {
    throw new Error('AI 生成的测试计划格式不正确');
  }

  return result;
}
