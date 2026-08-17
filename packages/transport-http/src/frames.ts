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
  error: unknown
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
