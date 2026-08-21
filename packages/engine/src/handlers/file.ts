import fs from 'node:fs'
import path from 'node:path'
import { corvusError } from '@corvus/contract'
import type { EngineRouter } from '../router'
import type { HandlerDeps } from './context'

export function registerFileHandlers(
  router: EngineRouter,
  _deps: HandlerDeps,
): void {
  // ── file.pickOpen (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('file.pickOpen', async (_params) => {
    return { paths: [] }
  })

  // ── file.pickSave (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('file.pickSave', async (params) => {
    const p = params as { defaultPath?: string }
    return { path: p.defaultPath ?? null }
  })

  // ── file.readChunk (UNARY) ────────────────────────────────────────────────
  router.registerUnary('file.readChunk', async (params) => {
    const p = params as { path: string; offset: number; length: number }
    if (!fs.existsSync(p.path)) {
      throw corvusError('NOT_FOUND', `Không tìm thấy file '${p.path}'`, {
        i18nKey: 'error.fileNotFound',
      })
    }

    const stat = fs.statSync(p.path)
    const fd = fs.openSync(p.path, 'r')
    const buffer = Buffer.alloc(p.length)

    try {
      const bytesRead = fs.readSync(fd, buffer, 0, p.length, p.offset)
      const data = buffer.subarray(0, bytesRead).toString('base64')
      const eof = p.offset + bytesRead >= stat.size

      return {
        data,
        bytesRead,
        eof,
      }
    } finally {
      fs.closeSync(fd)
    }
  })

  // ── file.writeChunk (UNARY) ───────────────────────────────────────────────
  router.registerUnary('file.writeChunk', async (params) => {
    const p = params as { path: string; offset: number; data: string }
    const buffer = Buffer.from(p.data, 'base64')

    // Tự động tạo thư mục cha nếu chưa tồn tại
    const dir = path.dirname(p.path)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const flags = fs.existsSync(p.path) ? 'r+' : 'w+'
    const fd = fs.openSync(p.path, flags)

    try {
      const bytesWritten = fs.writeSync(fd, buffer, 0, buffer.length, p.offset)
      return { bytesWritten }
    } finally {
      fs.closeSync(fd)
    }
  })

  // ── file.stat (UNARY) ─────────────────────────────────────────────────────
  router.registerUnary('file.stat', async (params) => {
    const p = params as { path: string }
    if (!fs.existsSync(p.path)) {
      throw corvusError('NOT_FOUND', `Không tìm thấy file '${p.path}'`, {
        i18nKey: 'error.fileNotFound',
      })
    }

    const stat = fs.statSync(p.path)
    return {
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
    }
  })
}
