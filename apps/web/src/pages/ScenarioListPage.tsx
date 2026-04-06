import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScenarioListItem } from '@/lib/api-types';
import { useCreateScenario, useScenarios } from '@/lib/hooks';

export default function ScenarioListPage() {
  const [page] = useState(1);
  const { data, isLoading } = useScenarios(page);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    processLevel1: '',
    processLevel2: '',
    processLevel3: '',
    name: '',
    description: '',
  });
  const createScenario = useCreateScenario();
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createScenario.mutateAsync(form);
    setShowForm(false);
    setForm({ processLevel1: '', processLevel2: '', processLevel3: '', name: '', description: '' });
  };

  const scenarios = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">业务场景管理</h2>
        <button
          type="button"
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
            disabled={createScenario.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {createScenario.isPending ? '创建中...' : '创建'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-gray-500">加载中...</div>
      ) : (
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
              {scenarios.map((s: ScenarioListItem) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/scenarios/${s.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.processLevel1}</td>
                  <td className="px-4 py-3">{s.processLevel2}</td>
                  <td className="px-4 py-3 text-center">{s._count?.regulations ?? 0}</td>
                  <td className="px-4 py-3 text-center">{s._count?.tasks ?? 0}</td>
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
      )}
    </div>
  );
}
