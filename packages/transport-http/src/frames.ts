import type { ErrorCode } from '@corvus/contract'

/**
 * Hình dạng lỗi đi trên dây.
 *
 * Cố ý KHÔNG mang `cause`: `cause` là chỗ chuỗi kết nối kèm mật khẩu hay lọt ra
 * (security.md §2). `HttpRpcServer.toWireError()` là nơi duy nhất dựng object này.
 */
export interface WireError {
  code: ErrorCode
  message: string
  i18nKey?: string
  detail?: string
}

export interface OpenFrame {
  t: 'open'
  id: string
  method: string
  params: unknown
}

export interface ChunkFrame {
  t: 'chunk'
  id: string
  seq: number
  data: unknown
}

export interface AckFrame {
  t: 'ack'
  id: string
  seq: number
}

export interface EndFrame {
  t: 'end'
  id: string
  stats?: unknown
}

export interface ErrorFrame {
  t: 'error'
  id: string
  /**
   * Lỗi trên dây. `code` phải là `ErrorCode` của contract, KHÔNG phải string tự do.
   *
   * Bản trước khai `unknown` nên client phát `code: 'CONNECTION_LOST'` — một mã KHÔNG có
   * trong `ErrorCode` — mà không ai phát hiện. UI tra `error.<code>` để lấy chuỗi i18n, nên
   * mã lạ dẫn tới thông báo trống. Ràng buộc kiểu ở đây là chỗ rẻ nhất để chặn.
   */
  error: WireError
}

export interface CancelFrame {
  t: 'cancel'
  id: string
}

export interface SubFrame {
  t: 'sub'
  id: string
  topic: string
}

export interface UnsubFrame {
  t: 'unsub'
  id: string
}

export interface EventFrame {
  t: 'event'
  topic: string
  data: unknown
}

export interface PingFrame {
  t: 'ping'
}

export interface PongFrame {
  t: 'pong'
}

export type Frame =
  | OpenFrame
  | ChunkFrame
  | AckFrame
  | EndFrame
  | ErrorFrame
  | CancelFrame
  | SubFrame
  | UnsubFrame
  | EventFrame
  | PingFrame
  | PongFrame
