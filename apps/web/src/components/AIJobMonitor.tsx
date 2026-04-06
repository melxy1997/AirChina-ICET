import { useEffect } from 'react';
import { useAIJob } from '@/lib/hooks';

interface AIJobMonitorProps {
  jobId: string;
  onComplete?: () => void;
  onFail?: (err: string) => void;
}

const statusLabel: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '处理中',
  COMPLETED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
};

const statusColor: Record<string, string> = {
  QUEUED: 'text-yellow-600',
  RUNNING: 'text-blue-600',
  COMPLETED: 'text-green-600',
  FAILED: 'text-red-600',
  CANCELLED: 'text-gray-500',
};

export default function AIJobMonitor({ jobId, onComplete, onFail }: AIJobMonitorProps) {
  const { data: job } = useAIJob(jobId);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'COMPLETED') {
      onComplete?.();
    } else if (job.status === 'FAILED') {
      onFail?.(job.errorMessage ?? '未知错误');
    }
  }, [job?.status, onComplete, onFail]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="inline-block h-3 w-3 rounded-full bg-gray-200 animate-pulse" />
        加载中...
      </div>
    );
  }

  const progress = job.progress ?? 0;
  const isTerminal = job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED';

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className={`font-medium ${statusColor[job.status] || 'text-gray-600'}`}>
          {statusLabel[job.status] || job.status}
        </span>
        <span className="text-xs text-gray-400">{progress}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            job.status === 'FAILED'
              ? 'bg-red-500'
              : job.status === 'COMPLETED'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {job.currentStep && !isTerminal && (
        <p className="text-xs text-gray-500 truncate">{job.currentStep}</p>
      )}

      {job.status === 'FAILED' && job.errorMessage && (
        <p className="text-xs text-red-600 break-words">{job.errorMessage}</p>
      )}
    </div>
  );
}
