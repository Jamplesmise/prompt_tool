-- CreateEnum
CREATE TYPE "ParseMode" AS ENUM ('JSON', 'JSON_EXTRACT', 'REGEX', 'TEMPLATE');

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "input_schema_id" TEXT,
ADD COLUMN     "output_schema_id" TEXT;

-- AlterTable
ALTER TABLE "task_results" ADD COLUMN     "expected_values" JSONB,
ADD COLUMN     "output_parsed" JSONB,
ADD COLUMN     "output_raw" TEXT,
ADD COLUMN     "parse_error" TEXT,
ADD COLUMN     "parse_success" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "input_schemas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" TEXT NOT NULL,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "input_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "output_schemas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "parseMode" "ParseMode" NOT NULL DEFAULT 'JSON',
    "parseConfig" JSONB NOT NULL DEFAULT '{}',
    "aggregation" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" TEXT NOT NULL,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "output_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_evaluation_results" (
    "id" TEXT NOT NULL,
    "task_result_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_value" JSONB,
    "expected_value" JSONB,
    "evaluator_id" TEXT,
    "evaluator_name" TEXT,
    "passed" BOOLEAN NOT NULL,
    "score" DECIMAL(5,4),
    "reason" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_evaluation_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "input_schemas_created_by_id_idx" ON "input_schemas"("created_by_id");

-- CreateIndex
CREATE INDEX "input_schemas_team_id_idx" ON "input_schemas"("team_id");

-- CreateIndex
CREATE INDEX "input_schemas_name_idx" ON "input_schemas"("name");

-- CreateIndex
CREATE INDEX "output_schemas_created_by_id_idx" ON "output_schemas"("created_by_id");

-- CreateIndex
CREATE INDEX "output_schemas_team_id_idx" ON "output_schemas"("team_id");

-- CreateIndex
CREATE INDEX "output_schemas_name_idx" ON "output_schemas"("name");

-- CreateIndex
CREATE INDEX "field_evaluation_results_task_result_id_idx" ON "field_evaluation_results"("task_result_id");

-- CreateIndex
CREATE INDEX "field_evaluation_results_field_key_idx" ON "field_evaluation_results"("field_key");

-- CreateIndex
CREATE INDEX "prompts_input_schema_id_idx" ON "prompts"("input_schema_id");

-- CreateIndex
CREATE INDEX "prompts_output_schema_id_idx" ON "prompts"("output_schema_id");

-- AddForeignKey
ALTER TABLE "input_schemas" ADD CONSTRAINT "input_schemas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_schemas" ADD CONSTRAINT "input_schemas_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "output_schemas" ADD CONSTRAINT "output_schemas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "output_schemas" ADD CONSTRAINT "output_schemas_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_input_schema_id_fkey" FOREIGN KEY ("input_schema_id") REFERENCES "input_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_output_schema_id_fkey" FOREIGN KEY ("output_schema_id") REFERENCES "output_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_evaluation_results" ADD CONSTRAINT "field_evaluation_results_task_result_id_fkey" FOREIGN KEY ("task_result_id") REFERENCES "task_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
