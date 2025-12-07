// 组合评估器执行器

import type { EvaluatorInput, EvaluatorOutput, CompositeEvaluatorConfig } from '../types'
import { aggregate, type AggregationType } from './aggregator'

export type EvaluatorExecutor = (
  evaluatorId: string,
  input: EvaluatorInput
) => Promise<EvaluatorOutput>

export type CompositeExecutorOptions = {
  config: CompositeEvaluatorConfig
  input: EvaluatorInput
  executor: EvaluatorExecutor
  visitedIds?: Set<string>
}

/**
 * 检测循环依赖
 */
export function detectCycle(
  evaluatorId: string,
  config: CompositeEvaluatorConfig,
  getConfig: (id: string) => CompositeEvaluatorConfig | null,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(evaluatorId)) {
    return true
  }

  visited.add(evaluatorId)

  for (const childId of config.evaluatorIds) {
    const childConfig = getConfig(childId)
    if (childConfig) {
      if (detectCycle(childId, childConfig, getConfig, visited)) {
        return true
      }
    }
  }

  visited.delete(evaluatorId)
  return false
}

/**
 * 执行组合评估器
 */
export async function runCompositeEvaluator(
  options: CompositeExecutorOptions
): Promise<EvaluatorOutput> {
  const { config, input, executor, visitedIds = new Set() } = options
  const { evaluatorIds, mode, aggregation, weights } = config

  if (evaluatorIds.length === 0) {
    return {
      passed: true,
      score: 1,
      reason: '无子评估器',
    }
  }

  try {
    let results: EvaluatorOutput[]

    if (mode === 'serial') {
      // 串行执行
      results = []
      for (let i = 0; i < evaluatorIds.length; i++) {
        const id = evaluatorIds[i]

        // 检测循环依赖
        if (visitedIds.has(id)) {
          return {
            passed: false,
            score: 0,
            reason: `检测到循环依赖: ${id}`,
          }
        }

        const result = await executor(id, input)
        results.push(result)

        // AND 模式下，如果失败则短路
        if (aggregation === 'and' && !result.passed) {
          // 填充剩余结果为 skipped
          for (let j = i + 1; j < evaluatorIds.length; j++) {
            results.push({
              passed: false,
              score: 0,
              reason: '因前序评估器失败而跳过',
              details: { skipped: true },
            })
          }
          break
        }

        // OR 模式下，如果通过则可以提前结束（可选优化）
        // 但为了获取完整结果，这里继续执行
      }
    } else {
      // 并行执行
      // 检测循环依赖
      for (const id of evaluatorIds) {
        if (visitedIds.has(id)) {
          return {
            passed: false,
            score: 0,
            reason: `检测到循环依赖: ${id}`,
          }
        }
      }

      results = await Promise.all(
        evaluatorIds.map((id) => executor(id, input))
      )
    }

    // 聚合结果
    return aggregate(results, aggregation as AggregationType, weights)
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: `组合评估器执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      details: {
        error: error instanceof Error ? error.message : '未知错误',
      },
    }
  }
}
