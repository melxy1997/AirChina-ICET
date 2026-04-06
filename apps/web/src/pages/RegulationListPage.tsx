import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Regulation {
  id: string;
  title: string;
  version: string;
  parseStatus: string;
  createdAt: string;
  fileRef: { id: string; originalName: string; fileType: string; sizeBytes: number };
  _count: { controlPoints: number; scenarios: number };
}

export default function RegulationListPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchList = async () => {
    try {
      const res = await api.get<{ data: Regulation[] }>('/regulations');
      setRegulations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await api.upload('/regulations', file, {
      title: file.name.replace(/\.[^.]+$/, ''),
      version: '1.0',
    });
    if (fileRef.current) fileRef.current.value = '';
    fetchList();
  };

  const parseStatusLabel: Record<string, string> = {
    QUEUED: '待解析',
    RUNNING: '解析中',
    COMPLETED: '已完成',
    FAILED: '失败',
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">规章制度库</h2>
        <label className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
          上传规章制度
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        </label>
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y">
            {regulations.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">{r.version}</td>
                <td className="px-4 py-3 text-center">{parseStatusLabel[r.parseStatus] || r.parseStatus}</td>
                <td className="px-4 py-3 text-center">{r._count.controlPoints}</td>
                <td className="px-4 py-3 text-center">{r._count.scenarios}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</td>
              </tr>
            ))}
            {regulations.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无规章制度</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
