import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { queryKeys } from '@/lib/hooks';

export function useTaskSocket(taskId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;

    const socket = getSocket();

    socket.emit('task:join', taskId);

    const handleProgress = (data: {
      jobId: string;
      progress: number;
      currentStep?: string;
    }) => {
      queryClient.setQueryData(['ai-job', data.jobId], (old: unknown) =>
        old ? { ...(old as object), ...data } : data,
      );
    };

    const handleCompleted = (data: { jobId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-job', data.jobId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.samples(taskId) });
    };

    const handleFailed = (data: { jobId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-job', data.jobId] });
    };

    const handleStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    };

    socket.on('ai_job.progress', handleProgress);
    socket.on('ai_job.completed', handleCompleted);
    socket.on('ai_job.failed', handleFailed);
    socket.on('task.status_changed', handleStatusChanged);

    return () => {
      socket.emit('task:leave', taskId);
      socket.off('ai_job.progress', handleProgress);
      socket.off('ai_job.completed', handleCompleted);
      socket.off('ai_job.failed', handleFailed);
      socket.off('task.status_changed', handleStatusChanged);
    };
  }, [taskId, queryClient]);
}
