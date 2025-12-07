'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from 'antd'
import { ExclamationCircleOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons'
import styles from './ErrorBoundary.module.css'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={styles.container}>
          <ExclamationCircleOutlined className={styles.icon} />
          <h2 className={styles.title}>页面出错了</h2>
          <p className={styles.message}>
            抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。
          </p>
          <div className={styles.actions}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.handleRetry}
            >
              重试
            </Button>
            <Button icon={<HomeOutlined />} onClick={this.handleGoHome}>
              返回首页
            </Button>
          </div>
          {this.props.showDetails && this.state.error && (
            <div className={styles.details}>
              <div className={styles.detailsTitle}>错误详情</div>
              <div className={styles.detailsContent}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </div>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
