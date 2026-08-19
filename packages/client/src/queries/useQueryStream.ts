import { toError } from '@corvus/contract'
import { useEffect, useState, useRef } from 'react'

export interface QueryStreamState<T> {
  rows: T[]
  isLoading: boolean
  isComplete: boolean
  error: Error | null
  totalBytesReceived: number
}

export interface UseQueryStreamOptions<T> {
  maxRingBufferCapacity?: number
  onRow?: (row: T) => void
  onComplete?: () => void
  onError?: (err: Error) => void
}

/**
 * React hook to consume RPC AsyncIterable stream with bounded ring buffer, seq-gap detection, and cancellation
 */
export function useQueryStream<T>(
  streamFactory: (signal: AbortSignal) => AsyncIterable<{ rows: T[]; seq?: number }>,
  options: UseQueryStreamOptions<T> = {},
): QueryStreamState<T> & { cancel: () => void } {
  const [state, setState] = useState<QueryStreamState<T>>({
    rows: [],
    isLoading: true,
    isComplete: false,
    error: null,
    totalBytesReceived: 0,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const maxCapacity = options.maxRingBufferCapacity ?? 200_000

  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    let expectedSeq = 0

    const runStream = async () => {
      setState((prev) => ({ ...prev, isLoading: true, isComplete: false, error: null }))
      try {
        const stream = streamFactory(controller.signal)
        for await (const chunk of stream) {
          if (controller.signal.aborted) break

          // Seq gap detection
          if (chunk.seq !== undefined) {
            if (chunk.seq !== expectedSeq) {
              console.warn(`[useQueryStream] Detected seq gap! Expected ${expectedSeq}, got ${chunk.seq}`)
            }
            expectedSeq = chunk.seq + 1
          }

          setState((prev) => {
            const combined = [...prev.rows, ...chunk.rows]
            if (combined.length > maxCapacity) {
              combined.splice(0, combined.length - maxCapacity)
            }
            return {
              ...prev,
              rows: combined,
              totalBytesReceived: prev.totalBytesReceived + JSON.stringify(chunk.rows).length,
            }
          })

          chunk.rows.forEach((r) => options.onRow?.(r))
        }

        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, isLoading: false, isComplete: true }))
          options.onComplete?.()
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          // catch nhận unknown (JS cho phép ném bất cứ thứ gì) → chuẩn hoá về Error
          // để state và callback có kiểu chắc chắn.
          const error = toError(err)
          setState((prev) => ({ ...prev, isLoading: false, error }))
          options.onError?.(error)
        }
      }
    }

    runStream()

    return () => {
      controller.abort()
    }
  }, [streamFactory, maxCapacity])

  return {
    ...state,
    cancel: () => abortControllerRef.current?.abort(),
  }
}
