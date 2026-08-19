/**
 * Kiểm tra tính toàn vẹn của hợp đồng RPC — rpc-contract.md §3.
 *
 * Chạy qua tsx nên import trực tiếp TS source (các package export từ ./src, không có dist).
 *
 * FAIL (luôn sai, không có ngoại lệ):
 *   1. Method thiếu `permission` hoặc `audit`
 *   2. Method `apply*` không nhận `previewToken`         (ADR-0010)
 *   3. Method `apply*` không có `preview*` cặp đôi        (ADR-0010)
 *   4. Định nghĩa method sai hình dạng (thiếu kind/params)
 *
 * RATCHET (nợ có kiểm soát, chỉ được giảm):
 *   5. Method chưa có handler trong engine — số hiện tại phải <= HANDLER_DEBT
 */
// Không import zod ở đây: nó là dependency của packages/contract, không của root.
// Thay vào đó duck-type schema — chỉ cần biết nó có `.shape` hay không.
import { METHODS } from '../packages/contract/src/index'

/**
 * Số method còn CHƯA có handler. Đây là nợ đã biết (audit 2026-08-18: 76/76).
 * Chỉ được PHÉP GIẢM. Mỗi khi hiện thực thêm handler, hạ con số này xuống.
 */
const HANDLER_DEBT = 69

const errors: string[] = []
const warnings: string[] = []

const names = Object.keys(METHODS)
if (names.length === 0) {
  console.error('[check-contract] Không tìm thấy method nào trong @corvus/contract')
  process.exit(1)
}

/** Lấy danh sách key của một zod object schema, bóc các lớp bọc (optional, default, effects). */
function paramKeys(schema: unknown): string[] {
  let inner: unknown = schema
  for (let i = 0; i < 6 && inner; i++) {
    const shape = (inner as { shape?: Record<string, unknown> }).shape
    if (shape && typeof shape === 'object') return Object.keys(shape)
    const def = (inner as { _def?: { innerType?: unknown; schema?: unknown; shape?: unknown } })._def
    if (typeof def?.shape === 'function') return Object.keys((def.shape as () => object)())
    inner = def?.innerType ?? def?.schema
  }
  return []
}

for (const [name, def] of Object.entries(METHODS)) {
  const d = def as {
    kind?: string
    name?: string
    params?: unknown
    permission?: string
    audit?: string
  }

  if (d.kind !== 'unary' && d.kind !== 'stream') {
    errors.push(`${name}: kind phải là 'unary' hoặc 'stream', nhận '${d.kind}'`)
  }
  if (d.name !== name) {
    errors.push(`${name}: khoá registry và def.name lệch nhau ('${d.name}')`)
  }
  if (!d.params) {
    errors.push(`${name}: thiếu schema params`)
  }
  if (!d.permission) {
    errors.push(`${name}: thiếu 'permission' (security.md §4 — router kiểm quyền trước handler)`)
  }
  if (!d.audit) {
    errors.push(`${name}: thiếu 'audit' (none | metadata | full)`)
  }

  // ADR-0010: apply* chỉ nhận previewToken, và phải có preview* cặp đôi.
  const short = name.split('.').pop() ?? ''
  if (/^apply[A-Z]/.test(short)) {
    const keys = paramKeys(d.params)
    if (!keys.includes('previewToken')) {
      errors.push(
        `${name}: method apply* phải nhận 'previewToken' (ADR-0010). Params hiện có: [${keys.join(', ')}]`,
      )
    }
    const pair = name.replace(/\.apply/, '.preview')
    if (!(pair in METHODS)) {
      errors.push(`${name}: thiếu method cặp đôi '${pair}' (ADR-0010)`)
    }
  }
}

// ── Kiểm tra handler ─────────────────────────────────────────────────────────
// Engine đăng ký handler lúc chạy, nên không tĩnh-phân-tích được chắc chắn.
// Cách đo: quét source engine tìm registerUnary('x') / registerStream('x').
const { readFileSync, readdirSync, statSync } = await import('node:fs')
const { join } = await import('node:path')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
  })
}

const registered = new Set<string>()
for (const file of walk('packages/engine/src')) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/register(?:Unary|Stream)\(\s*['"]([^'"]+)['"]/g)) {
    registered.add(m[1]!)
  }
}

for (const r of registered) {
  if (!(r in METHODS)) {
    errors.push(`Handler đăng ký cho method không tồn tại trong contract: '${r}'`)
  }
}

const missing = names.filter((n) => !registered.has(n))
if (missing.length > HANDLER_DEBT) {
  errors.push(
    `Số method chưa có handler tăng lên ${missing.length} (giới hạn ${HANDLER_DEBT}). ` +
      `Không được thêm method mới mà không có handler.`,
  )
} else if (missing.length > 0) {
  warnings.push(
    `${missing.length}/${names.length} method chưa có handler (nợ cho phép: ${HANDLER_DEBT}). ` +
      `Hạ HANDLER_DEBT trong tools/check-contract.ts mỗi khi hiện thực thêm.`,
  )
}

// ── Báo cáo ──────────────────────────────────────────────────────────────────
console.log(`[check-contract] ${names.length} method, ${registered.size} handler đã đăng ký`)
for (const w of warnings) console.warn(`  ⚠ ${w}`)
if (errors.length > 0) {
  console.error(`\n[check-contract] ${errors.length} lỗi:`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log('[check-contract] OK')
