import type { EngineRouter } from '../router'
import type { HandlerDeps } from './context'

export function registerAiHandlers(
  router: EngineRouter,
  _deps: HandlerDeps,
): void {
  // ── ai.chat (STREAM) ──────────────────────────────────────────────────────
  router.registerStream('ai.chat', async function* (params, _ctx, opts) {
    const p = params as {
      messages: Array<{ role: string; content: string }>
      context?: { schema?: string; dialect?: string }
    }

    const lastMsg = p.messages[p.messages.length - 1]?.content || ''
    const responseText = `Tôi có thể hỗ trợ bạn truy vấn và tối ưu hoá cơ sở dữ liệu ${p.context?.dialect || 'SQL'}. Bạn vừa hỏi: "${lastMsg}". Hãy cho tôi biết thêm chi tiết.`

    const words = responseText.split(' ')
    let seq = 0

    for (let i = 0; i < words.length; i++) {
      if (opts?.signal?.aborted) break

      const delta = (i === 0 ? '' : ' ') + words[i]
      yield {
        seq: seq++,
        delta,
        done: false,
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 20)
        opts?.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          resolve()
        }, { once: true })
      })
    }

    yield {
      seq: seq++,
      delta: '',
      done: true,
    }
  })

  // ── ai.generateSql (UNARY) ────────────────────────────────────────────────
  router.registerUnary('ai.generateSql', async (params) => {
    const p = params as {
      prompt: string
      dialect: string
      schemaContext?: string[]
    }

    const promptLower = p.prompt.toLowerCase()
    let generatedSql = `SELECT * FROM (SELECT 1 AS id, 'Sample' AS name) t;`
    let explanation = `Câu lệnh SQL được tạo tự động cho dialect ${p.dialect}.`

    if (promptLower.includes('count') || promptLower.includes('đếm')) {
      generatedSql = `SELECT count(*) AS total FROM sample_table;`
      explanation = `Đếm tổng số bản ghi trong bảng.`
    } else if (promptLower.includes('user') || promptLower.includes('người dùng')) {
      generatedSql = `SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 50;`
      explanation = `Lấy danh sách 50 người dùng mới nhất.`
    }

    return {
      sql: generatedSql,
      explanation,
    }
  })

  // ── ai.fixSql (UNARY) ─────────────────────────────────────────────────────
  router.registerUnary('ai.fixSql', async (params) => {
    const p = params as {
      sql: string
      error: string
      dialect: string
    }

    let fixedSql = p.sql
    let explanation = `Đã kiểm tra và tối ưu cú pháp cho ${p.dialect}.`

    if (p.error.includes('syntax error') || p.error.includes('cú pháp')) {
      fixedSql = p.sql.trim().replace(/;+$/, '') + ';'
      explanation = `Đã sửa lỗi cú pháp và đóng câu lệnh bằng dấu chấm phẩy.`
    }

    return {
      fixedSql,
      explanation,
    }
  })

  // ── ai.explainPlan (UNARY) ────────────────────────────────────────────────
  router.registerUnary('ai.explainPlan', async (params) => {
    const p = params as {
      plan: string
      dialect: string
    }

    return {
      explanation: `Kế hoạch thực thi trên ${p.dialect} đã được phân tích. Truy vấn đang sử dụng index scan hoặc sequential scan phù hợp.`,
      suggestions: [
        'Cân nhắc bổ sung Composite Index nếu thường xuyên lọc đồng thời nhiều cột.',
        'Sử dụng LIMIT để tránh tải dữ liệu lớn vào bộ nhớ.',
      ],
    }
  })
}
