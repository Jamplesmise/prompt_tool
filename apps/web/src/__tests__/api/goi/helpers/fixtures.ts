/**
 * GOI API 测试 - 测试数据
 */

// 测试目标集合
export const testGoals = {
  simple: '查看任务列表',
  medium: '创建一个测试任务',
  complex: '创建评估任务，使用情感分析提示词和测试数据集，并运行批量测试',
  withSpecialChars: '创建任务 <script>alert("xss")</script>',
  veryLong: '这是一个非常长的目标描述'.repeat(100),
  empty: '',
  unicode: '创建一个测试任务 🚀 包含 emoji 和中文',
}

// 测试模型配置
export const testModels = {
  default: 'gpt-4',
  fallback: 'gpt-3.5-turbo',
  invalid: 'invalid-model-id',
  empty: '',
}

// 预置会话 ID
export const testSessions = {
  active: 'test-session-active',
  completed: 'test-session-completed',
  paused: 'test-session-paused',
  failed: 'test-session-failed',
  nonExistent: 'test-session-non-existent',
}

// 检查点测试数据
export const testCheckpoints = {
  resourceSelection: {
    type: 'resource_selection' as const,
    reason: '请选择要使用的提示词',
    options: [
      { id: 'prompt-1', label: '情感分析提示词', description: '用于分析文本情感' },
      { id: 'prompt-2', label: '文本摘要提示词', description: '用于生成摘要' },
    ],
  },
  parameterConfirmation: {
    type: 'parameter_confirmation' as const,
    reason: '请确认任务参数',
    parameters: {
      modelId: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
  operationConfirmation: {
    type: 'operation_confirmation' as const,
    reason: '即将执行批量测试，预计消耗 100 tokens',
    operation: 'run_batch_test',
  },
}

// 协作模式
export const testCollaborationModes = {
  manual: 'manual' as const,
  assisted: 'assisted' as const,
  auto: 'auto' as const,
  invalid: 'invalid-mode',
}

// 控制器类型
export const testControllers = {
  user: 'user' as const,
  ai: 'ai' as const,
  invalid: 'invalid-controller',
}

// TODO 测试数据
export const testTodoItems = {
  simple: [
    { id: '1', content: '选择提示词', status: 'pending' as const },
    { id: '2', content: '配置模型参数', status: 'pending' as const },
    { id: '3', content: '运行测试', status: 'pending' as const },
  ],
  withProgress: [
    { id: '1', content: '选择提示词', status: 'completed' as const },
    { id: '2', content: '配置模型参数', status: 'in_progress' as const },
    { id: '3', content: '运行测试', status: 'pending' as const },
  ],
}

// 快照测试数据
export const testSnapshots = {
  valid: {
    sessionId: 'test-session-active',
    timestamp: Date.now(),
    state: {
      todoList: testTodoItems.simple,
      currentStep: 0,
      mode: 'assisted',
      controller: 'ai',
    },
  },
}

// 失败场景测试数据
export const testFailures = {
  networkError: {
    type: 'network_error' as const,
    message: 'Connection timeout',
    retryable: true,
  },
  apiError: {
    type: 'api_error' as const,
    message: 'Rate limit exceeded',
    retryable: true,
  },
  validationError: {
    type: 'validation_error' as const,
    message: 'Invalid parameter',
    retryable: false,
  },
}

// 恢复策略
export const testRecoveryStrategies = {
  retry: 'retry' as const,
  rollback: 'rollback' as const,
  skip: 'skip' as const,
  abort: 'abort' as const,
  invalid: 'invalid-strategy',
}
