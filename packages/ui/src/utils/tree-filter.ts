export interface TreeNodeItem {
  id: string
  name: string
  type: 'database' | 'schema' | 'table' | 'view' | 'routine' | 'trigger' | 'group'
  children?: TreeNodeItem[]
}

/**
 * Recursively filters tree nodes matching a search query, keeping matching parents or children
 */
export function filterTreeNodes(nodes: TreeNodeItem[], query: string): TreeNodeItem[] {
  if (!query.trim()) return nodes

  const q = query.toLowerCase()

  function matchNode(node: TreeNodeItem): TreeNodeItem | null {
    const isSelfMatch = node.name.toLowerCase().includes(q)

    let filteredChildren: TreeNodeItem[] = []
    if (node.children) {
      filteredChildren = node.children
        .map((child) => matchNode(child))
        .filter((child): child is TreeNodeItem => child !== null)
    }

    if (isSelfMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      }
    }

    return null
  }

  return nodes.map((node) => matchNode(node)).filter((n): n is TreeNodeItem => n !== null)
}
