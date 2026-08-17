export type JobKind =
  | 'import'
  | 'export'
  | 'backup'
  | 'restore'
  | 'transfer'
  | 'sync'
  | 'datagen'
  | 'batch'

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'

export interface JobMeta {
  id: string
  kind: JobKind
  name: string
  status: JobStatus
  createdAt: string
  startedAt?: string
  finishedAt?: string
  progressPercent?: number
  error?: string
}
