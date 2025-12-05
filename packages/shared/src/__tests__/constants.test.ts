import { describe, it, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../constants/errorCodes'
import {
  UserRoleEnum,
  ProviderTypeEnum,
  EvaluatorTypeEnum,
  PresetEvaluatorTypeEnum,
  TaskTypeEnum,
  TaskStatusEnum,
  ResultStatusEnum,
  PAGINATION_DEFAULTS,
  TASK_DEFAULTS,
  ScheduledExecutionStatusEnum,
  AlertMetricEnum,
  AlertConditionEnum,
  AlertSeverityEnum,
  AlertStatusEnum,
  NotifyChannelTypeEnum,
  TimeRangeEnum,
  ALERT_DEFAULTS,
  SCHEDULED_TASK_DEFAULTS,
  TeamRoleEnum,
  ApiTokenScopeEnum,
  AuditActionEnum,
  AuditResourceEnum,
  PermissionActionEnum,
  PermissionResourceEnum,
} from '../constants/enums'

describe('错误码常量', () => {
  describe('ERROR_CODES', () => {
    it('应该包含通用错误码 400xxx', () => {
      expect(ERROR_CODES.BAD_REQUEST).toBe(400000)
      expect(ERROR_CODES.VALIDATION_ERROR).toBe(400001)
      expect(ERROR_CODES.INVALID_PARAMS).toBe(400002)
    })

    it('应该包含认证错误码 401xxx', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe(401000)
      expect(ERROR_CODES.INVALID_TOKEN).toBe(401001)
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe(401002)
    })

    it('应该包含权限错误码 403xxx', () => {
      expect(ERROR_CODES.FORBIDDEN).toBe(403000)
      expect(ERROR_CODES.NO_PERMISSION).toBe(403001)
    })

    it('应该包含资源错误码 404xxx', () => {
      expect(ERROR_CODES.NOT_FOUND).toBe(404000)
      expect(ERROR_CODES.USER_NOT_FOUND).toBe(404001)
      expect(ERROR_CODES.PROMPT_NOT_FOUND).toBe(404002)
      expect(ERROR_CODES.DATASET_NOT_FOUND).toBe(404003)
      expect(ERROR_CODES.MODEL_NOT_FOUND).toBe(404004)
      expect(ERROR_CODES.EVALUATOR_NOT_FOUND).toBe(404005)
      expect(ERROR_CODES.TASK_NOT_FOUND).toBe(404006)
    })

    it('应该包含冲突错误码 409xxx', () => {
      expect(ERROR_CODES.CONFLICT).toBe(409000)
      expect(ERROR_CODES.EMAIL_EXISTS).toBe(409001)
      expect(ERROR_CODES.NAME_EXISTS).toBe(409002)
    })

    it('应该包含服务器错误码 500xxx', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe(500000)
      expect(ERROR_CODES.DATABASE_ERROR).toBe(500001)
      expect(ERROR_CODES.REDIS_ERROR).toBe(500002)
    })

    it('应该包含任务执行错误码 501xxx', () => {
      expect(ERROR_CODES.TASK_EXECUTION_ERROR).toBe(501000)
      expect(ERROR_CODES.TASK_TIMEOUT).toBe(501001)
      expect(ERROR_CODES.EVALUATOR_ERROR).toBe(501002)
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('每个错误码都应该有对应的错误消息', () => {
      const errorCodes = Object.values(ERROR_CODES)
      errorCodes.forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
      })
    })

    it('错误消息应该是有意义的中文描述', () => {
      expect(ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED]).toBe('未授权')
      expect(ERROR_MESSAGES[ERROR_CODES.NOT_FOUND]).toBe('资源不存在')
      expect(ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR]).toBe('服务器内部错误')
    })
  })
})

