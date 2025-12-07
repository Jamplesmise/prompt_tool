'use client'

import { useState, useMemo } from 'react'
import { Card, Tag, Typography, Space, Switch, Tooltip, Segmented } from 'antd'
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  ColumnWidthOutlined,
  SplitCellsOutlined,
} from '@ant-design/icons'
import type { DiffResult, DiffSegment, DiffType } from '@/lib/comparison'
import { generateDiff, getDiffSummary } from '@/lib/comparison'

const { Text } = Typography

type PromptDiffViewProps = {
  oldText: string
  newText: string
  oldLabel?: string
  newLabel?: string
  showLineNumbers?: boolean
  foldUnchanged?: boolean
  initialViewMode?: 'split' | 'unified'
}

/**
 * 获取 diff 类型的样式
 */
function getDiffStyle(type: DiffType): React.CSSProperties {
  switch (type) {
    case 'add':
      return {
        backgroundColor: '#f6ffed',
        borderLeft: '3px solid #52c41a',
      }
    case 'remove':
      return {
        backgroundColor: '#fff2f0',
        borderLeft: '3px solid #ff4d4f',
        textDecoration: 'line-through',
        opacity: 0.8,
      }
    case 'unchanged':
    default:
      return {
        backgroundColor: 'transparent',
        borderLeft: '3px solid transparent',
      }
  }
}

/**
 * 获取 diff 类型的前缀符号
 */
function getDiffPrefix(type: DiffType): React.ReactNode {
  switch (type) {
    case 'add':
      return <PlusOutlined style={{ color: '#52c41a', marginRight: 4 }} />
    case 'remove':
      return <MinusOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
    case 'unchanged':
    default:
      return <span style={{ width: 18, display: 'inline-block' }} />
  }
}

/**
 * 统一视图模式下的 diff 行
 */
type UnifiedDiffLineProps = {
  segment: DiffSegment
  showLineNumbers: boolean
}

