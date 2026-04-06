import type { TaskStatus } from '@icet/shared';
import { ALLOWED_TRANSITIONS, TASK_STATUS_LABELS } from '@icet/shared';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, downloadFile } from '@/lib/api';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'samples' | 'paper'>('info');

  useEffect(() => {
    if (!id) return;
    api
      .get<any>(`/tasks/${id}`)
      .then(setTask)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleTransition = async (newStatus: string) => {
    if (!id) return;
    await api.patch(`/tasks/${id}/status`, { status: newStatus });
    const updated = await api.get<any>(`/tasks/${id}`);
    setTask(updated);
  };

  const handleExport = async () => {
    if (!id) return;
    await downloadFile(`/tasks/${id}/paper/export`, `working-paper-${id}.xlsx`);
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;
  if (!task) return <div className="text-red-500">任务不存在</div>;

  const transitions = ALLOWED_TRANSITIONS[task.status as TaskStatus] || [];

  return (
    <div>
      {/* 头部 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">
            {task.paperId} - {task.unitName}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {task.scenario?.processLevel1} / {task.scenario?.processLevel2}
          </p>
        </div>
        <div className="flex gap-2">
          {transitions.map((s) => (
            <button
              key={s}
              onClick={() => handleTransition(s)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
            >
              推进到: {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 border-b">
        {(['info', 'samples', 'paper'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {{ info: '基本信息', samples: '样本与执行', paper: '工作底稿' }[t]}
          </button>
        ))}
      </div>

      {/* 基本信息 */}
      {tab === 'info' && (
        <div className="bg-white rounded-lg shadow p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">状态</dt>
              <dd className="font-medium">{TASK_STATUS_LABELS[task.status as TaskStatus]}</dd>
            </div>
            <div>
              <dt className="text-gray-500">执行人</dt>
              <dd>{task.tester?.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">审阅人</dt>
              <dd>{task.reviewer?.name || '未指定'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">抽样方法</dt>
              <dd>{task.samplingMethod}</dd>
            </div>
            <div>
              <dt className="text-gray-500">抽样期间</dt>
              <dd>{task.samplingPeriod || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">完成日期</dt>
              <dd>{task.completionDate || '-'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">控制点描述</dt>
              <dd>{task.plan?.controlDescription || '尚未生成测试计划'}</dd>
            </div>
          </dl>
          {task.plan?.steps && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">测试步骤</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {task.plan.steps.map((s: any) => (
                  <li key={s.id}>{s.description}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 样本与执行 */}
      {tab === 'samples' && (
        <div className="bg-white rounded-lg shadow p-4">
          <TaskSampleMatrix taskId={id!} />
        </div>
      )}

      {/* 工作底稿 */}
      {tab === 'paper' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await api.post(`/tasks/${id}/paper/generate`);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
            >
              生成底稿
            </button>
            <button
              onClick={handleExport}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              导出 Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 样本执行矩阵子组件 */
function TaskSampleMatrix({ taskId }: { taskId: string }) {
  const [data, setData] = useState<{ sampleSetId: string | null; samples: any[] }>({
    sampleSetId: null,
    samples: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ sampleSetId: string | null; samples: any[] }>(`/tasks/${taskId}/samples`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [taskId]);

  const steps =
    data.samples.length > 0 && data.samples[0]?.stepExecutions?.length > 0
      ? data.samples[0].stepExecutions.map((e: any) => ({ id: e.stepId, index: 0 }))
      : [];

  const handleResultChange = async (sampleId: string, stepId: string, result: string) => {
    await api.put(`/tasks/${taskId}/samples/${sampleId}/steps/${stepId}`, { result });
    // 简单刷新
    const res = await api.get<{ sampleSetId: string | null; samples: any[] }>(
      `/tasks/${taskId}/samples`,
    );
    setData(res);
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;
  if (data.samples.length === 0)
    return <div className="text-gray-400 text-center py-8">暂无样本数据</div>;

  const resultOptions = ['✓', '×', 'N/A', 'PENDING'];
  const resultColor: Record<string, string> = {
    '✓': 'text-green-600',
    '×': 'text-red-600',
    'N/A': 'text-gray-400',
    PENDING: 'text-yellow-500',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left border">序号</th>
            <th className="px-3 py-2 text-left border">样本内容</th>
            {steps.map((step: { id: string }, i: number) => (
              <th key={step.id} className="px-3 py-2 text-center border">
                步骤{i + 1}
              </th>
            ))}
            <th className="px-3 py-2 text-left border">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.samples.map((s: any) => (
            <tr key={s.id}>
              <td className="px-3 py-2 border">{s.no}</td>
              <td className="px-3 py-2 border max-w-xs truncate">{s.content}</td>
              {s.stepExecutions.map((e: any) => (
                <td key={e.stepId} className="px-3 py-2 border text-center">
                  <select
                    value={e.result}
                    onChange={(ev) => handleResultChange(s.id, e.stepId, ev.target.value)}
                    className={`text-center font-bold ${resultColor[e.result] || ''}`}
                  >
                    {resultOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
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
