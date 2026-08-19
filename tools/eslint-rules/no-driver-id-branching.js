/**
 * ADR-0003: khác biệt giữa các database engine phải biểu diễn bằng `capabilities`,
 * không bằng nhánh theo `driverId`. Rẽ nhánh theo tên engine tạo nợ kỹ thuật cấp số
 * nhân: thêm engine mới sẽ phải sửa hàng trăm chỗ.
 *
 * Áp dụng cho packages/ui, packages/client, packages/services, packages/engine.
 * KHÔNG áp dụng cho packages/driver-* và driver registry — đó là nơi hợp lệ duy nhất.
 */
const DRIVER_IDS = new Set([
  'postgres', 'postgresql', 'mysql', 'mariadb', 'sqlite',
  'mssql', 'sqlserver', 'oracle', 'mongodb', 'redis', 'snowflake',
])

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow branching on driverId; branch on capabilities instead' },
    schema: [],
    messages: {
      noBranch:
        'Không rẽ nhánh theo driverId ("{{value}}"). Dùng capabilities (ADR-0003), ví dụ: caps.objects.materializedView.',
    },
  },
  create(context) {
    function isDriverIdRef(node) {
      if (!node) return false
      if (node.type === 'Identifier') return /^driver(Id)?$/i.test(node.name)
      if (node.type === 'MemberExpression') {
        return node.property?.type === 'Identifier' && /^driver(Id)?$/i.test(node.property.name)
      }
      return false
    }
    function literalDriverId(node) {
      if (node?.type === 'Literal' && typeof node.value === 'string') {
        return DRIVER_IDS.has(node.value.toLowerCase()) ? node.value : null
      }
      return null
    }
    return {
      BinaryExpression(node) {
        if (!['===', '!==', '==', '!='].includes(node.operator)) return
        const pairs = [
          [node.left, node.right],
          [node.right, node.left],
        ]
        for (const [ref, lit] of pairs) {
          const value = literalDriverId(lit)
          if (isDriverIdRef(ref) && value) {
            context.report({ node, messageId: 'noBranch', data: { value } })
            return
          }
        }
      },
      SwitchStatement(node) {
        if (!isDriverIdRef(node.discriminant)) return
        for (const c of node.cases) {
          const value = literalDriverId(c.test)
          if (value) {
            context.report({ node: c, messageId: 'noBranch', data: { value } })
          }
        }
      },
    }
  },
}
