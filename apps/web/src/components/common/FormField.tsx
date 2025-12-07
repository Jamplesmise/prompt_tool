'use client'

import type { ReactNode } from 'react'
import { Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'

export type FormFieldProps = {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: ReactNode
  tooltip?: string
  extra?: ReactNode
  className?: string
}

export function FormField({
  label,
  required = false,
  helper,
  error,
  children,
  tooltip,
  extra,
  className = '',
}: FormFieldProps) {
  const hasError = !!error

  return (
    <div className={`form-field ${hasError ? 'has-error' : ''} ${className}`}>
      <div className="form-field-header">
        <label className="form-field-label">
          {required && <span className="required-mark">*</span>}
          {label}
          {tooltip && (
            <Tooltip title={tooltip}>
              <QuestionCircleOutlined className="label-tooltip" />
            </Tooltip>
          )}
        </label>
        {extra && <div className="form-field-extra">{extra}</div>}
      </div>

      <div className="form-field-control">{children}</div>

      {(helper || error) && (
        <div className={`form-field-helper ${hasError ? 'error' : ''}`}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default FormField
