export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow node:* and electron imports in UI package',
      category: 'Corvus Architecture',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const value = node.source.value
        if (value.startsWith('node:') || value === 'electron' || value === 'better-sqlite3' || value === 'pg' || value === 'mysql2') {
          context.report({
            node,
            message: `packages/ui cannot import "${value}". Use RPC client instead.`,
          })
        }
      },
    }
  },
}
