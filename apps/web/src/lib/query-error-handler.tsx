import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export function QueryErrorHandler() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handler = (error: unknown) => {
      const message = error instanceof Error ? error.message : '未知错误';
      toast(message, 'error');
    };

    queryClient.setDefaultOptions({
      mutations: {
        onError: handler,
      },
    });
  }, [queryClient, toast]);

  return null;
}
