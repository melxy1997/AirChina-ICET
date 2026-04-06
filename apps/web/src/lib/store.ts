import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskFilterState {
  status: string;
  testerId: string;
  setStatus: (status: string) => void;
  setTesterId: (testerId: string) => void;
  reset: () => void;
}

export const useTaskFilterStore = create<TaskFilterState>()(
  persist(
    (set) => ({
      status: '',
      testerId: '',
      setStatus: (status) => set({ status }),
      setTesterId: (testerId) => set({ testerId }),
      reset: () => set({ status: '', testerId: '' }),
    }),
    {
      name: 'icet-task-filters',
    }
  )
);
