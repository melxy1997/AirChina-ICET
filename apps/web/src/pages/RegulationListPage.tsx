import { useRef, useState } from 'react';
import AIJobMonitor from '@/components/AIJobMonitor';
import { api } from '@/lib/api';
import type { RegulationListItem } from '@/lib/api-types';
import { useParseRegulation, useRegulations } from '@/lib/hooks';

export default function RegulationListPage() {
  const { data, isLoading, refetch } = useRegulations();
  const fileRef = useRef<HTMLInputElement>(null);
  const regulations = data?.data ?? [];
  const parseRegulation = useParseRegulation();
  const [activeJobMap, setActiveJobMap] = useState<Record<string, string>>({});

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await api.upload('/regulations', file, {
      title: file.name.replace(/\.[^.]+$/, ''),
      version: '1.0',
    });
    if (fileRef.current) fileRef.current.value = '';
    refetch();
  };

  const handleParse = async (regulationId: string) => {
    const result = await parseRegulation.mutateAsync(regulationId);
    setActiveJobMap((prev) => ({ ...prev, [regulationId]: result.jobId }));
  };

  const parseStatusLabel: Record<string, string> = {
    QUEUED: '待解析',
    RUNNING: '解析中',
    COMPLETED: '已完成',
    FAILED: '失败',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">规章制度库</h2>
        <label
          htmlFor="regulation-upload"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
        >
          上传规章制度
          <input
            id="regulation-upload"
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="text-gray-500">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">标题</th>
                <th className="px-4 py-3 text-left">版本</th>
                <th className="px-4 py-3 text-center">解析状态</th>
                <th className="px-4 py-3 text-center">控制点</th>
                <th className="px-4 py-3 text-center">关联场景</th>
                <th className="px-4 py-3 text-left">上传时间</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {regulations.map((r: RegulationListItem) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3">{r.version}</td>
                  <td className="px-4 py-3 text-center">
                    {parseStatusLabel[r.parseStatus] || r.parseStatus}
                  </td>
                  <td className="px-4 py-3 text-center">{r._count?.controlPoints ?? 0}</td>
                  <td className="px-4 py-3 text-center">{r._count?.scenarios ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-center space-y-1">
                    {r.parseStatus !== 'COMPLETED' && !activeJobMap[r.id] && (
                      <button
                        type="button"
                        onClick={() => void handleParse(r.id)}
                        disabled={parseRegulation.isPending}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        解析
                      </button>
                    )}
                    {activeJobMap[r.id] && (
                      <div className="w-48">
                        <AIJobMonitor
                          jobId={activeJobMap[r.id]}
                          onComplete={() => {
                            setActiveJobMap((prev) => {
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                            refetch();
                          }}
                          onFail={() => {
                            setActiveJobMap((prev) => {
                              const next = { ...prev };
                              delete next[r.id];
                              return next;
                            });
                          }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {regulations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    暂无规章制度
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
