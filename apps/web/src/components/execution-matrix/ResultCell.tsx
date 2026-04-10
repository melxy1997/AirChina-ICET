import type { EvidenceItem } from '@icet/shared';

export interface ExecutionDisplayData {
  id: string;
  stepId: string;
  result: string;
  executedBy: string;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
  aiEvidence?: unknown;
  humanOverride?: boolean;
  humanNote?: string | null;
}

interface ResultCellProps {
  execution: ExecutionDisplayData | null;
  stepId: string;
  sampleId: string;
  sampleNo: number;
  stepIndex: number;
  taskId: string;
  onOverride?: (sampleId: string, stepId: string, result: string) => void;
  onViewEvidence?: (execution: ExecutionDisplayData) => void;
  parsing?: boolean;
}

const RESULT_COLORS: Record<string, string> = {
  '✓': 'bg-green-100 text-green-700 border-green-300',
  '×': 'bg-red-100 text-red-700 border-red-300',
  'N/A': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  PENDING: 'bg-gray-100 text-gray-400 border-gray-200',
};

const RESULT_BADGE_COLORS: Record<string, string> = {
  '✓': 'bg-green-600',
  '×': 'bg-red-600',
  'N/A': 'bg-yellow-500',
  PENDING: 'bg-gray-400',
};

export default function ResultCell({
  execution,
  stepIndex,
  sampleNo,
  onOverride,
  onViewEvidence,
}: ResultCellProps) {
  const result = execution?.result ?? 'PENDING';
  const isAI = execution?.executedBy === 'AI';
  const isHuman = execution?.humanOverride || execution?.executedBy === 'HUMAN';
  const rawConfidence = execution?.aiConfidence;
  const confidence = typeof rawConfidence === 'number' ? rawConfidence : (rawConfidence ? parseFloat(rawConfidence) : null);
  const confidenceDisplay = confidence != null ? `${Math.round(confidence * 100)}%` : null;

  if (!execution) {
    return (
      <div className="flex items-center justify-center h-full min-h-[2.5rem] text-gray-300 text-xs">
        待执行
      </div>
    );
  }

  const handleOverride = (newResult: string) => {
    if (onOverride) {
      onOverride(String(execution.id), String(execution.stepId), newResult);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 min-h-[2.5rem]">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-bold ${RESULT_COLORS[result]}`}>
        <span>{result}</span>
        {isAI && confidenceDisplay && (
          <span
            className="text-[10px] text-white px-1 rounded-full"
            title={`AI 置信度: ${confidenceDisplay}`}
          >
            {confidenceDisplay}
          </span>
        )}
        {isHuman && (
          <span className="text-[10px] bg-blue-600 text-white px-1 rounded-full" title="人工覆盖">
            人
          </span>
        )}
      </div>

      {result === '×' && onViewEvidence && (
        <button
          type="button"
          onClick={() => onViewEvidence(execution)}
          className="text-xs text-red-600 hover:underline"
        >
          查看问题
        </button>
      )}

      {isAI && onViewEvidence && (
        <button
          type="button"
          onClick={() => onViewEvidence(execution)}
          className="text-xs text-blue-500 hover:underline"
        >
          查看证据
        </button>
      )}

      {/* Override dropdown */}
      {onOverride && (
        <select
          value={result}
          onChange={(e) => handleOverride(e.target.value)}
          className="text-xs border rounded px-1 py-0.5 mt-0.5 bg-white"
          title="人工覆盖结果"
        >
          <option value="✓">✓ 通过</option>
          <option value="×">× 不通过</option>
          <option value="N/A">N/A 不适用</option>
          <option value="PENDING">PENDING 待执行</option>
        </select>
      )}
    </div>
  );
}
