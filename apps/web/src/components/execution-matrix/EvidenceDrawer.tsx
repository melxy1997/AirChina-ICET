import type { EvidenceItem } from '@icet/shared';
import { useState } from 'react';
import type { ExecutionDisplayData } from './ResultCell';

interface EvidenceDrawerProps {
  execution: ExecutionDisplayData;
  open: boolean;
  onClose: () => void;
  onSaveHumanNote?: (note: string) => void;
}

export default function EvidenceDrawer({
  execution,
  open,
  onClose,
  onSaveHumanNote,
}: EvidenceDrawerProps) {
  const [note, setNote] = useState(execution.humanNote ?? '');
  const [collapsed, setCollapsed] = useState(false);

  if (!open) return null;

  const confidence = typeof execution.aiConfidence === 'number' ? execution.aiConfidence : 0;
  const confidencePercent = Math.round(confidence * 100);

  function renderAiReasoning(): React.ReactNode {
    if (typeof execution.aiReasoning !== 'string' || !execution.aiReasoning) return null;
    return (
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">AI 推理过程</h3>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {execution.aiReasoning}
        </div>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg bg-white shadow-xl h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">执行详情</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Result Summary */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">执行结果</h3>
            <div className="flex items-center gap-3">
              <span
                className={`text-2xl font-bold px-3 py-1 rounded ${
                  execution.result === '✓'
                    ? 'text-green-600 bg-green-100'
                    : execution.result === '×'
                      ? 'text-red-600 bg-red-100'
                      : execution.result === 'N/A'
                        ? 'text-yellow-600 bg-yellow-100'
                        : 'text-gray-400 bg-gray-100'
                }`}
              >
                {execution.result}
              </span>
              <span className="text-sm text-gray-500">
                {execution.executedBy === 'AI' ? 'AI 执行' : '人工执行'}
              </span>
            </div>
          </section>

          {/* Confidence Bar */}
          {execution.executedBy === 'AI' ? (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">AI 置信度</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      confidence >= 0.8
                        ? 'bg-green-500'
                        : confidence >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-gray-600 w-12 text-right">
                  {confidencePercent}%
                </span>
              </div>
            </section>
          ) : null}

          {renderAiReasoning()}

          {/* Evidence List */}
          {execution.aiEvidence && Array.isArray(execution.aiEvidence) && (execution.aiEvidence as EvidenceItem[]).length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                证据列表 ({(execution.aiEvidence as EvidenceItem[]).length} 项)
              </h3>
              <div className="space-y-3">
                {(execution.aiEvidence as EvidenceItem[]).map((ev, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg p-3 ${
                      ev.meetsCriteria ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          ev.meetsCriteria ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                            {ev.type}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{ev.description}</span>
                        </div>
                        {ev.extractedValue && (
                          <div className="text-xs text-gray-500 mt-1 font-mono bg-white px-2 py-1 rounded border">
                            {ev.extractedValue}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Tool Call History (collapsible) */}
          {execution.aiEvidence && Array.isArray(execution.aiEvidence) && (execution.aiEvidence as EvidenceItem[]).length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="text-sm font-semibold text-gray-700 hover:text-blue-600 flex items-center gap-1"
              >
                {collapsed ? '▶' : '▼'} 原始工具调用历史
              </button>
              {!collapsed && (
                <div className="mt-2 bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                  <pre>{JSON.stringify(execution.aiEvidence, null, 2)}</pre>
                </div>
              )}
            </section>
          )}

          {/* Human Note Input */}
          {onSaveHumanNote && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">人工备注</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full border rounded-lg p-3 text-sm resize-none"
                placeholder="输入人工备注或说明..."
              />
              <button
                type="button"
                onClick={() => onSaveHumanNote(note)}
                className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                保存备注
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