describe('枚举常量', () => {
  describe('UserRoleEnum', () => {
    it('应该包含正确的用户角色', () => {
      expect(UserRoleEnum.ADMIN).toBe('ADMIN')
      expect(UserRoleEnum.USER).toBe('USER')
    })
  })

  describe('ProviderTypeEnum', () => {
    it('应该包含所有支持的模型供应商', () => {
      expect(ProviderTypeEnum.OPENAI).toBe('OPENAI')
      expect(ProviderTypeEnum.ANTHROPIC).toBe('ANTHROPIC')
      expect(ProviderTypeEnum.AZURE).toBe('AZURE')
      expect(ProviderTypeEnum.CUSTOM).toBe('CUSTOM')
    })
  })

  describe('EvaluatorTypeEnum', () => {
    it('应该包含所有评估器类型', () => {
      expect(EvaluatorTypeEnum.PRESET).toBe('PRESET')
      expect(EvaluatorTypeEnum.CODE).toBe('CODE')
      expect(EvaluatorTypeEnum.LLM).toBe('LLM')
      expect(EvaluatorTypeEnum.COMPOSITE).toBe('COMPOSITE')
    })
  })

  describe('PresetEvaluatorTypeEnum', () => {
    it('应该包含所有预置评估器类型', () => {
      expect(PresetEvaluatorTypeEnum.EXACT_MATCH).toBe('exact_match')
      expect(PresetEvaluatorTypeEnum.CONTAINS).toBe('contains')
      expect(PresetEvaluatorTypeEnum.REGEX).toBe('regex')
      expect(PresetEvaluatorTypeEnum.JSON_SCHEMA).toBe('json_schema')
      expect(PresetEvaluatorTypeEnum.SIMILARITY).toBe('similarity')
    })
  })

  describe('TaskTypeEnum', () => {
    it('应该包含所有任务类型', () => {
      expect(TaskTypeEnum.PROMPT).toBe('PROMPT')
      expect(TaskTypeEnum.AGENT).toBe('AGENT')
      expect(TaskTypeEnum.API).toBe('API')
      expect(TaskTypeEnum.AB_TEST).toBe('AB_TEST')
    })
  })

  describe('TaskStatusEnum', () => {
    it('应该包含所有任务状态', () => {
      expect(TaskStatusEnum.PENDING).toBe('PENDING')
      expect(TaskStatusEnum.RUNNING).toBe('RUNNING')
      expect(TaskStatusEnum.COMPLETED).toBe('COMPLETED')
      expect(TaskStatusEnum.FAILED).toBe('FAILED')
      expect(TaskStatusEnum.STOPPED).toBe('STOPPED')
    })
  })

  describe('ResultStatusEnum', () => {
    it('应该包含所有结果状态', () => {
      expect(ResultStatusEnum.PENDING).toBe('PENDING')
      expect(ResultStatusEnum.SUCCESS).toBe('SUCCESS')
      expect(ResultStatusEnum.FAILED).toBe('FAILED')
      expect(ResultStatusEnum.TIMEOUT).toBe('TIMEOUT')
      expect(ResultStatusEnum.ERROR).toBe('ERROR')
    })
  })

  describe('TeamRoleEnum', () => {
    it('应该包含所有团队角色', () => {
      expect(TeamRoleEnum.OWNER).toBe('OWNER')
      expect(TeamRoleEnum.ADMIN).toBe('ADMIN')
      expect(TeamRoleEnum.MEMBER).toBe('MEMBER')
      expect(TeamRoleEnum.VIEWER).toBe('VIEWER')
    })
  })

  describe('ApiTokenScopeEnum', () => {
    it('应该包含所有 API Token 权限范围', () => {
      expect(ApiTokenScopeEnum.READ).toBe('read')
      expect(ApiTokenScopeEnum.WRITE).toBe('write')
      expect(ApiTokenScopeEnum.EXECUTE).toBe('execute')
      expect(ApiTokenScopeEnum.ADMIN).toBe('admin')
    })
  })

  describe('AlertMetricEnum', () => {
    it('应该包含所有告警指标', () => {
      expect(AlertMetricEnum.PASS_RATE).toBe('PASS_RATE')
      expect(AlertMetricEnum.AVG_LATENCY).toBe('AVG_LATENCY')
      expect(AlertMetricEnum.ERROR_RATE).toBe('ERROR_RATE')
      expect(AlertMetricEnum.COST).toBe('COST')
    })
  })

  describe('AlertConditionEnum', () => {
    it('应该包含所有告警条件', () => {
      expect(AlertConditionEnum.LT).toBe('LT')
      expect(AlertConditionEnum.GT).toBe('GT')
      expect(AlertConditionEnum.EQ).toBe('EQ')
      expect(AlertConditionEnum.LTE).toBe('LTE')
      expect(AlertConditionEnum.GTE).toBe('GTE')
    })
  })

  describe('AuditActionEnum', () => {
    it('应该包含所有审计操作类型', () => {
      expect(AuditActionEnum.LOGIN).toBe('login')
      expect(AuditActionEnum.CREATE).toBe('create')
      expect(AuditActionEnum.UPDATE).toBe('update')
      expect(AuditActionEnum.DELETE).toBe('delete')
      expect(AuditActionEnum.EXECUTE).toBe('execute')
    })
  })
})

describe('默认配置常量', () => {
  describe('PAGINATION_DEFAULTS', () => {
    it('应该有正确的分页默认值', () => {
      expect(PAGINATION_DEFAULTS.PAGE).toBe(1)
      expect(PAGINATION_DEFAULTS.PAGE_SIZE).toBe(20)
      expect(PAGINATION_DEFAULTS.MAX_PAGE_SIZE).toBe(100)
    })
  })

  describe('TASK_DEFAULTS', () => {
    it('应该有正确的任务默认配置', () => {
      expect(TASK_DEFAULTS.CONCURRENCY).toBe(5)
      expect(TASK_DEFAULTS.TIMEOUT).toBe(180000)
      expect(TASK_DEFAULTS.RETRY_COUNT).toBe(3)
      expect(TASK_DEFAULTS.RETRY_DELAY).toBe(1000)
    })
  })

  describe('ALERT_DEFAULTS', () => {
    it('应该有正确的告警默认配置', () => {
      expect(ALERT_DEFAULTS.SILENCE_PERIOD).toBe(30)
      expect(ALERT_DEFAULTS.DURATION).toBe(5)
      expect(ALERT_DEFAULTS.CHECK_INTERVAL).toBe(60)
    })
  })

  describe('SCHEDULED_TASK_DEFAULTS', () => {
    it('应该有正确的定时任务默认配置', () => {
      expect(SCHEDULED_TASK_DEFAULTS.TIMEZONE).toBe('Asia/Shanghai')
    })
  })
})
