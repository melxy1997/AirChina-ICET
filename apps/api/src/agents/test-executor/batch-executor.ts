import { prisma } from '../../db/prisma.js';
import * as aiJobService from '../../services/ai-job.service.js';
import { executeStep } from './step-executor.js';
import { createAnomalyFromExecution } from '../../services/execution.service.js';
import { SYSTEM_USER_ID, AI_EXECUTION_CONCURRENCY } from '@icet/shared';

/**
 * Simple concurrency limiter (replaces p-limit for zero new deps)
 */
class Limiter {
  private running = 0;
  private queue: Array<() => void> = [];
  constructor(private concurrency: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export async function runTestExecutor(
  jobId: string,
  taskId: string,
  type: 'EXECUTE_STEP' | 'EXECUTE_ALL_STEPS',
): Promise<void> {
  // Load task with plan and samples
  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      plan: {
        include: {
          steps: { orderBy: { index: 'asc' } },
        },
      },
      sampleSet: {
        include: {
          samples: {
            orderBy: { no: 'asc' },
          },
        },
      },
    },
  });

  if (!task) throw new Error(`测试任务不存在: ${taskId}`);
  if (!task.plan || task.plan.steps.length === 0) {
    throw new Error('测试计划不存在或没有测试步骤');
  }
  if (!task.sampleSet || task.sampleSet.samples.length === 0) {
    throw new Error('样本集为空，请先添加样本');
  }

  const steps = task.plan.steps;
  const samples = task.sampleSet.samples;

  // Build execution task list (cartesian product: sample × step)
  interface TaskItem {
    sample: typeof samples[number];
    step: typeof steps[number];
  }

  const tasks: TaskItem[] = [];

  for (const sample of samples) {
    for (const step of steps) {
      // Check if there's already a non-pending, non-AI execution result
      const existing = await prisma.stepExecution.findUnique({
        where: {
          sampleId_stepId: { sampleId: sample.id, stepId: step.id },
        },
      });

      // Skip if human has already provided a result (non-pending)
      if (existing && existing.executedBy === 'HUMAN' && existing.result !== 'PENDING') {
        continue;
      }

      tasks.push({ sample, step });
    }
  }

  if (tasks.length === 0) {
    await aiJobService.updateProgress(jobId, 100, '所有步骤已执行完成');
    await aiJobService.completeJob(jobId, 'TestTask', taskId);
    return;
  }

  const total = tasks.length;
  let completed = 0;

  await aiJobService.updateProgress(jobId, 0, `准备执行 ${total} 个样本×步骤组合...`);

  const limiter = new Limiter(AI_EXECUTION_CONCURRENCY);

  const results = await Promise.all(
    tasks.map((taskItem) =>
      limiter.run(async () => {
        try {
          // Get parsed content from sample
          const parsedContent = taskItem.sample.parsedContent as import('@icet/shared').SampleParsedContent | null;

          if (!parsedContent) {
            // Sample not yet parsed — try to trigger parse
            return {
              sampleId: taskItem.sample.id,
              stepId: taskItem.step.id,
              success: false,
              error: '样本尚未解析，请先触发样本解析',
            };
          }

          // Build TestStep and Sample objects for the executor
          const step = {
            id: taskItem.step.id,
            planId: taskItem.step.planId,
            index: taskItem.step.index,
            description: taskItem.step.description,
            executionConfig: taskItem.step.executionConfig as unknown as import('@icet/shared').StepExecutionConfig,
          };

          const sampleFiles = await prisma.sampleFileRef.findMany({
            where: { sampleId: taskItem.sample.id },
            include: { fileRef: true },
          });

          const sample = {
            id: taskItem.sample.id,
            sampleSetId: taskItem.sample.sampleSetId,
            no: taskItem.sample.no,
            content: taskItem.sample.content,
            fileRefs: sampleFiles.map((f) => ({
              ...f.fileRef,
              uploadedAt: f.fileRef.uploadedAt.toISOString(),
            })),
            parsedContent,
            stepExecutions: [],
            addedBy: taskItem.sample.addedBy,
            addedAt: taskItem.sample.addedAt.toISOString(),
          } as unknown as import('@icet/shared').Sample;

          // Execute the step
          const execResult = await executeStep(step, sample, parsedContent);

          // Upsert step execution
          const execution = await prisma.stepExecution.upsert({
            where: {
              sampleId_stepId: { sampleId: taskItem.sample.id, stepId: taskItem.step.id },
            },
            create: {
              sampleId: taskItem.sample.id,
              stepId: taskItem.step.id,
              result: execResult.result,
              executedBy: 'AI',
              aiJobId: jobId,
              aiReasoning: execResult.reasoning,
              aiEvidence: execResult.evidence as any, // Prisma Json field
              aiConfidence: execResult.confidence,
            },
            update: {
              // Only update if not human-overridden
              result: execResult.result,
              executedBy: 'AI',
              aiJobId: jobId,
              aiReasoning: execResult.reasoning,
              aiEvidence: execResult.evidence as any,
              aiConfidence: execResult.confidence,
            },
          });

          // Auto-create anomaly for × results
          if (execResult.result === '×') {
            try {
              await createAnomalyFromExecution(
                {
                  id: execution.id,
                  sampleId: execution.sampleId,
                  stepId: execution.stepId,
                  result: execResult.result,
                  aiReasoning: execResult.reasoning,
                },
                taskItem.sample.no,
                taskItem.step.index,
                taskId,
              );
            } catch (err) {
              console.error(`[TestExecutor] 创建异常记录失败:`, err);
            }
          }

          completed++;
          const progress = Math.round((completed / total) * 100);
          await aiJobService.updateProgress(
            jobId,
            progress,
            `执行 样本${taskItem.sample.no} × 步骤${taskItem.step.index}...`,
          );

          return {
            sampleId: taskItem.sample.id,
            stepId: taskItem.step.id,
            success: true,
            result: execResult.result,
          };
        } catch (err) {
          console.error(
            `[TestExecutor] 样本${taskItem.sample.no} × 步骤${taskItem.step.index} 失败:`,
            err,
          );
          completed++;
          return {
            sampleId: taskItem.sample.id,
            stepId: taskItem.step.id,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    ),
  );

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  // Transition task status to EXEC_REVIEW
  const refreshedTask = await prisma.testTask.findUnique({ where: { id: taskId } });
  if (refreshedTask?.status === 'EXECUTING') {
    await prisma.$transaction(async (tx) => {
      await tx.testTask.update({
        where: { id: taskId },
        data: { status: 'EXEC_REVIEW' },
      });
      await tx.taskStatusHistory.create({
        data: {
          taskId,
          status: 'EXEC_REVIEW',
          changedBy: SYSTEM_USER_ID,
          comment: `AI 执行完成: 成功 ${successCount}/${total}，失败 ${failCount}/${total}`,
        },
      });
    });
  }

  await aiJobService.completeJob(jobId, 'TestTask', taskId);
}
