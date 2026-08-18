export interface UnloadGuardCondition {
  hasOpenTransaction: boolean
  hasRunningJobs: boolean
  runningJobNames?: string[]
}

export function setupUnloadGuard(getConditions: () => UnloadGuardCondition): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    const { hasOpenTransaction, hasRunningJobs, runningJobNames } = getConditions()
    if (hasOpenTransaction || hasRunningJobs) {
      let message = 'Bạn có công việc đang thực thi dở dang:'
      if (hasOpenTransaction) {
        message += '\n- Transaction đang mở (dữ liệu chưa commit sẽ bị rollback).'
      }
      if (hasRunningJobs) {
        message += `\n- Có tác vụ ngầm đang chạy (${runningJobNames?.join(', ') || 'Backup / Import / Job'}).`
      }
      e.preventDefault()
      e.returnValue = message
      return message
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
}
