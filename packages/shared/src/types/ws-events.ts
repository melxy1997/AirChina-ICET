/** WebSocket event payloads for AI job real-time updates */

export interface AIJobProgressEvent {
  jobId: string;
  progress: number;
  currentStep?: string;
  inputEntityType: string;
  inputEntityId: string;
}

export interface AIJobCompletedEvent {
  jobId: string;
  outputEntityType?: string;
  outputEntityId?: string;
  inputEntityType: string;
  inputEntityId: string;
}

export interface AIJobFailedEvent {
  jobId: string;
  error: string;
  inputEntityType: string;
  inputEntityId: string;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  status: string;
  previousStatus?: string;
  changedBy?: string;
}

export interface WSEventMap {
  'ai_job.progress': AIJobProgressEvent;
  'ai_job.completed': AIJobCompletedEvent;
  'ai_job.failed': AIJobFailedEvent;
  'task.status_changed': TaskStatusChangedEvent;
}
