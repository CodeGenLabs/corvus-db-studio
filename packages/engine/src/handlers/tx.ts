import { corvusError } from '@corvus/contract'
import type { Transaction } from '@corvus/driver-core'
import type { EngineRouter } from '../router'
import {
  resolveConnection,
  type HandlerDeps,
} from './context'

export interface ManagedTransaction {
  id: string
  connectionId: string
  startedAt: string
  queryCount: number
  tx: Transaction
}

const activeTransactions = new Map<string, ManagedTransaction>()

export function registerTxHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── tx.begin (UNARY) ──────────────────────────────────────────────────────
  router.registerUnary('tx.begin', async (params, ctx) => {
    const p = params as {
      connectionId: string
      isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable'
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const rawIsolation = p.isolationLevel
      ? (p.isolationLevel.replace(/_/g, '-') as
          | 'read-uncommitted'
          | 'read-committed'
          | 'repeatable-read'
          | 'serializable')
      : undefined

    const tx = await conn.beginTransaction({ isolationLevel: rawIsolation })

    const item: ManagedTransaction = {
      id: tx.id,
      connectionId: p.connectionId,
      startedAt: new Date().toISOString(),
      queryCount: 0,
      tx,
    }
    activeTransactions.set(tx.id, item)

    return { transactionId: tx.id }
  })

  // ── tx.commit (UNARY) ─────────────────────────────────────────────────────
  router.registerUnary('tx.commit', async (params) => {
    const p = params as { transactionId: string }
    const item = activeTransactions.get(p.transactionId)
    if (!item) {
      throw corvusError('NOT_FOUND', `Không tìm thấy transaction '${p.transactionId}'`, {
        i18nKey: 'error.transactionNotFound',
      })
    }

    await item.tx.commit()
    activeTransactions.delete(p.transactionId)

    return { success: true }
  })

  // ── tx.rollback (UNARY) ───────────────────────────────────────────────────
  router.registerUnary('tx.rollback', async (params) => {
    const p = params as { transactionId: string }
    const item = activeTransactions.get(p.transactionId)
    if (!item) {
      throw corvusError('NOT_FOUND', `Không tìm thấy transaction '${p.transactionId}'`, {
        i18nKey: 'error.transactionNotFound',
      })
    }

    await item.tx.rollback()
    activeTransactions.delete(p.transactionId)

    return { success: true }
  })

  // ── tx.status (UNARY) ─────────────────────────────────────────────────────
  router.registerUnary('tx.status', async (params) => {
    const p = params as { transactionId: string }
    const item = activeTransactions.get(p.transactionId)

    if (!item) {
      return {
        active: false,
        startedAt: new Date().toISOString(),
        queryCount: 0,
      }
    }

    return {
      active: true,
      startedAt: item.startedAt,
      queryCount: item.queryCount,
    }
  })
}
