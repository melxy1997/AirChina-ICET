import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useCreateTask, useScenarios } from '@/lib/hooks';

const samplingMethods = ['随机抽样', '系统抽样', '判断抽样', '全量检查'];

export default function TaskNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const { data: scenarioData } = useScenarios();
  const scenarios = scenarioData?.data ?? [];

  const [form, setForm] = useState({
    scenarioId: '',
    paperId: '',
    unitName: '',
    testerId: user?.id || '',
    reviewerId: '',
    regulationIds: [] as string[],
    samplingMethod: '随机抽样',
    samplingPeriod: '',
    samplingSource: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const task = await createTask.mutateAsync(form);
      toast('任务创建成功', 'success');
      navigate(`/tasks/${task.id}`);
    } catch {
      // Error already handled by QueryErrorHandler
    }
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-6">新建测试任务</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* 底稿编号 */}
        <div>
          <label
            htmlFor="task-new-paperId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            底稿编号 *
          </label>
          <input
            id="task-new-paperId"
            type="text"
            value={form.paperId}
            onChange={(e) => update('paperId', e.target.value)}
            placeholder="例: ICET-2026-001"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 测试单位 */}
        <div>
          <label
            htmlFor="task-new-unitName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            测试单位 *
          </label>
          <input
            id="task-new-unitName"
            type="text"
            value={form.unitName}
            onChange={(e) => update('unitName', e.target.value)}
            placeholder="例: 华东分公司"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 业务场景 */}
        <div>
          <label
            htmlFor="task-new-scenarioId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            业务场景 *
          </label>
          <select
            id="task-new-scenarioId"
            value={form.scenarioId}
            onChange={(e) => update('scenarioId', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">请选择业务场景</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.processLevel1} / {s.processLevel2} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 抽样信息 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="task-new-samplingMethod"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              抽样方法
            </label>
            <select
              id="task-new-samplingMethod"
              value={form.samplingMethod}
              onChange={(e) => update('samplingMethod', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {samplingMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="task-new-samplingPeriod"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              抽样期间
            </label>
            <input
              id="task-new-samplingPeriod"
              type="text"
              value={form.samplingPeriod}
              onChange={(e) => update('samplingPeriod', e.target.value)}
              placeholder="例: 2026-Q1"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="task-new-samplingSource"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              样本来源
            </label>
            <input
              id="task-new-samplingSource"
              type="text"
              value={form.samplingSource}
              onChange={(e) => update('samplingSource', e.target.value)}
              placeholder="例: ERP系统"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={createTask.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createTask.isPending ? '创建中...' : '创建任务'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 rounded-md border hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
