import type { TaskStatus } from '@icet/shared';
import { ALLOWED_TRANSITIONS, TASK_STATUS_LABELS } from '@icet/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import PlanTab from '@/components/PlanTab';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, downloadFile } from '@/lib/api';
import type { SampleView, TaskDetailApi } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import {
  useAddSample,
  useGeneratePaper,
  useOrgUsers,
  usePaper,
  useSamples,
  useTask,
  useTransitionStatus,
  useUpdateStepResult,
  useUpdateTask,
} from '@/lib/hooks';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: task, isLoading } = useTask(id!);
  const { data: sampleData } = useSamples(id!);
  const transitionStatus = useTransitionStatus();
  const generatePaper = useGeneratePaper();
  const [tab, setTab] = useState<'info' | 'plan' | 'samples' | 'paper'>('info');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="flex gap-2 border-b pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }
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
              type="button"
              key={s}
              onClick={() => transitionStatus.mutate({ id: id!, status: s })}
              disabled={transitionStatus.isPending}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              推进到: {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b">
        {(['info', 'plan', 'samples', 'paper'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {{ info: '基本信息', plan: '测试计划', samples: '样本与执行', paper: '工作底稿' }[t]}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <TaskBasicInfoTab taskId={id!} task={task} steps={steps} />
      )}

      {tab === 'plan' && (
        <PlanTab
          taskId={id!}
          isReviewer={user?.role === 'REVIEWER' || user?.id === task.reviewerId}
          currentStatus={task.status}
        />
      )}

      {tab === 'samples' && (
        <div className="bg-white rounded-lg shadow p-4">
          <SamplesPanel task={task} taskId={id!} samples={samples} onGoToPlan={() => setTab('plan')} />
        </div>
      )}

      {tab === 'paper' && (
        <PaperTabPanel taskId={id!} />
      )}
    </div>
  );
}

const SAMPLING_METHODS = ['随机抽样', '系统抽样', '判断抽样', '全量检查'];

