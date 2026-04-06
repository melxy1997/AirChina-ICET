import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  RegulationListItem,
  SampleView,
  ScenarioListItem,
  TaskDetailApi,
  TaskListItem,
} from './api-types';

// ── Query Keys ──
export const queryKeys = {
  scenarios: (page?: number) => ['scenarios', page] as const,
  scenario: (id: string) => ['scenario', id] as const,
  tasks: (filters?: Record<string, string>) => ['tasks', filters] as const,
  task: (id: string) => ['task', id] as const,
  samples: (taskId: string) => ['samples', taskId] as const,
  regulations: (page?: number) => ['regulations', page] as const,
  regulation: (id: string) => ['regulation', id] as const,
};

// ── Scenario Hooks ──
export function useScenarios(page = 1, _pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.scenarios(page),
    queryFn: () => api.get<{ data: ScenarioListItem[]; total: number }>('/scenarios'),
  });
}

export function useScenario(id: string) {
  return useQuery({
    queryKey: queryKeys.scenario(id),
    queryFn: () => api.get<ScenarioListItem>(`/scenarios/${id}`),
    enabled: !!id,
  });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/scenarios', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.put(`/scenarios/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/scenarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenarios'] }),
  });
}

// ── Task Hooks ──
export function useTasks(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters).toString();
      return api.get<{ data: TaskListItem[]; total: number }>(
        `/tasks${params ? `?${params}` : ''}`,
      );
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => api.get<TaskDetailApi>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<{ id: string }>('/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useTransitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) =>
      api.patch(`/tasks/${id}/status`, { status, comment }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.task(variables.id) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── Sample Hooks ──
export function useSamples(taskId: string) {
  return useQuery({
    queryKey: queryKeys.samples(taskId),
    queryFn: () =>
      api.get<{ sampleSetId: string | null; samples: SampleView[] }>(`/tasks/${taskId}/samples`),
    enabled: !!taskId,
  });
}

export function useAddSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...data }: { taskId: string } & Record<string, unknown>) =>
      api.post(`/tasks/${taskId}/samples`, data),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: queryKeys.samples(variables.taskId) }),
  });
}

export function useUpdateStepResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      sampleId,
      stepId,
      ...data
    }: {
      taskId: string;
      sampleId: string;
      stepId: string;
    } & Record<string, unknown>) =>
      api.put(`/tasks/${taskId}/samples/${sampleId}/steps/${stepId}`, data),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: queryKeys.samples(variables.taskId) }),
  });
}

// ── Regulation Hooks ──
export function useRegulations(page = 1, _pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.regulations(page),
    queryFn: () => api.get<{ data: RegulationListItem[]; total: number }>('/regulations'),
  });
}

// ── Paper Hooks ──
export function useGeneratePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/paper/generate`),
    onSuccess: (_data, taskId) => qc.invalidateQueries({ queryKey: queryKeys.task(taskId) }),
  });
}

export function useSubmitPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/paper/submit`),
    onSuccess: (_data, taskId) => qc.invalidateQueries({ queryKey: queryKeys.task(taskId) }),
  });
}
