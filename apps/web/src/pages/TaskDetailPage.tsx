import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTask, useSamples, useTransitionStatus, useUpdateStepResult, useGeneratePaper } from '@/lib/hooks';
import { downloadFile } from '@/lib/api';
import { TASK_STATUS_LABELS, ALLOWED_TRANSITIONS } from '@icet/shared';
import type { TaskStatus } from '@icet/shared';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading } = useTask(id!);
  const { data: sampleData } = useSamples(id!);
  const transitionStatus = useTransitionStatus();
  const generatePaper = useGeneratePaper();
  const [tab, setTab] = useState<'info' | 'samples' | 'paper'>('info');

  if (isLoading) return <div className="text-gray-500">加载中...</div>;
  if (!task) return <div className="text-red-500">任务不存在</div>;

  const transitions = ALLOWED_TRANSITIONS[task.status as TaskStatus] || [];
  const steps = task.plan?.steps ?? [];
  const samples = sampleData?.samples ?? [];

  const handleExport = async () => {
    if (!id) return;
    await downloadFile(`/tasks/${id}/paper/export`, `working-paper-${id}.xlsx`);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">{task.paperId} - {task.unitName}</h2>
          <p className="text-gray-500 text-sm mt-1">{task.scenario?.processLevel1} / {task.scenario?.processLevel2}</p>
        </div>
        <div className="flex gap-2">
          {transitions.map((s) => (
            <button key={s} onClick={() => transitionStatus.mutate({ id: id!, status: s })}
              disabled={transitionStatus.isPending}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              推进到: {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b">
        {(['info', 'samples', 'paper'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {{ info: '基本信息', samples: '样本与执行', paper: '工作底稿' }[t]}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-lg shadow p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">状态</dt><dd className="font-medium">{TASK_STATUS_LABELS[task.status]}</dd></div>
            <div><dt className="text-gray-500">执行人</dt><dd>{task.tester?.name}</dd></div>
            <div><dt className="text-gray-500">审阅人</dt><dd>{task.reviewer?.name || '未指定'}</dd></div>
            <div><dt className="text-gray-500">抽样方法</dt><dd>{task.samplingMethod}</dd></div>
            <div><dt className="text-gray-500">抽样期间</dt><dd>{task.samplingPeriod || '-'}</dd></div>
            <div><dt className="text-gray-500">完成日期</dt><dd>{task.completionDate || '-'}</dd></div>
            <div className="col-span-2"><dt className="text-gray-500">控制点描述</dt><dd>{task.plan?.controlDescription || '尚未生成测试计划'}</dd></div>
          </dl>
          {steps.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">测试步骤</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {steps.map((s: any) => <li key={s.id}>{s.description}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      {tab === 'samples' && (
        <div className="bg-white rounded-lg shadow p-4">
          <SampleMatrix taskId={id!} samples={samples} />
        </div>
      )}

      {tab === 'paper' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => generatePaper.mutate(id!)} disabled={generatePaper.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              {generatePaper.isPending ? '生成中...' : '生成底稿'}
            </button>
            <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              导出 Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SampleMatrix({ taskId, samples }: { taskId: string; samples: any[] }) {
  const updateResult = useUpdateStepResult();

  const resultOptions = ['✓', '×', 'N/A', 'PENDING'];
  const resultColor: Record<string, string> = { '✓': 'text-green-600', '×': 'text-red-600', 'N/A': 'text-gray-400', 'PENDING': 'text-yellow-500' };

  if (samples.length === 0) return <div className="text-gray-400 text-center py-8">暂无样本数据</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left border">序号</th>
            <th className="px-3 py-2 text-left border">样本内容</th>
            {samples[0]?.stepExecutions?.map((e: any, i: number) => <th key={i} className="px-3 py-2 text-center border">步骤{i + 1}</th>)}
            <th className="px-3 py-2 text-left border">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {samples.map((s: any) => (
            <tr key={s.id}>
              <td className="px-3 py-2 border">{s.no}</td>
              <td className="px-3 py-2 border max-w-xs truncate">{s.content}</td>
              {s.stepExecutions.map((e: any) => (
                <td key={e.stepId} className="px-3 py-2 border text-center">
                  <select
                    value={e.result}
                    onChange={(ev) => updateResult.mutate({ taskId, sampleId: s.id, stepId: e.stepId, result: ev.target.value })}
                    disabled={updateResult.isPending}
                    className={`text-center font-bold ${resultColor[e.result] || ''}`}
                  >
                    {resultOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </td>
              ))}
              <td className="px-3 py-2 border text-gray-500">{s.remark || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