function TaskBasicInfoTab({
  taskId,
  task,
  steps,
}: {
  taskId: string;
  task: TaskDetailApi;
  steps: { id: string; description: string }[];
}) {
  const { toast } = useToast();
  const { data: orgUsersData } = useOrgUsers();
  const updateTask = useUpdateTask(taskId);
  const [editing, setEditing] = useState(false);
  const orgUsers = orgUsersData?.data ?? [];

  const [form, setForm] = useState(() => ({
    paperId: task.paperId,
    unitName: task.unitName,
    testerId: task.testerId ?? task.tester?.id ?? '',
    reviewerId: task.reviewerId ?? '',
    samplingMethod: task.samplingMethod ?? '随机抽样',
    samplingPeriod: task.samplingPeriod ?? '',
    samplingSource: task.samplingSource ?? '',
    completionDate: task.completionDate ?? '',
  }));

  const resetForm = () => {
    setForm({
      paperId: task.paperId,
      unitName: task.unitName,
      testerId: task.testerId ?? task.tester?.id ?? '',
      reviewerId: task.reviewerId ?? '',
      samplingMethod: task.samplingMethod ?? '随机抽样',
      samplingPeriod: task.samplingPeriod ?? '',
      samplingSource: task.samplingSource ?? '',
      completionDate: task.completionDate ?? '',
    });
  };

  const openEdit = () => {
    resetForm();
    setEditing(true);
  };

  const save = async () => {
    if (!form.paperId.trim() || !form.unitName.trim()) {
      toast('底稿编号与测试单位不能为空', 'error');
      return;
    }
    if (!form.testerId) {
      toast('请选择执行人', 'error');
      return;
    }
    try {
      await updateTask.mutateAsync({
        paperId: form.paperId.trim(),
        unitName: form.unitName.trim(),
        testerId: form.testerId,
        reviewerId: form.reviewerId.trim() ? form.reviewerId.trim() : null,
        samplingMethod: form.samplingMethod,
        samplingPeriod: form.samplingPeriod.trim(),
        samplingSource: form.samplingSource.trim(),
        completionDate: form.completionDate.trim() || null,
      });
      toast('基本信息已保存', 'success');
      setEditing(false);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '保存失败', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">任务信息</h3>
        {!editing ? (
          <button
            type="button"
            onClick={openEdit}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            编辑基本信息
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditing(false);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={updateTask.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateTask.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
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
              <dt className="text-gray-500">样本来源</dt>
              <dd>{task.samplingSource || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">完成日期</dt>
              <dd>{task.completionDate || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">底稿编号</dt>
              <dd className="font-medium">{task.paperId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">测试单位</dt>
              <dd>{task.unitName}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">控制点描述</dt>
              <dd>{task.plan?.controlDescription || '尚未生成测试计划'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">
            状态请使用右上角「推进到」调整。控制点与测试步骤请在「测试计划」页修改。
          </p>
        </>
      ) : (
        <div className="space-y-3 text-sm max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-edit-paperId" className="block text-xs text-gray-500 mb-1">
                底稿编号 *
              </label>
              <input
                id="task-edit-paperId"
                value={form.paperId}
                onChange={(e) => setForm((f) => ({ ...f, paperId: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="task-edit-unitName" className="block text-xs text-gray-500 mb-1">
                测试单位 *
              </label>
              <input
                id="task-edit-unitName"
                value={form.unitName}
                onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-edit-tester" className="block text-xs text-gray-500 mb-1">
                执行人 *
              </label>
              <select
                id="task-edit-tester"
                value={form.testerId}
                onChange={(e) => setForm((f) => ({ ...f, testerId: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              >
                <option value="">请选择</option>
                {orgUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-edit-reviewer" className="block text-xs text-gray-500 mb-1">
                审阅人（可选）
              </label>
              <select
                id="task-edit-reviewer"
                value={form.reviewerId}
                onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              >
                <option value="">未指定</option>
                {orgUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-edit-method" className="block text-xs text-gray-500 mb-1">
                抽样方法
              </label>
              <select
                id="task-edit-method"
                value={form.samplingMethod}
                onChange={(e) => setForm((f) => ({ ...f, samplingMethod: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              >
                {SAMPLING_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-edit-period" className="block text-xs text-gray-500 mb-1">
                抽样期间
              </label>
              <input
                id="task-edit-period"
                value={form.samplingPeriod}
                onChange={(e) => setForm((f) => ({ ...f, samplingPeriod: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
                placeholder="例: 2026-Q1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-edit-source" className="block text-xs text-gray-500 mb-1">
                样本来源
              </label>
              <input
                id="task-edit-source"
                value={form.samplingSource}
                onChange={(e) => setForm((f) => ({ ...f, samplingSource: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="task-edit-completion" className="block text-xs text-gray-500 mb-1">
                完成日期
              </label>
              <input
                id="task-edit-completion"
                value={form.completionDate}
                onChange={(e) => setForm((f) => ({ ...f, completionDate: e.target.value }))}
                className="w-full rounded border px-2 py-1.5"
                placeholder="可留空"
              />
            </div>
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">测试步骤</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s.id}>{s.description}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function PaperTabPanel({ taskId }: { taskId: string }) {
  const { data: paper, isLoading, refetch } = usePaper(taskId);
  const generatePaper = useGeneratePaper();
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      await generatePaper.mutateAsync(taskId);
      toast('底稿生成成功', 'success');
      refetch();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : '生成失败', 'error');
    }
  };

  const handleExport = async () => {
    await downloadFile(`/tasks/${taskId}/paper/export`, `working-paper-${taskId}.xlsx`);
  };

  if (isLoading) return <div className="text-gray-500 py-8 text-center">读取底稿中...</div>;

  if (!paper) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center space-y-4">
        <div className="text-gray-400">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">尚未生成工作底稿</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            底稿将汇总测试计划、样本执行结果、异常发现等所有信息。在完成样本执行后，请点击下方按钮生成。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generatePaper.isPending}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {generatePaper.isPending ? '生成中...' : '生成正式底稿'}
        </button>
      </div>
    );
  }

  const data = paper.snapshotData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
        <div>
          <span className="text-sm text-gray-500">底稿版本：</span>
          <span className="text-sm font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            V{paper.version}
          </span>
          <span className="ml-4 text-xs text-gray-400">
            生成时间：{new Date(paper.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generatePaper.isPending}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            重新生成
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            导出 Excel
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center border-b pb-6">
            <h1 className="text-2xl font-bold text-gray-900">内部控制评价测试底稿</h1>
            <p className="text-gray-500 mt-2">编号：{data.paperId}</p>
          </div>

          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2">基本信息</h2>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">业务流程</span>
                <span>
                  {data.processLevel1} / {data.processLevel2}
                </span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">业务场景</span>
                <span>{data.scenarioName}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">被评价单位</span>
                <span>{data.unitName}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">测试人</span>
                <span>{data.testerName}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">评价期间</span>
                <span>{data.samplePeriod}</span>
              </div>
              <div className="flex justify-between border-b py-1">
                <span className="text-gray-500">完成日期</span>
                <span>{data.completionDate || '-'}</span>
              </div>
            </div>
          </section>

          {/* Control Point */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2">控制描述</h2>
            <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 leading-relaxed italic">
              {data.controlDescription}
            </div>
          </section>

          {/* Test Matrix */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2">抽样测试记录</h2>
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 uppercase">
                  <tr>
                    <th className="px-3 py-2 border">序号</th>
                    <th className="px-3 py-2 border min-w-[12rem]">样本内容</th>
                    {data.steps.map((s: any) => (
                      <th key={s.index} className="px-3 py-2 border text-center font-medium" title={s.description}>
                        步骤{s.index}
                      </th>
                    ))}
                    <th className="px-3 py-2 border">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.samples.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 border text-gray-500">{s.no}</td>
                      <td className="px-3 py-2 border font-medium">{s.content}</td>
                      {data.steps.map((step: any, idx: number) => {
                        const result = s.stepResults[idx] || 'PENDING';
                        return (
                          <td
                            key={idx}
                            className={`px-3 py-2 border text-center font-bold ${
                              result === '✓'
                                ? 'text-green-600'
                                : result === '×'
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            }`}
                          >
                            {result}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 border text-gray-400 italic">
                        {s.remark || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Conclusion */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold border-l-4 border-blue-600 pl-2">测试结论</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">样本总数</div>
                <div className="text-xl font-bold">{data.sampleCount}</div>
              </div>
              <div className="p-4 border rounded bg-green-50">
                <div className="text-xs text-gray-500 mb-1">运行有效</div>
                <div className="text-xl font-bold text-green-700">
                  {data.samples.filter((s: any) => s.stepResults.every((r: any) => r === '✓' || r === 'N/A')).length}
                </div>
              </div>
              <div className="p-4 border rounded bg-red-50">
                <div className="text-xs text-gray-500 mb-1">异常发现</div>
                <div className="text-xl font-bold text-red-700">{data.anomalies.length}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

type PlanStepRow = { id: string; index: number; description: string };

async function openFileDownload(fileId: string) {
  const { url } = await api.get<{ url: string }>(`/files/${fileId}`);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function SamplesPanel({
  task,
  taskId,
  samples,
  onGoToPlan,
}: {
  task: TaskDetailApi;
  taskId: string;
  samples: SampleView[];
  onGoToPlan: () => void;
}) {
  const planSteps = useMemo(() => {
    const raw = task.plan?.steps ?? [];
    return [...raw].sort((a, b) => a.index - b.index);
  }, [task.plan?.steps]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 space-y-2">
        <p>
          <span className="font-medium text-gray-800">本页做什么：</span>
          每个<strong>样本</strong>对应一套<strong>材料包</strong>：可上传多个文件，或上传一个压缩包（zip/rar
          等）作为整包证据；并填写简短标识（如凭证号）。再按「测试计划」中的步骤逐条勾选执行结论（✓ / × /
          N/A）。
        </p>
        <p className="text-gray-500">
          与计划步骤对应的矩阵列由系统自动带出。若尚未生成测试计划或计划中无步骤，请先完成「测试计划」页。
        </p>
      </div>

      {planSteps.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium mb-2">还不能添加样本</p>
          <p className="mb-3">
            当前任务没有可用的测试步骤。请先在「测试计划」中生成并保存计划（至少包含一条测试步骤），再回到本页添加样本并填写执行结果。
          </p>
          <button
            type="button"
            onClick={onGoToPlan}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-white text-sm hover:bg-amber-800"
          >
            去「测试计划」
          </button>
        </div>
      ) : (
        <>
          <AddSampleForm taskId={taskId} samples={samples} planSteps={planSteps} />
          {samples.length > 0 ? (
            <SampleMatrix taskId={taskId} samples={samples} planSteps={planSteps} />
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              尚未添加样本。请使用上方表单添加第一条样本后，将显示执行矩阵。
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AddSampleForm({
  taskId,
  samples,
  planSteps,
}: {
  taskId: string;
  samples: SampleView[];
  planSteps: PlanStepRow[];
}) {
  const { toast } = useToast();
  const addSample = useAddSample();
  const nextNo = useMemo(() => {
    if (samples.length === 0) return 1;
    return Math.max(...samples.map((s) => s.no)) + 1;
  }, [samples]);

  const [no, setNo] = useState(nextNo);
  const [content, setContent] = useState('');
  const [remark, setRemark] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNo(nextNo);
  }, [nextNo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = content.trim();
    if (!c && pendingFiles.length === 0) {
      toast('请填写样本说明，或选择至少一个附件（可多选，也可选一个压缩包）', 'error');
      return;
    }
    const n = Number(no);
    if (!Number.isInteger(n) || n < 1) {
      toast('序号须为正整数', 'error');
      return;
    }
    setUploading(true);
    try {
      const fileIds: string[] = [];
      for (const file of pendingFiles) {
        const ref = await api.upload<{ id: string }>('/files/upload', file, { prefix: 'samples' });
        fileIds.push(ref.id);
      }
      await addSample.mutateAsync({
        taskId,
        no: n,
        ...(c ? { content: c } : {}),
        ...(fileIds.length > 0 ? { fileIds } : {}),
        ...(remark.trim() ? { remark: remark.trim() } : {}),
      });
      toast('样本已添加', 'success');
      setContent('');
      setRemark('');
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : '添加失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (planSteps.length === 0) return null;

  const busy = uploading || addSample.isPending;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-800">添加样本（材料包）</h3>
      <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
        <div>
          <label htmlFor="sample-no" className="block text-xs text-gray-500 mb-1">
            序号
          </label>
          <input
            id="sample-no"
            type="number"
            min={1}
            value={no}
            onChange={(e) => setNo(Number(e.target.value))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="sample-content" className="block text-xs text-gray-500 mb-1">
            样本说明（与附件二选一必填）
          </label>
          <input
            id="sample-content"
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="例：凭证包-2026Q1-01；若材料主要在附件中可留空"
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="sample-files" className="block text-xs text-gray-500 mb-1">
          材料附件（可多选；或打一个 zip 作为整包）
        </label>
        <input
          ref={fileInputRef}
          id="sample-files"
          type="file"
          multiple
          onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border file:bg-gray-50 file:px-2 file:py-1"
        />
        {pendingFiles.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">已选 {pendingFiles.length} 个文件</p>
        )}
      </div>
      <div>
        <label htmlFor="sample-remark" className="block text-xs text-gray-500 mb-1">
          备注（可选）
        </label>
        <input
          id="sample-remark"
          type="text"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? '上传文件中...' : addSample.isPending ? '提交中...' : '添加样本'}
      </button>
    </form>
  );
}

function SampleMatrix({
  taskId,
  samples,
  planSteps,
}: {
  taskId: string;
  samples: SampleView[];
  planSteps: PlanStepRow[];
}) {
  const updateResult = useUpdateStepResult();

  const resultOptions = ['✓', '×', 'N/A', 'PENDING'];
  const resultColor: Record<string, string> = {
    '✓': 'text-green-600',
    '×': 'text-red-600',
    'N/A': 'text-gray-400',
    PENDING: 'text-yellow-500',
  };

  const columns =
    planSteps.length > 0
      ? planSteps
      : (samples[0]?.stepExecutions ?? []).map((e, i) => ({
          id: e.stepId,
          index: i,
          description: '',
        }));

  if (columns.length === 0) {
    return (
      <div className="text-center text-sm text-amber-700 py-6 rounded-lg bg-amber-50 border border-amber-100">
        无法显示执行矩阵：未找到测试步骤。请检查测试计划是否已保存。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left border">序号</th>
            <th className="px-3 py-2 text-left border">样本内容</th>
            {columns.map((step, i) => (
              <th key={step.id} className="px-3 py-2 text-center border min-w-[7rem]" title={step.description}>
                步骤 {i + 1}
              </th>
            ))}
            <th className="px-3 py-2 text-left border">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {samples.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2 border">{s.no}</td>
              <td className="px-3 py-2 border max-w-xs align-top">
                <div className="truncate text-sm" title={s.content || undefined}>
                  {s.content?.trim() ? s.content : <span className="text-gray-400">（无文字说明）</span>}
                </div>
                {s.files && s.files.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {s.files.map(({ fileRef }) => (
                      <li key={fileRef.id} className="truncate">
                        <button
                          type="button"
                          onClick={() => openFileDownload(fileRef.id)}
                          className="text-left text-blue-600 hover:underline max-w-full truncate inline-block"
                        >
                          {fileRef.originalName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              {columns.map((step) => {
                const ex = s.stepExecutions.find((e) => e.stepId === step.id);
                const value = ex?.result ?? 'PENDING';
                return (
                  <td key={step.id} className="px-3 py-2 border text-center">
                    <select
                      value={value}
                      onChange={(ev) =>
                        updateResult.mutate({
                          taskId,
                          sampleId: s.id,
                          stepId: step.id,
                          result: ev.target.value,
                        })
                      }
                      disabled={updateResult.isPending}
                      className={`text-center font-bold max-w-full ${resultColor[value] || ''}`}
                    >
                      {resultOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
              <td className="px-3 py-2 border text-gray-500">{s.remark || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
