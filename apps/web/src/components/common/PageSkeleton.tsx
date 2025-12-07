'use client'

import { Space } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

type SkeletonType = 'dashboard' | 'list' | 'detail' | 'form'

type PageSkeletonProps = {
  type: SkeletonType
  className?: string
  style?: CSSProperties
}

// 骨架块组件
function SkeletonBlock({
  width = '100%',
  height = 16,
  style
}: {
  width?: string | number
  height?: number
  style?: CSSProperties
}) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: 4,
        ...style
      }}
    />
  )
}

// 骨架卡片组件
function SkeletonCard({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #f0f0f0',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// 工作台骨架屏
function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 统计卡片区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: '50%' }} />
                <SkeletonBlock width={60} height={20} />
              </div>
              <SkeletonBlock width="60%" height={14} />
              <SkeletonBlock width="40%" height={28} />
            </Space>
          </SkeletonCard>
        ))}
      </div>

      {/* 快速开始和最近任务 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SkeletonCard style={{ height: 200 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <SkeletonBlock width="30%" height={20} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} height={48} />
              ))}
            </div>
          </Space>
        </SkeletonCard>
        <SkeletonCard style={{ height: 200 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <SkeletonBlock width="30%" height={20} />
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} height={24} />
            ))}
          </Space>
        </SkeletonCard>
      </div>

      {/* 趋势图表 */}
      <SkeletonCard style={{ height: 300 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <SkeletonBlock width="20%" height={20} />
            <SkeletonBlock width={120} height={32} />
          </div>
          <SkeletonBlock height={220} />
        </Space>
      </SkeletonCard>
    </div>
  )
}

// 列表页骨架屏
function ListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 标题和操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={120} height={28} />
        <Space>
          <SkeletonBlock width={100} height={32} />
          <SkeletonBlock width={100} height={32} />
        </Space>
      </div>

      {/* 筛选栏 */}
      <SkeletonCard>
        <Space size={16}>
          <SkeletonBlock width={150} height={32} />
          <SkeletonBlock width={120} height={32} />
          <SkeletonBlock width={200} height={32} />
        </Space>
      </SkeletonCard>

      {/* 表格 */}
      <SkeletonCard>
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          {/* 表头 */}
          <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            {[120, 200, 100, 100, 150].map((w, i) => (
              <SkeletonBlock key={i} width={w} height={16} />
            ))}
          </div>
          {/* 表格行 */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
              {[120, 200, 100, 100, 150].map((w, j) => (
                <SkeletonBlock key={j} width={w} height={14} />
              ))}
            </div>
          ))}
        </Space>
      </SkeletonCard>

      {/* 分页 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <SkeletonBlock width={32} height={32} />
          <SkeletonBlock width={32} height={32} />
          <SkeletonBlock width={32} height={32} />
        </Space>
      </div>
    </div>
  )
}

// 详情页骨架屏
function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* 主内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 返回和标题 */}
        <Space>
          <SkeletonBlock width={60} height={32} />
          <SkeletonBlock width={200} height={28} />
        </Space>

        {/* 主内容卡片 */}
        <SkeletonCard style={{ minHeight: 400 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <SkeletonBlock width="100%" height={200} />
            <SkeletonBlock width="80%" height={16} />
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="70%" height={16} />
          </Space>
        </SkeletonCard>
      </div>

      {/* 侧边栏 */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonCard>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <SkeletonBlock width="50%" height={18} />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <SkeletonBlock width="30%" height={14} />
                <SkeletonBlock width="50%" height={14} />
              </div>
            ))}
          </Space>
        </SkeletonCard>
        <SkeletonCard>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <SkeletonBlock width="50%" height={18} />
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} height={40} />
            ))}
          </Space>
        </SkeletonCard>
      </div>
    </div>
  )
}

// 表单页骨架屏
function FormSkeleton() {
  return (
    <div style={{ maxWidth: 600 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={24}>
        <SkeletonBlock width={150} height={28} />

        <SkeletonCard>
          <Space direction="vertical" style={{ width: '100%' }} size={20}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <SkeletonBlock width={80} height={14} style={{ marginBottom: 8 }} />
                <SkeletonBlock height={40} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <SkeletonBlock width={80} height={40} />
              <SkeletonBlock width={80} height={40} />
            </div>
          </Space>
        </SkeletonCard>
      </Space>
    </div>
  )
}

/**
 * 页面骨架屏组件
 *
 * @example
 * {isLoading ? <PageSkeleton type="dashboard" /> : <DashboardContent />}
 * {isLoading ? <PageSkeleton type="list" /> : <ListContent />}
 */
export function PageSkeleton({ type, className, style }: PageSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'dashboard':
        return <DashboardSkeleton />
      case 'list':
        return <ListSkeleton />
      case 'detail':
        return <DetailSkeleton />
      case 'form':
        return <FormSkeleton />
      default:
        return <ListSkeleton />
    }
  }

  return (
    <div className={className} style={style}>
      {renderSkeleton()}
    </div>
  )
}

export default PageSkeleton
