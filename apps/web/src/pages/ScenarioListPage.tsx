import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Scenario {
  id: string;
  name: string;
  processLevel1: string;
  processLevel2: string;
  processLevel3: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { regulations: number; tasks: number };
}

export default function ScenarioListPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    processLevel1: '',
    processLevel2: '',
    processLevel3: '',
    name: '',
    description: '',
  });
  const navigate = useNavigate();

  const fetchScenarios = async () => {
    try {
      const res = await api.get<{ data: Scenario[] }>('/scenarios');
      setScenarios(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/scenarios', form);
    setShowForm(false);
    setForm({ processLevel1: '', processLevel2: '', processLevel3: '', name: '', description: '' });
    fetchScenarios();
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">业务场景管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? '取消' : '新建场景'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 rounded-lg shadow mb-4 grid grid-cols-2 gap-3"
        >
          <input
            placeholder="一级流程"
            value={form.processLevel1}
            onChange={(e) => setForm({ ...form, processLevel1: e.target.value })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            placeholder="二级流程"
            value={form.processLevel2}
            onChange={(e) => setForm({ ...form, processLevel2: e.target.value })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            placeholder="三级流程（可选）"
            value={form.processLevel3}
            onChange={(e) => setForm({ ...form, processLevel3: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            placeholder="场景名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2"
            required
          />
          <input
            placeholder="描述（可选）"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-3 py-2 col-span-2"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            创建
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">场景名称</th>
              <th className="px-4 py-3 text-left">一级流程</th>
              <th className="px-4 py-3 text-left">二级流程</th>
              <th className="px-4 py-3 text-center">规章制度</th>
              <th className="px-4 py-3 text-center">测试任务</th>
              <th className="px-4 py-3 text-left">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {scenarios.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/scenarios/${s.id}`)}
              >
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.processLevel1}</td>
                <td className="px-4 py-3">{s.processLevel2}</td>
                <td className="px-4 py-3 text-center">{s._count.regulations}</td>
                <td className="px-4 py-3 text-center">{s._count.tasks}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
            {scenarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  暂无业务场景
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
