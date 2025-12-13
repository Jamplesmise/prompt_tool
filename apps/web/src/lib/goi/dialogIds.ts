/**
 * GOI 弹窗 ID 常量
 *
 * 命名规则：{action}-{resource}-{type}
 * - action: add, edit, create, view, select, test
 * - resource: provider, model, prompt, dataset, etc.
 * - type: modal, dialog, drawer
 *
 * 使用方式：
 * 1. accessHandler.ts 中的 createDialogMap 使用这些常量
 * 2. 页面组件通过 useGoiDialogListener 监听这些 ID
 */

export const GOI_DIALOG_IDS = {
  // ============================================
  // 模型配置
  // ============================================
  ADD_PROVIDER: 'add-provider-modal',
  EDIT_PROVIDER: 'edit-provider-modal',
  ADD_MODEL: 'add-model-modal',
  EDIT_MODEL: 'edit-model-modal',
  TEST_MODEL: 'test-model-modal',
  TEST_NOTIFY_CHANNEL: 'test-notify-channel-modal',

  // ============================================
  // 提示词
  // ============================================
  CREATE_PROMPT: 'create-prompt-dialog',
  PUBLISH_VERSION: 'publish-version-modal',
  CREATE_BRANCH: 'create-branch-modal',
  MERGE_BRANCH: 'merge-branch-modal',
  BRANCH_DIFF: 'branch-diff-modal',

  // ============================================
  // 数据集
  // ============================================
  CREATE_DATASET: 'create-dataset-modal',
  UPLOAD_DATASET: 'upload-dataset-modal',
  CREATE_DATASET_VERSION: 'create-dataset-version-modal',
  VERSION_ROWS: 'version-rows-modal',
  VERSION_DIFF: 'version-diff-modal',
  TEMPLATE_DOWNLOAD: 'template-download-modal',

  // ============================================
  // 评估器
  // ============================================
  CREATE_EVALUATOR: 'create-evaluator-dialog',
  EVALUATOR_DETAIL: 'evaluator-detail-modal',

  // ============================================
  // 任务
  // ============================================
  CREATE_TASK: 'create-task-dialog',
  CREATE_AB_TASK: 'create-ab-task-dialog',

  // ============================================
  // 定时任务
  // ============================================
  CREATE_SCHEDULED: 'create-scheduled-modal',
  EDIT_SCHEDULED: 'edit-scheduled-modal',

  // ============================================
  // 监控告警
  // ============================================
  CREATE_ALERT_RULE: 'create-alert-rule-modal',
  EDIT_ALERT_RULE: 'edit-alert-rule-modal',
  CREATE_NOTIFY_CHANNEL: 'create-notify-channel-modal',
  EDIT_NOTIFY_CHANNEL: 'edit-notify-channel-modal',

  // ============================================
  // Schema
  // ============================================
  CREATE_INPUT_SCHEMA: 'create-input-schema-dialog',
  CREATE_OUTPUT_SCHEMA: 'create-output-schema-dialog',
  INFER_SCHEMA: 'infer-schema-modal',
  SAVE_TEMPLATE: 'save-template-modal',

  // ============================================
  // 选择器
  // ============================================
  SELECT_PROMPT: 'prompt-selector-dialog',
  SELECT_DATASET: 'dataset-selector-dialog',
  SELECT_MODEL: 'model-selector-dialog',
  SELECT_EVALUATOR: 'evaluator-selector-dialog',
  SELECT_SCHEMA: 'schema-selector-dialog',
} as const

/**
 * 弹窗 ID 类型
 */
export type GoiDialogId = (typeof GOI_DIALOG_IDS)[keyof typeof GOI_DIALOG_IDS]

/**
 * 根据资源类型获取创建弹窗 ID
 */
export function getCreateDialogId(resourceType: string): GoiDialogId | string {
  const mapping: Record<string, GoiDialogId> = {
    // 模型
    provider: GOI_DIALOG_IDS.ADD_PROVIDER,
    model: GOI_DIALOG_IDS.ADD_MODEL,
    // 提示词
    prompt: GOI_DIALOG_IDS.CREATE_PROMPT,
    prompt_version: GOI_DIALOG_IDS.PUBLISH_VERSION,
    prompt_branch: GOI_DIALOG_IDS.CREATE_BRANCH,
    // 数据集
    dataset: GOI_DIALOG_IDS.CREATE_DATASET,
    dataset_version: GOI_DIALOG_IDS.CREATE_DATASET_VERSION,
    // 评估器
    evaluator: GOI_DIALOG_IDS.CREATE_EVALUATOR,
    // 任务
    task: GOI_DIALOG_IDS.CREATE_TASK,
    // 定时任务
    scheduled_task: GOI_DIALOG_IDS.CREATE_SCHEDULED,
    // 监控
    alert_rule: GOI_DIALOG_IDS.CREATE_ALERT_RULE,
    notify_channel: GOI_DIALOG_IDS.CREATE_NOTIFY_CHANNEL,
    // Schema
    input_schema: GOI_DIALOG_IDS.CREATE_INPUT_SCHEMA,
    output_schema: GOI_DIALOG_IDS.CREATE_OUTPUT_SCHEMA,
  }
  return mapping[resourceType] || `create-${resourceType}-dialog`
}

/**
 * 根据资源类型获取编辑弹窗 ID
 */
export function getEditDialogId(resourceType: string): GoiDialogId | string {
  const mapping: Record<string, GoiDialogId> = {
    provider: GOI_DIALOG_IDS.EDIT_PROVIDER,
    model: GOI_DIALOG_IDS.EDIT_MODEL,
    scheduled_task: GOI_DIALOG_IDS.EDIT_SCHEDULED,
    alert_rule: GOI_DIALOG_IDS.EDIT_ALERT_RULE,
    notify_channel: GOI_DIALOG_IDS.EDIT_NOTIFY_CHANNEL,
  }
  return mapping[resourceType] || `edit-${resourceType}-dialog`
}

/**
 * 根据资源类型获取选择器弹窗 ID
 */
export function getSelectorDialogId(resourceType: string): GoiDialogId | string {
  const mapping: Record<string, GoiDialogId> = {
    prompt: GOI_DIALOG_IDS.SELECT_PROMPT,
    dataset: GOI_DIALOG_IDS.SELECT_DATASET,
    model: GOI_DIALOG_IDS.SELECT_MODEL,
    evaluator: GOI_DIALOG_IDS.SELECT_EVALUATOR,
    schema: GOI_DIALOG_IDS.SELECT_SCHEMA,
    input_schema: GOI_DIALOG_IDS.SELECT_SCHEMA,
    output_schema: GOI_DIALOG_IDS.SELECT_SCHEMA,
  }
  return mapping[resourceType] || `${resourceType}-selector-dialog`
}

/**
 * 根据资源类型获取测试弹窗 ID
 * 注意：只有 model 和 notify_channel 支持测试
 */
export function getTestDialogId(resourceType: string): GoiDialogId | string | null {
  const mapping: Record<string, GoiDialogId> = {
    model: GOI_DIALOG_IDS.TEST_MODEL,
    notify_channel: GOI_DIALOG_IDS.TEST_NOTIFY_CHANNEL,
  }
  return mapping[resourceType] || null
}

/**
 * 检查资源类型是否支持测试操作
 */
export function supportsTestAction(resourceType: string): boolean {
  return ['model', 'notify_channel'].includes(resourceType)
}
