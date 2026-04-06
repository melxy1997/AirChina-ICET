-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TESTER',
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_scenarios" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "process_l1" TEXT NOT NULL,
    "process_l2" TEXT NOT NULL,
    "process_l3" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effective_date" TEXT,
    "expiry_date" TEXT,
    "file_ref_id" TEXT NOT NULL,
    "parse_status" TEXT NOT NULL DEFAULT 'QUEUED',
    "parsed_at" TIMESTAMP(3),
    "raw_parse_result" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_points" (
    "id" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible" TEXT,
    "timing" TEXT,
    "approval_chain" TEXT[],
    "suggested_steps" TEXT[],
    "suggested_evidence_types" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "page_refs" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_regulations" (
    "scenarioId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "scenario_regulations_pkey" PRIMARY KEY ("scenarioId","regulationId")
);

-- CreateTable
CREATE TABLE "file_references" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL DEFAULT 'OTHER',
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "page_count" INTEGER,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_tasks" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "tester_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "completion_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sampling_method" TEXT NOT NULL DEFAULT '随机抽样',
    "sampling_period" TEXT NOT NULL DEFAULT '',
    "sampling_source" TEXT NOT NULL DEFAULT '',
    "test_plan_id" TEXT,
    "sample_set_id" TEXT,
    "working_paper_id" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_task_status_history" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "test_task_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_task_regulations" (
    "taskId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "test_task_regulations_pkey" PRIMARY KEY ("taskId","regulationId")
);

-- CreateTable
CREATE TABLE "test_plans" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "control_description" TEXT NOT NULL,
    "control_ids" TEXT[],
    "generated_by" TEXT NOT NULL DEFAULT 'HUMAN',
    "ai_job_id" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_comment" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "prev_version_id" TEXT,

    CONSTRAINT "test_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_steps" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "execution_config" JSONB NOT NULL,

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_sets" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parsed_content" JSONB,
    "remark" TEXT,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_file_refs" (
    "sampleId" TEXT NOT NULL,
    "fileRefId" TEXT NOT NULL,

    CONSTRAINT "sample_file_refs_pkey" PRIMARY KEY ("sampleId","fileRefId")
);

-- CreateTable
CREATE TABLE "step_executions" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "executedBy" TEXT NOT NULL DEFAULT 'HUMAN',
    "ai_job_id" TEXT,
    "ai_reasoning" TEXT,
    "ai_evidence" JSONB,
    "ai_confidence" DOUBLE PRECISION,
    "human_override" BOOLEAN NOT NULL DEFAULT false,
    "human_override_by" TEXT,
    "human_override_at" TIMESTAMP(3),
    "human_note" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_records" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "step_exec_id" TEXT NOT NULL,
    "finding_no" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "step_no" TEXT NOT NULL,
    "sample_no" TEXT NOT NULL,
    "supporting_doc" TEXT NOT NULL,
    "severity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_papers" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exported_files" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "file_ref_id" TEXT NOT NULL,
    "exported_by" TEXT NOT NULL,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exported_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input_entity_type" TEXT NOT NULL,
    "input_entity_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "agent_type" TEXT NOT NULL,
    "model_used" TEXT,
    "tokens_used" INTEGER,
    "duration_ms" INTEGER,
    "progress" INTEGER,
    "current_step" TEXT,
    "output_entity_type" TEXT,
    "output_entity_id" TEXT,
    "error_message" TEXT,
    "error_stack" TEXT,
    "checkpoint_state" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BusinessScenarioToRegulation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BusinessScenarioToRegulation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "regulations_file_ref_id_key" ON "regulations"("file_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_plans_task_id_key" ON "test_plans"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "sample_sets_task_id_key" ON "sample_sets"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "step_executions_sample_id_step_id_key" ON "step_executions"("sample_id", "step_id");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_records_step_exec_id_key" ON "anomaly_records"("step_exec_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_papers_task_id_key" ON "working_papers"("task_id");

-- CreateIndex
CREATE INDEX "_BusinessScenarioToRegulation_B_index" ON "_BusinessScenarioToRegulation"("B");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_scenarios" ADD CONSTRAINT "business_scenarios_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_file_ref_id_fkey" FOREIGN KEY ("file_ref_id") REFERENCES "file_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_points" ADD CONSTRAINT "control_points_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_regulations" ADD CONSTRAINT "scenario_regulations_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "business_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_regulations" ADD CONSTRAINT "scenario_regulations_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_tasks" ADD CONSTRAINT "test_tasks_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "business_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_task_status_history" ADD CONSTRAINT "test_task_status_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "test_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_task_regulations" ADD CONSTRAINT "test_task_regulations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "test_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_task_regulations" ADD CONSTRAINT "test_task_regulations_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_plans" ADD CONSTRAINT "test_plans_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "test_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_steps" ADD CONSTRAINT "test_steps_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "test_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_sets" ADD CONSTRAINT "sample_sets_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "test_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "sample_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_file_refs" ADD CONSTRAINT "sample_file_refs_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_file_refs" ADD CONSTRAINT "sample_file_refs_fileRefId_fkey" FOREIGN KEY ("fileRefId") REFERENCES "file_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_executions" ADD CONSTRAINT "step_executions_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_executions" ADD CONSTRAINT "step_executions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "test_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_records" ADD CONSTRAINT "anomaly_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "test_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_records" ADD CONSTRAINT "anomaly_records_step_exec_id_fkey" FOREIGN KEY ("step_exec_id") REFERENCES "step_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "test_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exported_files" ADD CONSTRAINT "exported_files_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "working_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exported_files" ADD CONSTRAINT "exported_files_file_ref_id_fkey" FOREIGN KEY ("file_ref_id") REFERENCES "file_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessScenarioToRegulation" ADD CONSTRAINT "_BusinessScenarioToRegulation_A_fkey" FOREIGN KEY ("A") REFERENCES "business_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessScenarioToRegulation" ADD CONSTRAINT "_BusinessScenarioToRegulation_B_fkey" FOREIGN KEY ("B") REFERENCES "regulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
