'use client'

import type { CSSProperties } from 'react'
import { Card, Button, Row, Col } from 'antd'
import {
  PlusOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ApiOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { PRIMARY } from '@/theme/colors'

type QuickStartProps = {
  onNewTask?: () => void
  onNewPrompt?: () => void
  onUploadDataset?: () => void
  onAddModel?: () => void
  onConfigEvaluator?: () => void
}

export function QuickStart({
  onNewTask,
  onNewPrompt,
  onUploadDataset,
  onAddModel,
  onConfigEvaluator,
}: QuickStartProps) {
  const router = useRouter()

  const handleNewTask = () => {
    if (onNewTask) {
      onNewTask()
    } else {
      router.push('/tasks/new')
    }
  }

  const handleNewPrompt = () => {
    if (onNewPrompt) {
      onNewPrompt()
    } else {
      router.push('/prompts/new')
    }
  }

  const handleUploadDataset = () => {
    if (onUploadDataset) {
      onUploadDataset()
    } else {
      router.push('/datasets?action=upload')
    }
  }

  const handleAddModel = () => {
    if (onAddModel) {
      onAddModel()
    } else {
      router.push('/models')
    }
  }

  const handleConfigEvaluator = () => {
    if (onConfigEvaluator) {
      onConfigEvaluator()
    } else {
      router.push('/evaluators')
    }
  }

  const secondaryActions = [
    {
      key: 'prompt',
      title: '新建提示词',
      desc: '创建提示词模板',
      icon: <FileTextOutlined style={{ fontSize: 20 }} />,
      onClick: handleNewPrompt,
    },
    {
      key: 'dataset',
      title: '上传数据集',
      desc: '导入测试数据',
      icon: <DatabaseOutlined style={{ fontSize: 20 }} />,
      onClick: handleUploadDataset,
    },
    {
      key: 'model',
      title: '添加模型',
      desc: '配置 AI 模型',
      icon: <ApiOutlined style={{ fontSize: 20 }} />,
      onClick: handleAddModel,
    },
    {
      key: 'evaluator',
      title: '配置评估器',
      desc: '设置评估规则',
      icon: <SettingOutlined style={{ fontSize: 20 }} />,
      onClick: handleConfigEvaluator,
    },
  ]

  const primaryBtnStyle: CSSProperties = {
    height: 44,
    fontSize: 15,
    fontWeight: 500,
    background: '#fff',
    color: PRIMARY[500],
    border: `1px solid ${PRIMARY[200]}`,
    boxShadow: 'none',
    transition: 'all 0.2s ease',
  }

  const actionCardStyle: CSSProperties = {
    padding: '16px',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    height: '100%',
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <RocketOutlined style={{ color: PRIMARY[500] }} />
          快速开始
        </span>
      }
      styles={{ body: { padding: 16 } }}
    >
      {/* 主按钮 - 新建测试任务 */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={handleNewTask}
        block
        style={primaryBtnStyle}
        className="quick-start-primary-btn"
      >
        新建测试任务
      </Button>

      {/* 次要入口 - 2x2 网格 hover-card */}
      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        {secondaryActions.map((action) => (
          <Col span={12} key={action.key}>
            <div
              style={actionCardStyle}
              className="quick-action-card"
              onClick={action.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  action.onClick()
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: PRIMARY[50],
                    color: PRIMARY[500],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {action.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{action.title}</div>
                  <div className="text-xs text-gray-400">{action.desc}</div>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <style jsx global>{`
        .quick-start-primary-btn:hover {
          background: ${PRIMARY[50]} !important;
          border-color: ${PRIMARY[500]} !important;
          color: ${PRIMARY[600]} !important;
        }
        .quick-start-primary-btn:active {
          background: ${PRIMARY[100]} !important;
        }
        .quick-action-card:hover {
          border-color: ${PRIMARY[200]};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }
        .quick-action-card:focus {
          outline: none;
          border-color: ${PRIMARY[500]};
          box-shadow: 0 0 0 3px ${PRIMARY[100]};
        }
      `}</style>
    </Card>
  )
}
