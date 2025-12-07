'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { PictureOutlined } from '@ant-design/icons'
import styles from './LazyImage.module.css'

export type LazyImageProps = {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
  placeholder?: React.ReactNode
  errorPlaceholder?: React.ReactNode
  threshold?: number
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  placeholder,
  errorPlaceholder,
  threshold = 0.1,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { threshold }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [threshold])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  const containerStyle: CSSProperties = {
    width,
    height,
    ...style,
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className}`}
      style={containerStyle}
    >
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {!isLoaded && !hasError && (
        <div className={styles.placeholder}>
          {placeholder}
        </div>
      )}

      {hasError && (
        <div className={styles.error}>
          {errorPlaceholder || (
            <>
              <PictureOutlined className={styles.errorIcon} />
              <span className={styles.errorText}>加载失败</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
