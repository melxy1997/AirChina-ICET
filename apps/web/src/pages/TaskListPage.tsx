import type { TaskStatus } from '@icet/shared';
import { TASK_STATUS_LABELS } from '@icet/shared';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskListItem } from '@/lib/api-types';
import { useTasks } from '@/lib/hooks';
import { useTaskFilterStore } from '@/lib/store';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PLANNING: 'bg-blue-100 text-blue-700',
  PLAN_REVIEW: 'bg-yellow-100 text-yellow-700',
  EXECUTING: 'bg-indigo-100 text-indigo-700',
  EXEC_REVIEW: 'bg-purple-100 text-purple-700',
  PAPER_DRAFT: 'bg-green-100 text-green-700',
  PAPER_REVIEW: 'bg-teal-100 text-teal-700',
  ARCHIVED: 'bg-gray-200 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function TaskListPage() {
  const navigate = useNavigate();
  const { status: statusFilter, setStatus } = useTaskFilterStore();

  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;

  const { data, isLoading } = useTasks(filters);
  const tasks = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">测试任务</h2>
        <button
          type="button"
          onClick={() => navigate('/tasks/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          新建任务
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={`px-3 py-1 rounded text-sm ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          全部
        </button>
        {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setStatus(key)}
            className={`px-3 py-1 rounded text-sm ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow overflow-hidden p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">底稿编号</th>
                <th className="px-4 py-3 text-left">测试单位</th>
                <th className="px-4 py-3 text-left">流程</th>
                <th className="px-4 py-3 text-left">执行人</th>
                <th className="px-4 py-3 text-center">状态</th>
                <th className="px-4 py-3 text-center">异常</th>
                <th className="px-4 py-3 text-left">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((t: TaskListItem) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/tasks/${t.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{t.paperId}</td>
                  <td className="px-4 py-3">{t.unitName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.scenario?.processLevel1} / {t.scenario?.processLevel2}
                  </td>
                  <td className="px-4 py-3">{t.tester?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusColor[t.status] || 'bg-gray-100'}`}
                    >
                      {TASK_STATUS_LABELS[t.status as TaskStatus] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(t._count?.anomalies ?? 0) > 0 ? (
                      <span className="text-red-500 font-bold">{t._count?.anomalies}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    暂无测试任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
