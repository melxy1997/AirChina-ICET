import { useMemo, useState } from 'react';
import ResultCell, { type ExecutionDisplayData } from './ResultCell';
import EvidenceDrawer from './EvidenceDrawer';
import { useUpdateStepResult } from '@/lib/hooks';
import type { SampleView } from '@/lib/api-types';

interface ExecutionMatrixProps {
  taskId: string;
  samples: SampleView[];
  planSteps: { id: string; index: number; description: string }[];
}

type ExecutionData = ExecutionDisplayData;

export default function ExecutionMatrix({ taskId, samples, planSteps }: ExecutionMatrixProps) {
  const updateResult = useUpdateStepResult();
  const [drawerExecution, setDrawerExecution] = useState<ExecutionData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sortedSteps = useMemo(
    () => [...planSteps].sort((a, b) => a.index - b.index),
    [planSteps],
  );

  const handleOverride = (sampleId: string, stepId: string, result: string) => {
    updateResult.mutate({ taskId, sampleId, stepId, result });
  };

  const handleViewEvidence = (execution: ExecutionData) => {
    setDrawerExecution(execution);
    setDrawerOpen(true);
  };

  const handleSaveHumanNote = async (note: string) => {
    if (!drawerExecution?.id) return;
    // TODO: implement save human note API call
    setDrawerOpen(false);
  };

  if (sortedSteps.length === 0) {
    return (
      <div className="text-center text-sm text-amber-700 py-6 rounded-lg bg-amber-50 border border-amber-100">
        无法显示执行矩阵：未找到测试步骤。请检查测试计划是否已保存。
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
              <th className="px-3 py-2 border text-left w-16">序号</th>
              <th className="px-3 py-2 border text-left min-w-[12rem]">样本内容</th>
              {sortedSteps.map((step) => (
                <th
                  key={step.id}
                  className="px-3 py-2 border text-center min-w-[7rem]"
                  title={step.description}
                >
                  <div className="flex flex-col items-center">
                    <span>步骤{step.index}</span>
                    <span className="text-[10px] text-gray-400 font-normal truncate max-w-[8rem]">
                      {step.description}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 border text-left w-24">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {samples.map((sample) => (
              <tr key={sample.id} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 border text-gray-500 text-center">{sample.no}</td>
                <td className="px-3 py-2 border align-top">
                  <div className="text-sm truncate max-w-xs" title={sample.content || undefined}>
                    {sample.content?.trim() ? sample.content : <span className="text-gray-400">（无）</span>}
                  </div>
                  {sample.files && sample.files.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {sample.files.length} 个附件
                    </div>
                  )}
                </td>
                {sortedSteps.map((step) => {
                  const ex = sample.stepExecutions?.find((e) => e.stepId === step.id) ?? null;
                  // The current API's StepExecutionView only has stepId + result.
                  // For the full execution data (evidence, reasoning, etc.), we'd need a richer API response.
                  // For now, we create a minimal ExecutionData.
                  const executionData: ExecutionData | null = ex
                    ? {
                        id: `${sample.id}-${step.id}`,
                        stepId: step.id,
                        result: ex.result,
                        executedBy: 'HUMAN',
                        aiConfidence: null,
                        aiReasoning: null,
                        aiEvidence: null,
                        humanOverride: false,
                        humanNote: null,
                      }
                    : null;
                  return (
                    <td key={step.id} className="px-3 py-2 border align-top">
                      <ResultCell
                        execution={executionData}
                        stepId={step.id}
                        sampleId={sample.id}
                        sampleNo={sample.no}
                        stepIndex={step.index}
                        taskId={taskId}
                        onOverride={handleOverride}
                        onViewEvidence={
                          ex && ex.result !== 'PENDING'
                            ? (exec) => handleViewEvidence(exec as ExecutionData)
                            : undefined
                        }
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 border text-gray-400 text-sm">
                  {sample.remark || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
        <span>样本总数: <strong className="text-gray-700">{samples.length}</strong></span>
        <span>
          已完成:{' '}
          <strong className="text-green-600">
            {samples.filter((s) =>
              sortedSteps.every((step) => {
                const ex = s.stepExecutions?.find((e) => e.stepId === step.id);
                return ex && ex.result !== 'PENDING';
              })
            ).length}
          </strong>
        </span>
        <span>
          待执行:{' '}
          <strong className="text-yellow-600">
            {samples.length -
              samples.filter((s) =>
                sortedSteps.every((step) => {
                  const ex = s.stepExecutions?.find((e) => e.stepId === step.id);
                  return ex && ex.result !== 'PENDING';
                })
              ).length}
          </strong>
        </span>
      </div>

      {/* Evidence Drawer */}
      {drawerExecution && (
        <EvidenceDrawer
          execution={drawerExecution}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaveHumanNote={handleSaveHumanNote}
        />
      )}
    </div>
  );
}
