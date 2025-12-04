'use client'

import { Card, Button, Row, Col } from 'antd'
import {
  PlusOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

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
      icon: <FileTextOutlined />,
      onClick: handleNewPrompt,
    },
    {
      key: 'dataset',
      title: '上传数据集',
      icon: <DatabaseOutlined />,
      onClick: handleUploadDataset,
    },
    {
      key: 'model',
      title: '添加模型',
      icon: <ApiOutlined />,
      onClick: handleAddModel,
    },
    {
      key: 'evaluator',
      title: '配置评估器',
      icon: <SettingOutlined />,
      onClick: handleConfigEvaluator,
    },
  ]

  return (
    <Card
      title={
        <span>
          <span className="mr-2">🚀</span>
          快速开始
        </span>
      }
    >
      {/* 主按钮 - 新建测试任务 */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={handleNewTask}
        block
        className="primary-gradient-btn"
        style={{
          height: 56,
          fontSize: 16,
          background: 'linear-gradient(135deg, #1677FF, #69B1FF)',
          border: 'none',
          marginBottom: 16,
        }}
      >
        <span className="flex flex-col items-start ml-2">
          <span className="font-medium">新建测试任务</span>
          <span className="text-xs opacity-80 font-normal">
            选择提示词、模型、数据集
          </span>
        </span>
      </Button>

      {/* 次要按钮 - 2x2 网格 */}
      <Row gutter={[12, 12]}>
        {secondaryActions.map((action) => (
          <Col span={12} key={action.key}>
            <Button
              icon={action.icon}
              onClick={action.onClick}
              block
              size="middle"
              style={{
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {action.title}
            </Button>
          </Col>
        ))}
      </Row>
    </Card>
  )
}
