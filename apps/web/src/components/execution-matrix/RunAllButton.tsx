import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useAIJob } from '@/lib/hooks';
import { getSocket } from '@/lib/socket';

interface RunAllButtonProps {
  taskId: string;
  disabled?: boolean;
  onJobStart?: (jobId: string) => void;
}

export default function RunAllButton({ taskId, disabled, onJobStart }: RunAllButtonProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: jobData } = useAIJob(activeJobId);

  useEffect(() => {
    if (!activeJobId) return;

    const socket = getSocket();
    socket.emit('task:join', taskId);

    const handleCompleted = () => {
      qc.invalidateQueries({ queryKey: queryKeys.samples(taskId) });
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      toast('AI 全量执行完成', 'success');
      setActiveJobId(null);
      setRunning(false);
    };

    const handleFailed = () => {
      toast('AI 执行过程中出现错误', 'error');
      setActiveJobId(null);
      setRunning(false);
    };

    socket.on('ai_job.completed', handleCompleted);
    socket.on('ai_job.failed', handleFailed);

    return () => {
      socket.emit('task:leave', taskId);
      socket.off('ai_job.completed', handleCompleted);
      socket.off('ai_job.failed', handleFailed);
    };
  }, [activeJobId, taskId, qc, toast]);

  // Auto-reset when job reaches terminal state via polling
  useEffect(() => {
    if (jobData?.status === 'COMPLETED') {
      qc.invalidateQueries({ queryKey: queryKeys.samples(taskId) });
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      toast('AI 全量执行完成', 'success');
      setActiveJobId(null);
      setRunning(false);
    } else if (jobData?.status === 'FAILED') {
      toast('AI 执行过程中出现错误', 'error');
      setActiveJobId(null);
      setRunning(false);
    }
  }, [jobData?.status, qc, taskId, toast]);

  const handleRunAll = async () => {
    if (running) return;
    setRunning(true);
    try {
      const res = await api.post<{ jobId: string }>(`/tasks/${taskId}/executions/run-all`);
      setActiveJobId(res.jobId);
      onJobStart?.(res.jobId);
      toast('AI 全量执行已启动', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : '执行失败', 'error');
      setRunning(false);
    }
  };

  // Show progress bar while running
  if (activeJobId && jobData && (jobData.status === 'QUEUED' || jobData.status === 'RUNNING')) {
    const progress = jobData.progress ?? 0;
    const currentStep = jobData.currentStep ?? '准备中...';
    return (
      <div className="flex flex-col gap-1 w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden min-w-[200px]">
            <div
              className="h-3 bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap w-12 text-right">
            {progress}%
          </span>
        </div>
        <span className="text-xs text-gray-500 truncate">{currentStep}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRunAll}
      disabled={disabled || running}
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      AI 全量执行
    </button>
  );
}
