export type JobKind =
  | 'import'
  | 'export'
  | 'backup'
  | 'restore'
  | 'transfer'
  | 'sync'
  | 'datagen'
  | 'batch'

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'

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

export interface ScheduleConfig {
  id: string
  jobId: string
  cron: string
  timezone: string
  enabled: boolean
  lastRunAt?: string
  nextRunAt?: string
}

export interface BatchJobStep {
  id: string
  name: string
  kind: JobKind
  payload: Record<string, unknown>
  continueOnError?: boolean
}

export interface BatchJobDef {
  id: string
  name: string
  steps: BatchJobStep[]
  schedule?: ScheduleConfig
}
