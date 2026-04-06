import type { StepExecutionConfig, TestStep } from '@icet/shared';
import { useEffect, useState } from 'react';
import { useApprovePlan, usePlan, useUpdatePlan } from '@/lib/hooks';

interface PlanTabProps {
  taskId: string;
  isReviewer: boolean;
  currentStatus: string;
}

export default function PlanTab({ taskId, isReviewer, currentStatus }: PlanTabProps) {
  const { data: plan, isLoading } = usePlan(taskId);
  const updatePlan = useUpdatePlan();
  const approvePlan = useApprovePlan();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<{
    controlDescription: string;
    controlIds: string[];
    steps: { id?: string; description: string; executionConfig: StepExecutionConfig }[];
  }>({
    controlDescription: '',
    controlIds: [],
    steps: [],
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        controlDescription: plan.controlDescription || '',
        controlIds: plan.controlIds || [],
        steps: plan.steps.map((s: any) => ({
          id: s.id,
          description: s.description,
          executionConfig: s.executionConfig,
        })),
      });
    }
  }, [plan]);

  if (isLoading) return <div className="text-gray-500">加载中...</div>;

  const handleSave = () => {
    // 提交时不需要临时 ID
    const stepsToSave = formData.steps.map(({ id, ...rest }) => rest);
    updatePlan.mutate(
      { taskId, ...formData, steps: stepsToSave },
      {
        onSuccess: () => setEditMode(false),
      },
    );
  };

  const addStep = () => {
    setFormData({
      ...formData,
          steps: [
        ...formData.steps,
        {
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          description: '',
          executionConfig: {
            checkType: 'FREE_FORM_AI',
            freeFormCheck: { prompt: '', expectedEvidence: '' },
          },
        },
      ],
    });
  };

  const removeStep = (index: number) => {
    const newSteps = [...formData.steps];
    newSteps.splice(index, 1);
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    (newSteps[index] as any)[field] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...formData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setFormData({ ...formData, steps: newSteps });
  };

  const canEdit =
    currentStatus === 'DRAFT' || currentStatus === 'PLANNING' || currentStatus === 'PLAN_REVIEW';
  const showReviewActions = isReviewer && currentStatus === 'PLAN_REVIEW';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">测试计划</h3>
          {!editMode && canEdit && (
            <button
              onClick={() => setEditMode(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              编辑计划
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">控制点描述</label>
              <textarea
                value={formData.controlDescription}
                onChange={(e) => setFormData({ ...formData, controlDescription: e.target.value })}
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">测试步骤</label>
                <button
                  onClick={addStep}
                  className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100"
                >
                  添加步骤
                </button>
              </div>
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <div key={step.id} className="border rounded p-3 bg-gray-50 relative group">
                    <div className="flex gap-2 mb-2">
                      <span className="text-gray-400 font-bold">#{index + 1}</span>
                      <input
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="步骤描述"
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveStep(index, 'up')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveStep(index, 'down')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeStep(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div>
                      <select
                        value={step.executionConfig.checkType}
                        onChange={(e) => {
                          const newSteps = [...formData.steps];
                          newSteps[index].executionConfig.checkType = e.target.value as any;
                          setFormData({ ...formData, steps: newSteps });
                        }}
                        className="text-xs border rounded p-1"
                      >
                        <option value="FREE_FORM_AI">人工检查</option>
                        <option value="SIGNATURE_PRESENCE">签名检查</option>
                        <option value="CONTENT_EXISTENCE">内容检查</option>
                        <option value="DATE_VALIDITY">日期检查</option>
                        <option value="AMOUNT_MATCH">金额检查</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={updatePlan.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                保存计划
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                控制点描述
              </h4>
              <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                {plan?.controlDescription || '暂无描述'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                测试步骤
              </h4>
              {plan?.steps?.length > 0 ? (
                <div className="space-y-2">
                  {plan.steps.map((s: any, i: number) => (
                    <div key={s.id} className="flex gap-3 text-sm p-2 border-b last:border-0">
                      <span className="text-gray-400 font-medium">{i + 1}.</span>
                      <div>
                        <p className="text-gray-800">{s.description}</p>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {s.executionConfig.checkType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">尚未配置测试步骤</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showReviewActions && !editMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-bold text-orange-800 mb-2">计划审核</h3>
          <p className="text-sm text-orange-700 mb-4">作为审阅人，请确认测试计划是否符合要求。</p>
          <div className="flex gap-3">
            <button
              onClick={() => approvePlan.mutate({ taskId, approve: true })}
              disabled={approvePlan.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              审核通过
            </button>
            <button
              onClick={() => {
                const comment = window.prompt('请输入退回原因:');
                if (comment !== null) {
                  approvePlan.mutate({ taskId, approve: false, comment });
                }
              }}
              disabled={approvePlan.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              退回修改
            </button>
          </div>
        </div>
      )}

      {plan?.reviewStatus && plan.reviewStatus !== 'PENDING' && (
        <div
          className={`rounded-lg p-4 ${plan.reviewStatus === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          <div className="flex justify-between items-center">
            <h4
              className={`font-bold text-sm ${plan.reviewStatus === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}
            >
              审核结果: {plan.reviewStatus === 'APPROVED' ? '已通过' : '已退回'}
            </h4>
            <span className="text-xs text-gray-500">
              {plan.reviewedAt && new Date(plan.reviewedAt).toLocaleString()}
            </span>
          </div>
          {plan.reviewComment && (
            <p className="text-sm mt-2 text-gray-700 italic">“{plan.reviewComment}”</p>
          )}
        </div>
      )}
    </div>
  );
}
