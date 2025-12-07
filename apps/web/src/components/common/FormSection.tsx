'use client'

import { useState, type ReactNode } from 'react'
import { DownOutlined } from '@ant-design/icons'

export type FormSectionProps = {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  className?: string
}

export function FormSection({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  className = '',
}: FormSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded)
    }
  }

  return (
    <div
      className={`form-section ${expanded ? 'expanded' : 'collapsed'} ${className}`}
    >
      <div
        className="form-section-header"
        onClick={handleToggle}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <div className="section-title-group">
          {icon && <span className="section-icon">{icon}</span>}
          <div>
            <h4 className="section-title">{title}</h4>
            {description && <p className="section-description">{description}</p>}
          </div>
        </div>

        {collapsible && (
          <span className="section-toggle">
            <DownOutlined />
          </span>
        )}
      </div>

      {expanded && <div className="form-section-body">{children}</div>}
    </div>
  )
}

export default FormSection
