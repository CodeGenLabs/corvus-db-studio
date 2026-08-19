/**
 * Bench cho quyết định ở `EngineRouter.handleStream`: có validate từng `ResultChunk` không?
 *
 * ADR-0008 nêu ngoại lệ "không validate từng ResultChunk". File này là SỐ ĐO chứng minh
 * ngoại lệ đó đáng giá, để người sau không phải tin lời.
 *
 * Chạy: `npx tsx tools/bench/chunk-validate.bench.ts`
 */
import { ResultChunkSchema } from '@corvus/contract'

const ROWS_PER_CHUNK = 1_000
const COLS = 20
const CHUNKS = 1_000 // ⇒ 1 000 000 dòng

function makeChunk(seq: number) {
  const rows: unknown[][] = []
  for (let r = 0; r < ROWS_PER_CHUNK; r++) {
    const row: unknown[] = []
    for (let c = 0; c < COLS; c++) {
      row.push(c % 3 === 0 ? seq * ROWS_PER_CHUNK + r : c % 3 === 1 ? `value-${r}-${c}` : null)
    }
    rows.push(row)
  }
  return { seq, rows, done: false }
}

// Xoay vòng 20 chunk có sẵn: bench đo chi phí VALIDATE, không đo chi phí tạo dữ liệu.
const pool = Array.from({ length: 20 }, (_, i) => makeChunk(i))

function run(validate: boolean): { ms: number } {
  const t0 = performance.now()
  let rows = 0
  for (let i = 0; i < CHUNKS; i++) {
    const chunk = pool[i % pool.length] as { rows: unknown[][] }
    if (validate) {
      const parsed = ResultChunkSchema.safeParse(chunk)
      if (!parsed.success) throw new Error('chunk invalid')
      rows += parsed.data.rows.length
    } else {
      rows += chunk.rows.length
    }
  }
  if (rows !== CHUNKS * ROWS_PER_CHUNK) throw new Error('bench sai')
  return { ms: performance.now() - t0 }
}

run(false)
run(true) // warm-up cả hai nhánh

const off = run(false)
const on = run(true)

console.log(`Chunk: ${CHUNKS} × ${ROWS_PER_CHUNK} dòng × ${COLS} cột = 1 000 000 dòng`)
console.log(`không validate : ${off.ms.toFixed(0)} ms`)
console.log(`có validate    : ${on.ms.toFixed(0)} ms`)
console.log(`chênh lệch     : +${(on.ms - off.ms).toFixed(0)} ms CPU chặn event loop`)
