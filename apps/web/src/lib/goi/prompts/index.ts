/**
 * GOI Prompts 模块导出
 *
 * 包含 Agent Loop 使用的 Prompt 模板
 */

// Plan Prompt
export {
  PLAN_SYSTEM_PROMPT,
  buildPlanMessages,
  parsePlanResponse,
  validatePlan,
  type PlanContext,
  type PlanItem,
  type PlanOutput,
} from './planPrompt'

// Verify Prompt
export {
  VERIFY_SYSTEM_PROMPT,
  buildVerifyMessages,
  buildVerifyUserPrompt,
  parseVerifyResponse,
  ruleBasedVerify,
  canUseRuleVerification,
  type VerifyResult,
  type VerifyContext,
} from './verifyPrompt'
