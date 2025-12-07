import type { ApiResponse, ApiError } from '@platform/shared'
import { ERROR_CODES, ERROR_MESSAGES } from '@platform/shared'

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
  }
}

export function error(code: number, message?: string): ApiError {
  return {
    code,
    message: message || ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || '未知错误',
    data: null,
  }
}

export function badRequest(message?: string): ApiError {
  return error(ERROR_CODES.BAD_REQUEST, message)
}

export function unauthorized(message?: string): ApiError {
  return error(ERROR_CODES.UNAUTHORIZED, message)
}

export function forbidden(message?: string): ApiError {
  return error(ERROR_CODES.FORBIDDEN, message)
}

export function notFound(message?: string): ApiError {
  return error(ERROR_CODES.NOT_FOUND, message)
}

export function internalError(message?: string): ApiError {
  return error(ERROR_CODES.INTERNAL_ERROR, message)
}
