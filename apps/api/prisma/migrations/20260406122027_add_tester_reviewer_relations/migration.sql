-- AddForeignKey
ALTER TABLE "test_tasks" ADD CONSTRAINT "test_tasks_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_tasks" ADD CONSTRAINT "test_tasks_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
