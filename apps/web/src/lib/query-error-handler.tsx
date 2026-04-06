import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useToast } from '@/components/ui/toast';

export function QueryErrorHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handler = (error: unknown) => {
      const message = error instanceof Error ? error.message : '未知错误';
      toast(message, 'error');
    };

    queryClient.getDefaultOptions().mutations?.onError?.(handler as any);

    // Set global mutation error handler
    queryClient.setDefaultOptions({
      mutations: {
        onError: handler as any,
      },
    });
  }, [queryClient, toast]);

  return null;
}
