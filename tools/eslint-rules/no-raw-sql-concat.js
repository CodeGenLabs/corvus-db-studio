/**
 * security.md §7 — chống SQL injection trong SQL do HỆ THỐNG sinh.
 *
 * Tầng sinh DDL (packages/sql/src/ddl.ts, driver-<engine>/ddl.ts) BUỘC phải ghép chuỗi:
 * DDL không parameterize được identifier. Vì vậy rule không cấm ghép chuỗi nói chung,
 * mà cấm đúng hai mẫu nguy hiểm:
 *
 *   1. Nội suy vào trong dấu nháy  →  `... WHERE name = '${value}'`
 *      Giá trị chứa dấu nháy sẽ thoát ra ngoài. Phải bind parameter.
 *
 *   2. Nội suy identifier thô, không qua hàm quote  →  `SELECT * FROM ${table}`
 *      Phải đi qua quoteIdentifier() / ident() / escapeLiteral().
 *
 * Nội suy đã qua hàm quote, hoặc biến có tên cho thấy đã quote (quotedTable…),
 * hoặc kết quả .join() của các fragment đã dựng sẵn — đều hợp lệ.
 */
const SQL_KEYWORDS =
  /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|VIEW|INDEX|DATABASE|SCHEMA|USER|ROLE)|ALTER\s+(TABLE|VIEW|COLUMN)|DROP\s+(TABLE|VIEW|INDEX|DATABASE|SCHEMA|USER|ROLE)|TRUNCATE|GRANT|REVOKE|FROM|WHERE|VALUES)\b/i

/** Hàm được coi là đã làm an toàn giá trị/identifier. */
const SAFE_CALL = /^(quote|escape)|(quoteIdent|quoteIdentifier|ident|escapeLiteral|quoteLiteral|toSqlLiteral)$/i
/** Tên biến cho thấy nội dung đã được quote từ trước. */
const SAFE_NAME = /^(quoted|escaped|safe|ident)/i
/** Hàm dựng chuỗi từ các fragment đã an toàn. */
const SAFE_METHOD = /^(join|map|filter)$/

function calleeName(node) {
  if (!node) return ''
  if (node.type === 'Identifier') return node.name
  if (node.type === 'MemberExpression') return node.property?.name ?? ''
  return ''
}

function isSafeExpression(expr) {
  if (!expr) return true
  switch (expr.type) {
    case 'Literal':
      return typeof expr.value === 'number' || typeof expr.value === 'boolean'
    case 'CallExpression': {
      const name = calleeName(expr.callee)
      return SAFE_CALL.test(name) || SAFE_METHOD.test(name)
    }
    case 'Identifier':
      return SAFE_NAME.test(expr.name)
    case 'MemberExpression':
      return SAFE_NAME.test(expr.property?.name ?? '')
    case 'TaggedTemplateExpression':
      return calleeName(expr.tag) === 'sql'
    case 'ConditionalExpression':
      return isSafeExpression(expr.consequent) && isSafeExpression(expr.alternate)
    case 'LogicalExpression':
      return isSafeExpression(expr.left) && isSafeExpression(expr.right)
    case 'TemplateLiteral':
      return expr.expressions.every(isSafeExpression)
    default:
      return false
  }
}

/** Ký tự cuối của đoạn text ngay trước `${` — nếu là nháy thì đang nội suy vào literal. */
function endsInsideQuote(raw) {
  const m = /(['"`])[^'"`]*$/.exec(raw)
  return m ? m[1] : null
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow unsafe interpolation when building SQL' },
    schema: [],
    messages: {
      insideQuote:
        'Nội suy vào trong dấu nháy ({{quote}}) là lỗ SQL injection. Bind parameter, hoặc dùng escapeLiteral() nếu buộc phải nhúng.',
      rawIdentifier:
        'Identifier nội suy thô vào SQL. Phải đi qua quoteIdentifier() / ident() (security.md §7).',
    },
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        if (node.parent?.type === 'TaggedTemplateExpression') return // sql`` là cách đúng
        if (node.expressions.length === 0) return

        const fullText = node.quasis.map((q) => q.value.raw).join(' ')
        if (!SQL_KEYWORDS.test(fullText)) return

        node.expressions.forEach((expr, i) => {
          const before = node.quasis[i]?.value.raw ?? ''
          const quote = endsInsideQuote(before)
          if (quote && !isSafeExpression(expr)) {
            context.report({ node: expr, messageId: 'insideQuote', data: { quote } })
            return
          }
          if (!quote && !isSafeExpression(expr)) {
            context.report({ node: expr, messageId: 'rawIdentifier' })
          }
        })
      },
    }
  },
}
