'use client'

import { useState, useMemo } from 'react'
import {
  List,
  Card,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Collapse,
  Tooltip,
  message,
  Empty,
  Pagination,
} from 'antd'
import {
  CopyOutlined,
  SearchOutlined,
  ExpandAltOutlined,
  CompressOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { TaskResultData } from './types'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

type FailureSampleListProps = {
  samples: TaskResultData[]
  pageSize?: number
  /** 点击查看详情 */
  onViewDetail?: (sample: TaskResultData) => void
}

/**
 * 失败样本列表
 * 可分页查看失败样本详情
 */
export function FailureSampleList({
  samples,
  pageSize = 10,
  onViewDetail,
}: FailureSampleListProps) {
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 过滤样本
  const filteredSamples = useMemo(() => {
    if (!searchText.trim()) return samples

    const search = searchText.toLowerCase()
    return samples.filter(sample => {
      const inputStr = JSON.stringify(sample.input).toLowerCase()
      const outputStr = (sample.output || '').toLowerCase()
      const expectedStr = (sample.expected || '').toLowerCase()
      const errorStr = (sample.error || '').toLowerCase()
      const reasonStr = sample.evaluations
        .map(e => e.reason || '')
        .join(' ')
        .toLowerCase()

      return (
        inputStr.includes(search) ||
        outputStr.includes(search) ||
        expectedStr.includes(search) ||
        errorStr.includes(search) ||
        reasonStr.includes(search)
      )
    })
  }, [samples, searchText])

  // 分页数据
  const paginatedSamples = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSamples.slice(start, start + pageSize)
  }, [filteredSamples, currentPage, pageSize])

  // 复制到剪贴板
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(`${label}已复制`)
    } catch {
      message.error('复制失败')
    }
  }

  // 全部展开/收起
  const toggleExpandAll = () => {
    if (expandedKeys.length === paginatedSamples.length) {
      setExpandedKeys([])
    } else {
      setExpandedKeys(paginatedSamples.map(s => s.id))
    }
  }

  if (samples.length === 0) {
    return (
      <Card size="small" title="失败样本">
        <Empty description="暂无失败样本" />
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title={`失败样本 (${samples.length})`}
      extra={
        <Space>
          <Input
            placeholder="搜索样本..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value)
              setCurrentPage(1)
            }}
            style={{ width: 200 }}
            allowClear
          />
          <Tooltip title={expandedKeys.length === paginatedSamples.length ? '全部收起' : '全部展开'}>
            <Button
              icon={expandedKeys.length === paginatedSamples.length ? <CompressOutlined /> : <ExpandAltOutlined />}
              onClick={toggleExpandAll}
            />
          </Tooltip>
        </Space>
      }
    >
      {filteredSamples.length === 0 ? (
        <Empty description="未找到匹配的样本" />
      ) : (
        <>
          <Collapse
            activeKey={expandedKeys}
            onChange={keys => setExpandedKeys(keys as string[])}
            style={{ marginBottom: 16 }}
          >
            {paginatedSamples.map((sample, index) => {
              const globalIndex = (currentPage - 1) * pageSize + index + 1
              const failedEvaluators = sample.evaluations.filter(e => !e.passed)

              return (
                <Panel
                  key={sample.id}
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <Tag color="red">#{globalIndex}</Tag>
                      <Text ellipsis style={{ flex: 1, maxWidth: 400 }}>
                        {JSON.stringify(sample.input).substring(0, 80)}...
                      </Text>
                      <Space size={4}>
                        {sample.status !== 'FAILED' && (
                          <Tag color={sample.status === 'ERROR' ? 'red' : 'orange'}>
                            {sample.status}
                          </Tag>
                        )}
                        {failedEvaluators.map(e => (
                          <Tag key={e.evaluatorId} color="volcano">
                            {e.evaluatorName}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  }
                  extra={
                    onViewDetail && (
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={e => {
                          e.stopPropagation()
                          onViewDetail(sample)
                        }}
                      >
                        详情
                      </Button>
                    )
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* 输入 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>输入</Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(JSON.stringify(sample.input, null, 2), '输入')}
                        />
                      </div>
                      <div
                        style={{
                          background: '#f5f5f5',
                          padding: 12,
                          borderRadius: 8,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}
                      >
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                          {JSON.stringify(sample.input, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* 期望输出 vs 实际输出 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text strong style={{ color: '#52c41a' }}>期望输出</Text>
                          {sample.expected && (
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(sample.expected || '', '期望输出')}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            background: '#f6ffed',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid #b7eb8f',
                            maxHeight: 200,
                            overflow: 'auto',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                            {sample.expected || '（无期望输出）'}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text strong style={{ color: '#ff4d4f' }}>实际输出</Text>
                          {sample.output && (
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(sample.output || '', '实际输出')}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            background: '#fff2f0',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid #ffa39e',
                            maxHeight: 200,
                            overflow: 'auto',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                            {sample.output || '（无输出）'}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* 评估器结果 */}
                    {failedEvaluators.length > 0 && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          评估器失败原因
                        </Text>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {failedEvaluators.map(evaluator => (
                            <div
                              key={evaluator.evaluatorId}
                              style={{
                                background: '#fffbe6',
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid #ffe58f',
                              }}
                            >
                              <div style={{ marginBottom: 4 }}>
                                <Tag color="orange">{evaluator.evaluatorName}</Tag>
                                {evaluator.score !== null && (
                                  <Text type="secondary">得分: {evaluator.score}</Text>
                                )}
                              </div>
                              <Text>{evaluator.reason || '未提供原因'}</Text>
                            </div>
                          ))}
                        </Space>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {sample.error && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8, color: '#ff4d4f' }}>
                          错误信息
                        </Text>
                        <div
                          style={{
                            background: '#fff2f0',
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid #ffa39e',
                          }}
                        >
                          <Text type="danger">{sample.error}</Text>
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              )
            })}
          </Collapse>

          {/* 分页 */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination
              current={currentPage}
              total={filteredSamples.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} / ${total} 条`
              }
            />
          </div>
        </>
      )}
    </Card>
  )
}