function UnifiedDiffLine({ segment, showLineNumbers }: UnifiedDiffLineProps) {
  const style = getDiffStyle(segment.type)

  return (
    <div
      style={{
        ...style,
        padding: '2px 8px',
        fontFamily: 'monospace',
        fontSize: 13,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        minHeight: 22,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      {showLineNumbers && (
        <span
          style={{
            width: 40,
            flexShrink: 0,
            color: '#8c8c8c',
            fontSize: 12,
            userSelect: 'none',
          }}
        >
          {segment.type === 'remove' ? segment.oldLineNumber : segment.newLineNumber}
        </span>
      )}
      {getDiffPrefix(segment.type)}
      <span style={{ flex: 1 }}>{segment.content || ' '}</span>
    </div>
  )
}

/**
 * 统一视图模式
 */
type UnifiedViewProps = {
  diff: DiffResult
  showLineNumbers: boolean
  foldUnchanged: boolean
}

function UnifiedView({ diff, showLineNumbers, foldUnchanged }: UnifiedViewProps) {
  const [expandedRanges, setExpandedRanges] = useState<Set<number>>(new Set())

  // 处理折叠逻辑
  const processedSegments = useMemo(() => {
    if (!foldUnchanged) {
      return diff.segments.map((segment, index) => ({ segment, index, folded: false }))
    }

    const result: Array<{
      segment?: DiffSegment
      index: number
      folded: boolean
      foldStart?: number
      foldEnd?: number
      foldCount?: number
    }> = []

    let unchangedStart: number | null = null
    let unchangedCount = 0

    diff.segments.forEach((segment, index) => {
      if (segment.type === 'unchanged') {
        if (unchangedStart === null) {
          unchangedStart = index
        }
        unchangedCount++
      } else {
        // 结束未变更区域
        if (unchangedStart !== null && unchangedCount > 5) {
          // 折叠中间部分，保留前后各2行
          if (!expandedRanges.has(unchangedStart)) {
            // 添加前2行
            for (let i = unchangedStart; i < unchangedStart + 2 && i < index; i++) {
              result.push({ segment: diff.segments[i], index: i, folded: false })
            }
            // 添加折叠标记
            result.push({
              index: unchangedStart,
              folded: true,
              foldStart: unchangedStart + 2,
              foldEnd: index - 2,
              foldCount: unchangedCount - 4,
            })
            // 添加后2行
            for (let i = index - 2; i < index; i++) {
              if (i >= unchangedStart + 2) {
                result.push({ segment: diff.segments[i], index: i, folded: false })
              }
            }
          } else {
            // 已展开
            for (let i = unchangedStart; i < index; i++) {
              result.push({ segment: diff.segments[i], index: i, folded: false })
            }
          }
        } else if (unchangedStart !== null) {
          // 不需要折叠
          for (let i = unchangedStart; i < index; i++) {
            result.push({ segment: diff.segments[i], index: i, folded: false })
          }
        }
        unchangedStart = null
        unchangedCount = 0
        result.push({ segment, index, folded: false })
      }
    })

    // 处理末尾的未变更区域
    if (unchangedStart !== null) {
      const endIndex = diff.segments.length
      if (unchangedCount > 5 && !expandedRanges.has(unchangedStart)) {
        for (let i = unchangedStart; i < unchangedStart + 2 && i < endIndex; i++) {
          result.push({ segment: diff.segments[i], index: i, folded: false })
        }
        result.push({
          index: unchangedStart,
          folded: true,
          foldStart: unchangedStart + 2,
          foldEnd: endIndex,
          foldCount: unchangedCount - 2,
        })
      } else {
        for (let i = unchangedStart; i < endIndex; i++) {
          result.push({ segment: diff.segments[i], index: i, folded: false })
        }
      }
    }

    return result
  }, [diff.segments, foldUnchanged, expandedRanges])

  const toggleExpand = (index: number) => {
    setExpandedRanges(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      {processedSegments.map((item, idx) => {
        if (item.folded) {
          return (
            <div
              key={`fold-${item.index}`}
              style={{
                padding: '4px 8px',
                backgroundColor: '#fafafa',
                textAlign: 'center',
                cursor: 'pointer',
                color: '#EF4444',
                fontSize: 12,
              }}
              onClick={() => toggleExpand(item.index)}
            >
              <SwapOutlined /> 展开 {'foldCount' in item ? item.foldCount : 0} 行未变更内容
            </div>
          )
        }

        if (!item.segment) return null

        return (
          <UnifiedDiffLine
            key={idx}
            segment={item.segment}
            showLineNumbers={showLineNumbers}
          />
        )
      })}
    </div>
  )
}

/**
 * 分栏视图模式
 */
type SplitViewProps = {
  diff: DiffResult
  showLineNumbers: boolean
  oldLabel: string
  newLabel: string
}

function SplitView({ diff, showLineNumbers, oldLabel, newLabel }: SplitViewProps) {
  // 构建左右两栏的内容
  const { leftLines, rightLines } = useMemo(() => {
    const left: Array<{ content: string; type: DiffType; lineNumber?: number }> = []
    const right: Array<{ content: string; type: DiffType; lineNumber?: number }> = []

    for (const segment of diff.segments) {
      if (segment.type === 'unchanged') {
        left.push({ content: segment.content, type: 'unchanged', lineNumber: segment.oldLineNumber })
        right.push({ content: segment.content, type: 'unchanged', lineNumber: segment.newLineNumber })
      } else if (segment.type === 'remove') {
        left.push({ content: segment.content, type: 'remove', lineNumber: segment.oldLineNumber })
        right.push({ content: '', type: 'unchanged' }) // 空行占位
      } else if (segment.type === 'add') {
        left.push({ content: '', type: 'unchanged' }) // 空行占位
        right.push({ content: segment.content, type: 'add', lineNumber: segment.newLineNumber })
      }
    }

    return { leftLines: left, rightLines: right }
  }, [diff.segments])

  const renderLine = (
    line: { content: string; type: DiffType; lineNumber?: number },
    index: number
  ) => {
    const style = getDiffStyle(line.type)

    return (
      <div
        key={index}
        style={{
          ...style,
          padding: '2px 8px',
          fontFamily: 'monospace',
          fontSize: 13,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          minHeight: 22,
          display: 'flex',
          alignItems: 'flex-start',
        }}
      >
        {showLineNumbers && (
          <span
            style={{
              width: 32,
              flexShrink: 0,
              color: '#8c8c8c',
              fontSize: 12,
              userSelect: 'none',
            }}
          >
            {line.lineNumber || ''}
          </span>
        )}
        <span style={{ flex: 1 }}>{line.content || ' '}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      {/* 左栏 - 旧版本 */}
      <div style={{ flex: 1, borderRight: '1px solid #d9d9d9' }}>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #d9d9d9',
            fontWeight: 500,
          }}
        >
          {oldLabel}
        </div>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {leftLines.map((line, index) => renderLine(line, index))}
        </div>
      </div>

      {/* 右栏 - 新版本 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fafafa',
            borderBottom: '1px solid #d9d9d9',
            fontWeight: 500,
          }}
        >
          {newLabel}
        </div>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {rightLines.map((line, index) => renderLine(line, index))}
        </div>
      </div>
    </div>
  )
}

/**
 * 提示词 diff 视图组件
 */
export function PromptDiffView({
  oldText,
  newText,
  oldLabel = '旧版本',
  newLabel = '新版本',
  showLineNumbers = true,
  foldUnchanged = true,
  initialViewMode = 'unified',
}: PromptDiffViewProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>(initialViewMode)
  const [showLines, setShowLines] = useState(showLineNumbers)
  const [fold, setFold] = useState(foldUnchanged)

  const diff = useMemo(() => generateDiff(oldText, newText), [oldText, newText])
  const summary = useMemo(() => getDiffSummary(diff), [diff])

  return (
    <Card
      title="提示词变更"
      size="small"
      extra={
        <Space>
          {/* 统计信息 */}
          <Space size={8}>
            {diff.stats.additions > 0 && (
              <Tag color="green">
                <PlusOutlined /> {diff.stats.additions}
              </Tag>
            )}
            {diff.stats.deletions > 0 && (
              <Tag color="red">
                <MinusOutlined /> {diff.stats.deletions}
              </Tag>
            )}
          </Space>

          {/* 视图模式切换 */}
          <Segmented
            size="small"
            value={viewMode}
            onChange={value => setViewMode(value as 'split' | 'unified')}
            options={[
              {
                label: (
                  <Tooltip title="统一视图">
                    <ColumnWidthOutlined />
                  </Tooltip>
                ),
                value: 'unified',
              },
              {
                label: (
                  <Tooltip title="分栏视图">
                    <SplitCellsOutlined />
                  </Tooltip>
                ),
                value: 'split',
              },
            ]}
          />

          {/* 行号开关 */}
          <Tooltip title="显示行号">
            <Switch
              size="small"
              checked={showLines}
              onChange={setShowLines}
              checkedChildren="#"
              unCheckedChildren="#"
            />
          </Tooltip>

          {/* 折叠开关 */}
          {viewMode === 'unified' && (
            <Tooltip title="折叠未变更内容">
              <Switch
                size="small"
                checked={fold}
                onChange={setFold}
                checkedChildren="折叠"
                unCheckedChildren="展开"
              />
            </Tooltip>
          )}
        </Space>
      }
    >
      {diff.segments.length === 0 || summary === '无变更' ? (
        <div
          style={{
            textAlign: 'center',
            padding: 24,
            color: '#8c8c8c',
          }}
        >
          两个版本内容相同，无差异
        </div>
      ) : viewMode === 'unified' ? (
        <UnifiedView diff={diff} showLineNumbers={showLines} foldUnchanged={fold} />
      ) : (
        <SplitView
          diff={diff}
          showLineNumbers={showLines}
          oldLabel={oldLabel}
          newLabel={newLabel}
        />
      )}
    </Card>
  )
}

/**
 * 简化的 diff 预览（用于列表或小空间）
 */
type DiffPreviewProps = {
  oldText: string
  newText: string
  maxLines?: number
}

export function DiffPreview({ oldText, newText, maxLines = 3 }: DiffPreviewProps) {
  const diff = useMemo(() => generateDiff(oldText, newText), [oldText, newText])
  const summary = getDiffSummary(diff)

  // 只显示变化的行
  const changedLines = diff.segments
    .filter(s => s.type !== 'unchanged')
    .slice(0, maxLines)

  if (changedLines.length === 0) {
    return <Text type="secondary">无变更</Text>
  }

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
        {summary}
      </Text>
      <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {changedLines.map((segment, index) => (
          <div
            key={index}
            style={{
              ...getDiffStyle(segment.type),
              padding: '1px 4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getDiffPrefix(segment.type)}
            {segment.content.substring(0, 50)}
            {segment.content.length > 50 && '...'}
          </div>
        ))}
        {diff.segments.filter(s => s.type !== 'unchanged').length > maxLines && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            还有 {diff.segments.filter(s => s.type !== 'unchanged').length - maxLines} 行变更...
          </Text>
        )}
      </div>
    </div>
  )
}
